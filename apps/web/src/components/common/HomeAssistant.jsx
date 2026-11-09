import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, ExternalLink, Mic, Sparkles } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { eligibilityLabels } from '../../lib/schemes'

const PROMPTS = ['PM Kisan eligibility', 'Help prepare a road repair complaint', 'Scholarship for students', 'Show my complaints']

export function HomeAssistant() {
  const { agentMessages, agentError, agentTyping, sendAgentMessage, session,
    setSchemeSearchQuery, setSelectedState, setAgentComplaintDraft, setActiveCitation } = useApp()
  const [message, setMessage] = useState('')
  const inputRef = useRef(null)
  useEffect(() => { setMessage('') }, [session?.user.id])
  const submit = async event => {
    event.preventDefault()
    const question = message
    if (await sendAgentMessage(question)) setMessage(current => current === question ? '' : current)
  }
  const navigate = useNavigate()
  const act = action => {
    if (action.path === '/schemes') { setSchemeSearchQuery(''); setSelectedState('All') }
    if (action.path === '/complaints/new') setAgentComplaintDraft(action.draft)
    navigate(action.path)
  }
  return <section aria-label="Ask JanSeva AI" className="bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-xl border border-white/80 space-y-3 max-w-xl min-w-0">
    <h2 className="flex items-center gap-1.5 text-xs font-bold text-[#4338ca]"><Sparkles size={15} className="text-[#6552ce]" />Ask JanSeva AI</h2>
    <p className="text-[11px] text-slate-500">Ask about schemes or civic complaints. Suggestions need review; this assistant cannot file or update tickets. Voice input is not available.</p>
    {agentMessages.length > 0 && <div role="log" aria-label="Assistant conversation" className="max-h-80 overflow-y-auto space-y-3 text-xs break-words">
      {agentMessages.map(msg => <article key={msg.id} className={`p-3 rounded-xl ${msg.sender === 'user' ? 'bg-violet-50' : 'bg-slate-50 border border-slate-200'}`}>
        <p className="text-[10px] font-bold text-slate-500 mb-1">{msg.sender === 'user' ? 'You' : 'JanSeva AI'}</p>
        <p className="whitespace-pre-line">{msg.text}</p>
        {msg.status === 'partial' && <p className="text-orange-900 text-[11px] mt-2">Some capabilities are unavailable; see the response above.</p>}
        {msg.eligibility?.map(e => <p key={e.scheme_id} className="mt-2 font-semibold">{e.citations?.[0]?.title}: {eligibilityLabels[e.status]}</p>)}
        {msg.citations?.map((c, index) => <div key={index} className="mt-2 flex flex-wrap gap-2 text-violet-700">
          <a href={c.url} target="_blank" rel="noreferrer" className="inline-flex gap-1 underline">{c.title}<ExternalLink size={12} /></a>
          <button onClick={() => setActiveCitation(c)} className="underline">View source evidence</button>
        </div>)}
        {msg.actions?.map((a, index) => <div key={index} className="mt-3 space-y-2">
          {a.draft && <div className="rounded-lg border border-orange-200 p-2"><b>Your draft text (not submitted)</b><p className="whitespace-pre-line">{a.draft.description}</p></div>}
          <button onClick={() => act(a)} className="px-3 py-2 rounded-xl bg-[#6552CE] text-white font-semibold">{a.label}</button>
          {a.requires_confirmation && <p className="text-[11px] text-slate-600">Review and complete the form. Sign-in and a separate confirmation are required to save a ticket.</p>}
        </div>)}
      </article>)}
    </div>}
    {agentTyping && <p role="status" className="text-xs text-violet-700">JanSeva AI is checking the available tools…</p>}
    {agentError && <p role="alert" className="text-xs text-rose-700">{agentError} Your message is kept; you can retry.</p>}
    <form onSubmit={submit} className="flex items-end gap-2 bg-white border border-slate-200 rounded-xl p-2 focus-within:ring-2 focus-within:ring-violet-100">
      <textarea ref={inputRef} aria-label="Message JanSeva AI" placeholder="Ask about schemes or civic complaints..." rows={2}
        minLength={3} maxLength={1000} value={message} onChange={e => setMessage(e.target.value)} enterKeyHint="send"
        onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form.requestSubmit() } }}
        className="min-w-0 flex-1 w-full resize-none bg-transparent text-xs p-1 focus:outline-none" />
      <button type="button" disabled title="Voice input is not available" className="p-1.5 text-slate-400"><Mic size={17} /></button>
      <button type="submit" aria-label="Send message" disabled={message.trim().length < 3 || agentTyping}
        className="shrink-0 p-2 rounded-full bg-[#6552CE] text-white disabled:opacity-50"><ArrowRight size={16} /></button>
    </form>
    <div className="flex flex-wrap gap-2">
      {PROMPTS.map(prompt => <button key={prompt} type="button" onClick={() => { setMessage(prompt); inputRef.current?.focus() }}
        className="px-3 py-1 rounded-full text-[11px] bg-white/90 hover:bg-violet-50 text-slate-600 border border-slate-200">{prompt}</button>)}
    </div>
  </section>
}
