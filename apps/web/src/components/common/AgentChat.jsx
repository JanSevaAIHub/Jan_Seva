import { useEffect, useRef } from 'react'
import { Send, Sparkles } from 'lucide-react'
import { useApp } from '../../context/AppContext'

export function AgentChat({ compact = false }) {
  const { citizenMessages: agentMessages, citizenDraft: agentDraft, setCitizenDraft: setAgentDraft, citizenError: agentError, citizenTyping: agentTyping, sendCitizenMessage: sendAgentMessage } = useApp()
  const bottom = useRef(null)
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'nearest' }) }, [agentMessages, agentTyping])
  const submit = event => { event.preventDefault(); sendAgentMessage() }
  return <section aria-label="Citizen AI Assistant" className="bg-white/95 rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3 min-w-0">
    <h2 className="flex gap-2 items-center text-sm font-bold text-[#6552CE]"><Sparkles size={16} />Citizen AI Assistant</h2>
    <p className="text-xs text-slate-500">Ask about reviewed schemes or draft a civic complaint. Review suggestions before submitting anything.</p>
    <div role="log" aria-live="polite" aria-label="Assistant conversation" className={`${compact ? 'max-h-56' : 'max-h-80'} overflow-y-auto space-y-3 text-xs`}>
      {agentMessages.map(message => <div key={message.id} className={`p-3 rounded-xl whitespace-pre-wrap break-words ${message.sender === 'user' ? 'bg-violet-50 text-violet-950' : 'bg-slate-50 text-slate-800'}`}>
        <strong>{message.sender === 'user' ? 'You' : 'Assistant'}</strong>
        <p className="mt-1">{message.text}</p>
        {message.citations?.map((source, i) => <a key={i} href={source.url} target="_blank" rel="noreferrer" className="block text-violet-700 underline mt-2">{source.title}</a>)}
      </div>)}
      {agentTyping && <p role="status">Thinking…</p>}
      <div ref={bottom} />
    </div>
    {agentError && <div role="alert" className="text-xs text-rose-700">{agentError} Your message is kept. <button type="button" className="underline" disabled={agentTyping} onClick={sendAgentMessage}>Retry message</button></div>}
    <div className="flex flex-wrap gap-2">{['PM Kisan eligibility', 'Raise road repair complaint', 'Scholarship for students'].map(text => <button type="button" key={text} onClick={() => setAgentDraft(text)} className="text-[11px] px-2 py-1 bg-violet-50 text-violet-800 rounded-full">{text}</button>)}</div>
    <form onSubmit={submit} className="flex gap-2 items-end">
      <textarea aria-label="Message the citizen assistant" placeholder="Ask about a scheme or civic issue…" rows={2} maxLength={1000} value={agentDraft} onChange={e => setAgentDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); if (agentDraft.trim().length >= 3 && !agentTyping) sendAgentMessage() } }}
        className="min-w-0 flex-1 border border-slate-200 rounded-xl p-3 text-xs focus:outline-violet-500" />
      <button aria-label="Send assistant message" type="submit" disabled={agentTyping || agentDraft.trim().length < 3} className="p-3 rounded-xl bg-[#6552CE] text-white disabled:opacity-50"><Send size={16} /></button>
    </form>
    <p className="text-[10px] text-slate-500">Enter to send · Shift+Enter for a new line. Avoid sharing personal identifiers.</p>
  </section>
}
