"""Evidence-only answers: the LLM selects paragraphs; it cannot write unchecked facts."""

import re

from app.ai.corpus import official_url
from app.ai.provider import ProviderError, select_evidence
from app.ai.retrieval import retrieve
from app.ai.scheme_schemas import Citation, SchemeAnswer, SchemeAsk, ToolTrace
from app.config import ConfigurationError


# Conservative quarantine for common source-injection markers. This complements
# data-only prompts and exact excerpt validation; it is not a complete detector.
INSTRUCTION_MARKERS = re.compile(
    r"ignore\b.{0,60}\binstructions\b|<\|(?:im_start|system|assistant)\|>|"
    r"(?:^|\n)\s*(?:system|developer|assistant)\s*:|\[/?INST\]|"
    r"reveal\b.{0,50}\b(?:api[ -]?key|secret|system prompt)\b", re.IGNORECASE)


def citation(passage, excerpt):
    return Citation(scheme_id=passage.scheme_id, chunk_id=passage.chunk_id, title=passage.title,
        url=passage.source_url, excerpt=excerpt, reviewed_at=passage.reviewed_at)


def insufficient(trace):
    return SchemeAnswer(answer="The stored evidence is insufficient to answer that question. No eligibility, benefit, deadline or application availability can be confirmed. Check the relevant official source or ask about a scheme in the curated collection.",
        citations=[], tool_trace=trace, mode="insufficient_evidence")


def answer_question(db, request: SchemeAsk) -> SchemeAnswer:
    state = request.state or (request.profile.state if request.profile else None)
    passages = retrieve(db, request.message, state, request.category, limit=5)
    method = getattr(passages, "method", "pgvector_cosine_retrieval")
    trace = [ToolTrace(tool=method, status="ok", detail=f"Retrieved {len(passages)} source-linked passages after filtering." +
        (" Embedding provider unavailable; deterministic lexical ranking of stored evidence was used, not vector similarity." if method == "lexical_fallback" else " Vector model/dimension/score filtering applied."))]
    rejected_sources = sum(not official_url(p.source_url) or bool(INSTRUCTION_MARKERS.search(p.text)) for p in passages)
    passages = [p for p in passages if official_url(p.source_url) and not INSTRUCTION_MARKERS.search(p.text)]
    if rejected_sources:
        trace.append(ToolTrace(tool="source_safety", status="skipped", detail=f"Quarantined {rejected_sources} unsafe source passages; excluded from generation and extractive fallback."))
    if not passages:
        trace.append(ToolTrace(tool="grounded_generation", status="skipped", detail="No qualifying evidence; no model generation or factual answer attempted."))
        return insufficient(trace)
    try:
        selected = select_evidence(request.message, [p.model_dump(mode="json") for p in passages],
            request.profile.model_dump() if request.profile else None)
    except (ConfigurationError, ProviderError):
        trace.append(ToolTrace(tool="grounded_generation", status="error", detail="LLM unavailable; returning explicitly labelled, unmodified related extracts."))
        related = passages[:3]
        citations = [citation(p, p.text) for p in related]
        answer = "Extractive fallback — the LLM is unavailable. These related stored evidence summaries may not answer your question; they do not establish your eligibility or current application availability.\n\n"
        if method == "lexical_fallback":
            answer = "Lexical retrieval fallback — embedding service unavailable; matches use stored text terms.\n\n" + answer
        answer += "\n\n".join(f"[{i + 1}] {p.title}\n{p.text}" for i, p in enumerate(related))
        return SchemeAnswer(answer=answer, citations=citations, tool_trace=trace, mode="extractive_fallback")
    known = {str(p.chunk_id): p for p in passages}
    citations, used = [], set()
    selections = selected.get("selections")
    if selected.get("sufficient") is not True or not isinstance(selections, list):
        trace.append(ToolTrace(tool="grounded_generation", status="ok", detail="Model reported insufficient evidence; no unsupported factual answer returned."))
        return insufficient(trace)
    trace.append(ToolTrace(tool="grounded_generation", status="ok", detail="LLM evidence selections require local paragraph and URL validation before display."))
    rejected = 0
    for selection in selections[:4]:
        if not isinstance(selection, dict):
            rejected += 1
            continue
        chunk_id = selection.get("chunk_id")
        passage = known.get(chunk_id) if isinstance(chunk_id, str) else None
        quote = selection.get("quote")
        # Require a complete stored paragraph, not a cherry-picked substring
        # that could drop a negation, qualification, exclusion or condition.
        if (not passage or not isinstance(quote, str) or len(quote) < 30 or
            quote not in [p.strip() for p in passage.text.split("\n\n")] or
            selection.get("url") != passage.source_url or not official_url(passage.source_url)):
            rejected += 1
            continue
        identity = (str(passage.chunk_id), quote)
        if identity not in used:
            used.add(identity)
            citations.append(citation(passage, quote))
    trace.append(ToolTrace(tool="citation_validation", status="ok", detail=f"Accepted {len(citations)} stored paragraphs; removed {rejected} unsupported citations/selections."))
    if not citations:
        return insufficient(trace)
    answer = "Relevant passages from reviewed official-source summaries follow. These are not an eligibility decision; omitted conditions and current availability must be checked with the administering authority.\n\n"
    if method == "lexical_fallback":
        answer = "Lexical retrieval fallback — embedding service unavailable; matches use stored text terms.\n\n" + answer
    answer += "\n\n".join(f"[{i + 1}] {c.title}\n{c.excerpt}" for i, c in enumerate(citations))
    return SchemeAnswer(answer=answer, citations=citations, tool_trace=trace, mode="grounded_extracts")
