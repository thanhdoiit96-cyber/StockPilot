import { useMemo, useState } from 'react'
import { buildAdvisorEvidence } from '../services/advisorEvidence.mjs'

const CONTEXTS = {
  symbol: { label: 'Mã đang chọn', prompts: ['Phân tích xu hướng ngắn hạn', 'Mức stop loss và chốt lời', 'Yếu tố bên ngoài tác động thế nào?'] },
  portfolio: { label: 'Danh mục', prompts: ['Tóm tắt trạng thái danh mục', 'Rủi ro tập trung hiện tại'] },
  market: { label: 'Thị trường', prompts: ['Tóm tắt độ phủ dữ liệu', 'Dữ liệu hiện tại có đủ mới không?'] }
}

export default function AdvisorWorkspace(props) {
  const [context, setContext] = useState('symbol')
  const [messages, setMessages] = useState([{ role: 'ai', text: 'AI Advisor đang sử dụng phân tích rule-based có nguồn và quality gate.', citations: [] }])
  const [input, setInput] = useState('')
  const evidence = useMemo(() => buildAdvisorEvidence({ ...props, context }), [props.selectedStock, props.analysis, props.positions, props.marketStocks, props.quotes, props.providerLicenseUrl, context])
  const send = value => {
    const question = String(value || '').trim()
    if (!question) return
    setMessages(current => [...current, { role: 'user', text: question, citations: [] }, { role: 'ai', text: evidence.answer, citations: evidence.citations, context: CONTEXTS[context].label }])
    setInput('')
  }
  return <section className="advisor-page panel">
    <div className="panel-header"><div><h3>AI Advisor</h3><p className="muted-text">Câu trả lời rule-based nêu rõ phạm vi và nguồn dữ liệu đã dùng.</p></div><span className={`chip ${props.aiEnabled ? 'success' : 'neutral'}`}>{props.aiEnabled ? 'Generative AI đã mở' : 'Generative AI đang khóa'}</span></div>
    <div className="advisor-context"><label htmlFor="advisor-context-select">Ngữ cảnh trả lời</label><select id="advisor-context-select" className="app-select" value={context} onChange={event => setContext(event.target.value)}>{Object.entries(CONTEXTS).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select><small>Mỗi câu trả lời ghi lại ngữ cảnh tại thời điểm gửi.</small></div>
    <div className="prompt-grid">{CONTEXTS[context].prompts.map(prompt => <button className="prompt-chip" type="button" onClick={() => send(prompt)} key={prompt}>{prompt}</button>)}</div>
    <div className="chat-shell" role="log" aria-live="polite" aria-relevant="additions text" aria-label="Lịch sử trao đổi với AI Advisor">{messages.map((message, index) => <div className={`message-row ${message.role}`} key={`${message.role}-${index}`}><div className="message-bubble"><p>{message.text}</p>{message.role === 'ai' && message.context ? <small className="advisor-message-context">Ngữ cảnh: {message.context}</small> : null}{message.citations?.length ? <ul className="advisor-citations" aria-label="Nguồn tham chiếu">{message.citations.map((citation, citationIndex) => <li key={`${citation.label}-${citationIndex}`}>{citation.url ? <a href={citation.url} target="_blank" rel="noopener noreferrer">{citation.label}</a> : <span>{citation.label}</span>}</li>)}</ul> : null}</div></div>)}</div>
    <div className="input-row"><input value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') send(input) }} placeholder="Nhập câu hỏi cho AI Advisor..." aria-label="Câu hỏi cho AI Advisor"/><button className="primary-btn" type="button" disabled={!input.trim()} title={!input.trim() ? 'Nhập câu hỏi trước khi gửi' : 'Gửi câu hỏi'} onClick={() => send(input)}>Gửi</button></div>
  </section>
}
