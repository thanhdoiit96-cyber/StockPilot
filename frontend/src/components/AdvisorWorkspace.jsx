import { useEffect, useMemo, useState } from 'react'
import { buildAdvisorEvidence } from '../services/advisorEvidence.mjs'
import { requestJson } from '../services/api.mjs'

const CONTEXTS = {
  symbol: { label: 'Mã đang chọn', prompts: ['Phân tích xu hướng ngắn hạn', 'Mức stop loss và chốt lời', 'Yếu tố bên ngoài tác động thế nào?'] },
  portfolio: { label: 'Danh mục', prompts: ['Tóm tắt trạng thái danh mục', 'Rủi ro tập trung hiện tại'] },
  market: { label: 'Thị trường', prompts: ['Tóm tắt độ phủ dữ liệu', 'Dữ liệu hiện tại có đủ mới không?'] }
}
const GREETING = { role: 'ai', text: 'AI Advisor đang sử dụng phân tích rule-based có nguồn và quality gate.', citations: [] }

export default function AdvisorWorkspace(props) {
  const [context, setContext] = useState('symbol')
  const [messages, setMessages] = useState([GREETING])
  const [conversations, setConversations] = useState([])
  const [conversationId, setConversationId] = useState('')
  const [persistenceError, setPersistenceError] = useState('')
  const [saving, setSaving] = useState(false)
  const [input, setInput] = useState('')
  const evidence = useMemo(() => buildAdvisorEvidence({ ...props, context }), [props.selectedStock, props.analysis, props.positions, props.marketStocks, props.quotes, props.providerLicenseUrl, context])
  useEffect(() => {
    if (!props.token) return
    const controller = new AbortController()
    requestJson('/api/advisor/conversations', { token: props.token, signal: controller.signal }).then(response => {
      const rows = Array.isArray(response.data) ? response.data : []
      setConversations(rows)
      if (rows[0]) { setConversationId(rows[0].id); setContext(rows[0].context); setMessages(rows[0].messages) }
    }).catch(error => { if (!controller.signal.aborted) setPersistenceError(error.message) })
    return () => controller.abort()
  }, [props.token])
  const persist = async (nextMessages, question) => {
    if (!props.token) return
    const payload = { title: String(question || conversations.find(item => item.id === conversationId)?.title || 'Hội thoại Advisor').slice(0, 120), context, messages: nextMessages.slice(-100) }
    try {
      setSaving(true)
      const response = await requestJson(conversationId ? `/api/advisor/conversations/${conversationId}` : '/api/advisor/conversations', { method: conversationId ? 'PUT' : 'POST', body: payload, token: props.token })
      const saved = response.data
      setConversationId(saved.id)
      setConversations(current => [saved, ...current.filter(item => item.id !== saved.id)].slice(0, 20))
      setPersistenceError('')
    } catch (error) { setPersistenceError(error.message) } finally { setSaving(false) }
  }
  const send = async value => {
    const question = String(value || '').trim()
    if (!question || saving) return
    const next = [...messages, { role: 'user', text: question, citations: [] }, { role: 'ai', text: evidence.answer, citations: evidence.citations, context: CONTEXTS[context].label }]
    setMessages(next)
    await persist(next, conversationId ? null : question)
    setInput('')
  }
  const selectConversation = id => {
    const selected = conversations.find(item => item.id === id)
    if (!selected) return
    setConversationId(selected.id); setContext(selected.context); setMessages(selected.messages); setPersistenceError('')
  }
  const newConversation = () => { setConversationId(''); setMessages([GREETING]); setPersistenceError('') }
  const deleteConversation = async () => {
    if (!conversationId || !props.token) return
    try {
      await requestJson(`/api/advisor/conversations/${conversationId}`, { method: 'DELETE', token: props.token })
      const remaining = conversations.filter(item => item.id !== conversationId)
      setConversations(remaining)
      if (remaining[0]) selectConversation(remaining[0].id); else newConversation()
    } catch (error) { setPersistenceError(error.message) }
  }
  return <section className="advisor-page panel">
    <div className="panel-header"><div><h3>AI Advisor</h3><p className="muted-text">Câu trả lời rule-based nêu rõ phạm vi và nguồn dữ liệu đã dùng.</p></div><span className={`chip ${props.aiEnabled ? 'success' : 'neutral'}`}>{props.aiEnabled ? 'Generative AI đã mở' : 'Generative AI đang khóa'}</span></div>
    <div className="advisor-conversation-toolbar"><label htmlFor="advisor-conversation-select">Hội thoại</label><select id="advisor-conversation-select" className="app-select" value={conversationId} onChange={event => selectConversation(event.target.value)}><option value="">Hội thoại mới</option>{conversations.map(item => <option value={item.id} key={item.id}>{item.title}</option>)}</select><button type="button" className="ghost-btn small-btn" onClick={newConversation}>＋ Mới</button><button type="button" className="ghost-btn small-btn danger-btn" disabled={!conversationId} onClick={deleteConversation}>Xóa</button><small>Tối đa 20 hội thoại, 100 tin nhắn mỗi hội thoại.</small></div>
    {persistenceError && <p className="error-text" role="alert">Không thể đồng bộ hội thoại: {persistenceError}</p>}
    <div className="advisor-context"><label htmlFor="advisor-context-select">Ngữ cảnh trả lời</label><select id="advisor-context-select" className="app-select" value={context} onChange={event => setContext(event.target.value)}>{Object.entries(CONTEXTS).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select><small>Mỗi câu trả lời ghi lại ngữ cảnh tại thời điểm gửi.</small></div>
    <div className="prompt-grid">{CONTEXTS[context].prompts.map(prompt => <button className="prompt-chip" type="button" disabled={saving} onClick={() => send(prompt)} key={prompt}>{prompt}</button>)}</div>
    <div className="chat-shell" role="log" aria-live="polite" aria-relevant="additions text" aria-label="Lịch sử trao đổi với AI Advisor">{messages.map((message, index) => <div className={`message-row ${message.role}`} key={`${message.role}-${index}`}><div className="message-bubble"><p>{message.text}</p>{message.role === 'ai' && message.context ? <small className="advisor-message-context">Ngữ cảnh: {message.context}</small> : null}{message.citations?.length ? <ul className="advisor-citations" aria-label="Nguồn tham chiếu">{message.citations.map((citation, citationIndex) => <li key={`${citation.label}-${citationIndex}`}>{citation.url ? <a href={citation.url} target="_blank" rel="noopener noreferrer">{citation.label}</a> : <span>{citation.label}</span>}</li>)}</ul> : null}</div></div>)}</div>
    <div className="input-row"><input value={input} disabled={saving} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') send(input) }} placeholder="Nhập câu hỏi cho AI Advisor..." aria-label="Câu hỏi cho AI Advisor"/><button className="primary-btn" type="button" disabled={!input.trim() || saving} title={!input.trim() ? 'Nhập câu hỏi trước khi gửi' : 'Gửi câu hỏi'} onClick={() => send(input)}>{saving ? 'Đang lưu…' : 'Gửi'}</button></div>
  </section>
}
