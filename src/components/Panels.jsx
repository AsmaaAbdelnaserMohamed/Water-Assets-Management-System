import { useEffect, useRef, useState } from 'react'
import { Eye, Boxes, Waves, Gauge, ShieldAlert, Bell, Play, RotateCcw, X, AlertTriangle, Satellite, Languages, Building2, FileText } from 'lucide-react'
import { assets, zones, items, byId, RENEWED } from '../data/network'
import { statusOf, order, renewed, riskOf, getPlan } from '../hooks/useScenario'
import { useT } from '../i18n'

const RM = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
function useTween(v){
  const [x,setX]=useState(v), r=useRef(v)
  useEffect(()=>{ if(RM){setX(v);r.current=v;return}
    const s=r.current,t0=performance.now();let id
    const f=t=>{const k=Math.min(1,(t-t0)/800);r.current=s+(v-s)*k;setX(r.current);if(k<1)id=requestAnimationFrame(f)}
    id=requestAnimationFrame(f);return()=>cancelAnimationFrame(id)},[v])
  return x
}
const Num=({v,dec=0,suf=''})=>{const x=useTween(v);return <>{x.toLocaleString('en-US',{minimumFractionDigits:dec,maximumFractionDigits:dec})}{suf}</>}
const hot=(p)=>order.indexOf(p)>=3

export function TopBar({phase,setLang,activeView,setActiveView}){
  const {t,lang}=useT(), pi=order.indexOf(phase)
  const st=activeView==='emergency'?['crit','SIMULATED INCIDENT']:pi>=3?['ok','PLAN READY']:pi>=1?['scan','OPTIMIZING PLAN']:['ok','DATA LOADED']
  return <header className="top"><div className="top-main"><div><h1>{t('WATER NETWORK DIGITAL TWIN')}</h1><p>{t(activeView==='emergency'?'Emergency Response & Intelligent Maintenance Planning':'AI-Powered Asset Renewal Planner')}</p></div>
    <nav className="app-nav" aria-label={t('Application options')}>
      <button className={activeView==='renewal'?'active':''} onClick={()=>setActiveView('renewal')}>{t('Asset Renewal Planning')}</button>
      <button className={activeView==='emergency'?'active':''} onClick={()=>setActiveView('emergency')}>{t('Emergency Response')}</button>
    </nav>
  </div>
    <div className="right"><span className={'pill '+st[0]}>{st[0]==='crit'?<AlertTriangle size={14}/>:<i/>}{t(st[1])}</span>
      <button className="langbtn" onClick={()=>setLang(lang==='ar'?'en':'ar')}><Languages size={14}/>{lang==='ar'?'EN':'عربي'}</button>
      <div className="brand"><b>EDGE-PRO</b><span>{t('Cairo Water Week 2026')}</span></div></div></header>
}
const MODES=[['overview','Overview',Eye],['assets','Assets',Boxes],['flow','Flow',Waves],['pressure','Pressure',Gauge],['risk','Risk',ShieldAlert],['alerts','Alerts',Bell]]
export function Toolbar({mode,setMode,sat,setSat,showBuildings,setShowBuildings}){
  const {t}=useT()
  return <nav className="toolbar">{MODES.map(([k,l,Ic])=><button key={k} className={mode===k?'on':''} onClick={()=>setMode(k)}><Ic size={15}/>{t(l)}</button>)}
    <span className="sep"/><button className={sat?'on':''} aria-pressed={sat} onClick={()=>setSat(!sat)}><Satellite size={15}/>{t('Satellite')}</button>
    <button className={showBuildings?'on':''} aria-pressed={showBuildings} aria-label={t(showBuildings?'Hide buildings':'Show buildings')} onClick={()=>setShowBuildings(!showBuildings)}><Building2 size={15}/>{t('Buildings')}</button></nav>
}
export function RiskLegend(){
  const {t,lang}=useT()
  return <aside className="risk-legend" dir={lang==='ar'?'rtl':'ltr'} aria-label={t('Risk level legend')}>
    <h3>{t('Risk level legend')}</h3>
    <div><i className="risk-swatch critical"/><span>{t('Very high risk')} <small>65%+</small></span></div>
    <div><i className="risk-swatch warning"/><span>{t('Moderate risk')} <small>45–64%</small></span></div>
    <div><i className="risk-swatch low"/><span>{t('Low risk')} <small>&lt;45%</small></span></div>
  </aside>
}
export function Controls({phase,run,reset,budget,setBudget}){
  const {t}=useT(), pi=order.indexOf(phase), maxBudget=Math.max(150,Math.ceil(getPlan().fullCoverageBudget/5)*5)
  return <div className="ctl"><label className="bud"><span>{t('Budget')}: <b>{budget} {t('M EGP')}</b></span>
    <input type="range" min="20" max={maxBudget} step="5" value={budget} disabled={pi>0&&pi<4} onChange={e=>setBudget(+e.target.value)}/></label>
    <div className="btns"><button className="run" disabled={pi>0&&pi<4} onClick={run}><Play size={16}/>{t('RUN AI SCENARIO')}</button>
    <button className="rst" disabled={pi===0} onClick={reset}><RotateCcw size={15}/>{t('RESET SCENARIO')}</button></div></div>
}
export function Card({sel,phase,onClose}){
  const {t,lang}=useT()
  if(!sel) return null
  const n=(sel.kind==='zone'?zones:assets).find(x=>x.id===sel.id), s=statusOf(n.id,phase), rn=renewed(n.id,phase), risk=riskOf(n.id,phase)
  const lvl=risk>=65?'High':risk>=45?'Medium':'Low', lab=rn?'Renewed':{ok:'Operational',warning:'Warning',critical:'Critical'}[s]
  return <div className="card" dir={lang==='ar'?'rtl':'ltr'}><button className="x" onClick={onClose} aria-label="Close"><X size={14}/></button>
    <h3>{t(n.name)}</h3><div className={'st '+(rn?'ok':s)}><i/>{t(lab)}</div>
    <dl><dt>{t('Installed')}</dt><dd>{n.year}</dd><dt>{t('Material')}</dt><dd>{t(n.material)}</dd><dt>{t('Previous failures')}</dt><dd>{n.failures}</dd>
      <dt>{t('Est. cost')}</dt><dd>{n.cost} {t('M EGP')}</dd><dt>{t('Risk')}</dt><dd className={'lv '+lvl}>{t(lvl)} · {risk}%</dd></dl></div>
}
export function AIPanel({phase,onReport}){
  const {t,lang}=useT(), pi=order.indexOf(phase), P=getPlan(), top=byId[P.ids[0]]
  const drv=top?[['Asset age',top.drv.age],['Previous failures',top.drv.fail],['Material',top.drv.mat],['Criticality',top.drv.crit]]:[]
  return <aside className="ai" dir={lang==='ar'?'rtl':'ltr'}><div className="aih"><h2>{t('AI INSIGHT')}</h2><em>{t('SAMPLE DATA · DECISION SUPPORT')}</em></div>
    {pi===0&&<><p className="big">{t('Smart Analysis Map for Water Network Assets')}</p><p className="mut">{t('Set a budget, then run the AI planner to rank renewal priorities.')}</p></>}
    {pi===1&&<><p className="big">{t('AI PLANNER RUNNING…')}</p><p className="mut">{t('Scoring by age, material, failures and criticality…')}</p><div className="scanbar"><i/></div></>}
    {pi>=2&&top&&<div className={'alert '+(pi>=3?'ok':'warn')}><div className="tl">{t(pi>=4?'AI ANALYSIS COMPLETE · DECISION RECOMMENDATION':pi>=3?'PLAN READY':'Top priority identified')}</div>
      <p className="big">{t(top.name)}</p><div className="kv"><span>{t('Risk')}</span><b>{top.risk}%</b></div>
      {pi>=3&&<div className="kv"><span>{t('Budget used')}</span><b>{P.spent} {t('M EGP')}</b></div>}</div>}
    {pi>=4&&!top&&<p className="mut">{t('No eligible renewal candidates fit the selected budget. Increase the budget to see the AI-recommended plan.')}</p>}
    {pi>=4&&top&&<div className="ins">
      <h4>{t('Priority list')}</h4>
      <ul>{P.ids.slice(0,5).map((id,i)=><li key={id}><span>{i+1}. {t(byId[id].name)}</span><b dir="ltr">{byId[id].risk}% → {RENEWED}%</b></li>)}</ul>
      <div className="kv"><span>{t('Interventions')}</span><b>{P.ids.length}</b></div>
      <h4>{t('Risk drivers')}</h4>
      {drv.map(([a,v])=><div className="drv" key={a}><span>{t(a)}</span><div><i style={{'--w':Math.round(v*100)+'%'}}/></div><b>{Math.round(v*100)}%</b></div>)}
      <h4>{t('Network risk')}</h4>
      <ul><li><span>{t('Before')}</span><b>{P.avgBefore}%</b></li><li><span>{t('After')}</span><b>{P.avgAfter}%</b></li>
        <li className="good"><span>{t('High-risk assets')}</span><b dir="ltr">{P.highBefore} → {P.highAfter}</b></li></ul>
      <div className="act"><h4>{t('Recommended action')}</h4><p>{t('The AI analyzed the water network and recommends approving this priority-based renewal plan.')}</p>
        <div className="kv"><span>{t('AI budget for all eligible renewal candidates')}</span><b dir="ltr"><Num v={P.fullCoverageBudget} dec={1}/> {t('M EGP')}</b></div>
        <p className="mut">{t('Covers all renewal candidates with a risk score of 40% or higher.')}</p>
        <div className="kv"><span>{t('Priority')}</span><b className="hi">{t('HIGH')}</b></div></div>
      <p className="final">{t('FROM DATA')}<br/>{t('TO INSIGHT')}<br/>{t('TO ACTION')}</p>
      <button className="langbtn report-trigger report-trigger-results" onClick={onReport}><FileText size={14}/>{t('Decision report')}</button>
    </div>}
  </aside>
}
export function Metrics({phase,budget}){
  const {t}=useT(), h=hot(phase), P=getPlan()
  const M=[['Assets in registry',items.length,0,''],['High-risk assets',h?P.highAfter:P.highBefore,0,''],['Avg network risk',h?P.avgAfter:P.avgBefore,0,'%'],
    ['Budget (M EGP)',budget,0,''],['Interventions',h?P.ids.length:0,0,''],['Risk reduction',h?Math.round((P.avgBefore-P.avgAfter)/P.avgBefore*100):0,0,'%']]
  return <footer className="metrics">{M.map(([l,v,d,x])=><div key={l}><span>{t(l)}</span><b>{v.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d})}{x}</b></div>)}</footer>
}
