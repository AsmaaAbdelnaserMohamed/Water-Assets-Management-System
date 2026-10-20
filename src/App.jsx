import { lazy, Suspense, useState, useEffect } from 'react'
import { useScenario, getPlan } from './hooks/useScenario'
import { nodeById, posOf } from './data/network'
import { LangCtx } from './i18n'
import { OVERVIEW, focusAt } from './components/sceneCamera'
import { TopBar, Toolbar, Card, Controls, AIPanel, Metrics, RiskLegend } from './components/Panels'
const Scene = lazy(() => import('./components/DigitalTwinScene'))
const ReportModal = lazy(() => import('./components/ReportModal'))
const EmergencyResponse = lazy(() => import('./components/EmergencyResponse'))
function SceneLoading() {
  return <div className="scene-loading" role="status">Loading interactive network…</div>
}
export default function App(){
  const {phase,run,reset,updateBudget}=useScenario()
  const [activeView,setActiveView]=useState('renewal')
  const [mode,setMode]=useState('overview'), [sel,setSel]=useState(null), [focus,setFocus]=useState(OVERVIEW)
  const [showBuildings,setShowBuildings]=useState(true)
  const [budget,setBudget]=useState(60), [sat,setSat]=useState(false), [lang,setLang]=useState('en')
  const [reportOpen,setReportOpen]=useState(false)
  useEffect(()=>{ if(phase==='idle'){setFocus(OVERVIEW);setSel(null);setMode('overview')} else if(phase==='locating'){const t=getPlan().ids[0];if(t){const q=posOf(t);setFocus(focusAt(q.x,q.z,15))};setSel(null)} else if(phase==='insight'){setMode('risk')} },[phase])
  const onSel=(kind,id)=>{ if(!kind){setSel(null);return}; setSel({kind,id}); const n=nodeById[id]; setFocus(focusAt(n.x,n.z,12)) }
  return (<LangCtx.Provider value={lang}><div className="app" lang={lang}><TopBar phase={phase} setLang={setLang} activeView={activeView} setActiveView={setActiveView}/>
    {activeView==='emergency'
      ? <Suspense fallback={<main className="emergency-main"><section className="stage"><SceneLoading/></section><aside className="ai"/></main>}>
          <EmergencyResponse lang={lang} sat={sat} showBuildings={showBuildings} onToggleBuildings={()=>setShowBuildings(value=>!value)} onToggleSatellite={()=>setSat(value=>!value)}/>
        </Suspense>
      : <>
    <main><section className="stage">
      <Suspense fallback={<SceneLoading/>}>
        <Scene mode={mode} phase={phase} sel={sel} onSel={onSel} focus={focus} sat={sat} lang={lang} showBuildings={showBuildings} plan={getPlan()}/>
      </Suspense>
      <div className="tag">{lang==='ar'?'نموذج رقمي محاكى':'SIMULATED DIGITAL TWIN'}</div>
      <Toolbar mode={mode} setMode={setMode} sat={sat} setSat={setSat} showBuildings={showBuildings} setShowBuildings={setShowBuildings}/>
      {phase==='insight'&&mode==='risk'&&<RiskLegend/>}
      <Card sel={sel} phase={phase} onClose={()=>setSel(null)}/>
      <Controls phase={phase} budget={budget} setBudget={value=>{setBudget(value);if(phase==='insight')updateBudget(value)}} run={()=>{setMode('overview');run(budget)}} reset={reset}/>
    </section><AIPanel phase={phase} onReport={()=>setReportOpen(true)}/></main><Metrics phase={phase} budget={budget}/>
    </>}
    {reportOpen&&<Suspense fallback={null}><ReportModal budget={budget} lang={lang} onClose={()=>setReportOpen(false)}/></Suspense>}
  </div></LangCtx.Provider>)
}
