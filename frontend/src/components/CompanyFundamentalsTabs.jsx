import { useEffect, useRef, useState } from 'react'
import CompanyProfilePanel from './CompanyProfilePanel.jsx'
import CompanyPeoplePanel from './CompanyPeoplePanel.jsx'
import CompanyCapitalPanel from './CompanyCapitalPanel.jsx'
import CompanyFinancialPanel from './CompanyFinancialPanel.jsx'
import CompanyNewsPanel from './CompanyNewsPanel.jsx'

const IDS=['profile','people','capital','financials','news']
const readTab=()=>{ try { const value=new URL(window.location.href).searchParams.get('companyTab'); return IDS.includes(value)?value:'profile' } catch { return 'profile' } }

export default function CompanyFundamentalsTabs(props) {
  const [active,setActive]=useState(readTab); const refs=useRef([])
  useEffect(()=>{ const sync=()=>setActive(readTab()); addEventListener('popstate',sync); return()=>removeEventListener('popstate',sync) },[])
  const change=tab=>{ setActive(tab); const url=new URL(window.location.href); if(tab==='profile')url.searchParams.delete('companyTab'); else url.searchParams.set('companyTab',tab); history.replaceState(history.state,'',url) }
  const tabs=[['profile',props.translate('Hồ sơ')],['people',props.translate('Cổ đông & lãnh đạo')],['capital',props.translate('Vốn & cổ tức')],['financials',props.translate('Tài chính')],['news',props.translate('Tin tức')]]
  return <section id="detail-company" className="panel company-fundamentals" tabIndex="-1" aria-label={props.translate('Thông tin doanh nghiệp')}>
    <div className="company-tabs" role="tablist" aria-label={props.translate('Nhóm thông tin doanh nghiệp')}>{tabs.map(([id,label],index)=><button key={id} ref={node=>{refs.current[index]=node}} type="button" role="tab" aria-selected={active===id} aria-controls={`company-panel-${id}`} tabIndex={active===id?0:-1} className={active===id?'active':''} onClick={()=>change(id)} onKeyDown={event=>{let next=index;if(event.key==='ArrowRight')next=(index+1)%tabs.length;else if(event.key==='ArrowLeft')next=(index-1+tabs.length)%tabs.length;else return;event.preventDefault();change(tabs[next][0]);refs.current[next]?.focus()}}>{label}</button>)}</div>
    <div id={`company-panel-${active}`} role="tabpanel">{active==='profile'?<CompanyProfilePanel {...props} embedded/>:active==='people'?<CompanyPeoplePanel {...props} embedded/>:active==='capital'?<CompanyCapitalPanel {...props} embedded/>:active==='financials'?<CompanyFinancialPanel {...props}/>:<CompanyNewsPanel {...props}/>}</div>
  </section>
}
