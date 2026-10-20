import { memo, useMemo, useRef, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'
import { assets, zones, pipes, sensors, nodeById, posOf } from '../data/network'
import { statusOf, order, renewed, riskOf, getPlan } from '../hooks/useScenario'
import { tr } from '../i18n'
import { OVERVIEW } from './sceneCamera'
const SAT='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=31.2007,30.0144,31.2707,30.0744&bboxSR=4326&imageSR=4326&size=1024,1024&format=jpg&f=image'
function useSat(on){const [tex,setTex]=useState(null)
  useEffect(()=>{ if(!on||tex) return; new THREE.TextureLoader().setCrossOrigin('anonymous').load(SAT,t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;setTex(t)},undefined,()=>{}) },[on])
  return on?tex:null}

const RM = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
const COL = { ok:'#34d399', warning:'#fbbf24', critical:'#f87171' }
const riskStatus = risk => risk>=65?'critical':risk>=45?'warning':'ok'
// raw asset risk score (0-100) from the data itself — no renewal plan / budget involved
export const riskClass = riskStatus
export const assetRisk = o => o.risk ?? riskOf(o.id,'idle',getPlan())
function tone(mode,phase,id,risk,pressure,base,plan){
  const s=statusOf(id,phase,plan), reportReady=phase==='insight', hot=reportReady&&s!=='ok'
  if(mode==='risk'&&reportReady) return COL[riskStatus(risk)]
  if(reportReady&&renewed(id,phase,plan)) return '#22d3ee'
  if(mode==='risk'&&!reportReady) return base
  if(mode==='alerts') return hot?COL[s]:'#16283c'
  if(hot) return COL[s]
  if(mode==='pressure') return new THREE.Color().setHSL(.55,.85,.15+pressure/220)
  return base
}
const curves=(()=>{const m={};pipes.forEach(p=>{const a=nodeById[p.a],b=nodeById[p.b]
  m[p.id]=new THREE.CatmullRomCurve3([new THREE.Vector3(a.x,.1,a.z),new THREE.Vector3((a.x+b.x)/2,.1,(a.z+b.z)/2),new THREE.Vector3(b.x,.1,b.z)])});return m})()
const ZE=new THREE.EdgesGeometry(new THREE.BoxGeometry(4.4,.001,3.6))
  function Rig({focus,ctl}){
  const end=useRef(0), c=useRef(new THREE.Vector3()), t=useRef(new THREE.Vector3())
  useEffect(()=>{end.current=performance.now()+2200},[focus])
  useFrame(({camera},dt)=>{ if(performance.now()>end.current||!ctl.current) return
    const k=RM?1:1-Math.exp(-3.5*dt); camera.position.lerp(c.current.set(...focus.cam),k)
    ctl.current.target.lerp(t.current.set(...focus.t),k); ctl.current.update() })
  return null
}
function Terrain({sat}){
  const tex=useSat(sat)
  const g=useMemo(()=>{const g=new THREE.PlaneGeometry(64,64,64,64);g.rotateX(-Math.PI/2);const p=g.attributes.position
    for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,-.3+Math.sin(x*.25)*.12+Math.cos(z*.3+x*.1)*.1)}
    g.computeVertexNormals();return g},[])
  return <><mesh geometry={g}><meshStandardMaterial key={tex?'s':'n'} color={tex?'#9fb3c8':'#0a1422'} map={tex||null} roughness={1}/></mesh>
    {!tex&&<gridHelper args={[64,64,'#0f2a3f','#0c2033']} position={[0,-.12,0]}/>}
    {[[0,-6.5,64,.5],[0,-1.5,64,.5],[0,4,64,.5],[9.5,0,.6,40]].map(([x,z,w,d],i)=>
      <mesh key={i} position={[x,-.08,z]}><boxGeometry args={[w,.03,d]}/><meshBasicMaterial color="#132a40"/></mesh>)}</>
}
function City(){
  const body=useRef(),roof=useRef(),base=useRef(),top=useRef(),windows=useRef()
  const buildings=useMemo(()=>{const a=[];let seed=7;const rand=()=>(seed=(seed*16807)%2147483647)/2147483647
    for(let row=0;row<14;row++)for(let col=0;col<16;col++){
      const x=-25+col*3.25+(row%2)*.8+(rand()-.5)*.45,z=-22+row*3.35+(rand()-.5)*.4
      if(Math.abs(x)>26||Math.abs(z)>23||[-6.5,-1.5,4].some(v=>Math.abs(z-v)<.85)||Math.abs(x-9.5)<.85)continue
      if([...assets,...zones].some(n=>Math.abs(n.x-x)<2.1&&Math.abs(n.z-z)<2.1))continue
      const w=.95+rand()*.55,d=.9+rand()*.55,h=1.1+rand()*2.3
      a.push({x,z,w,d,h})
    }return a},[])
  useEffect(()=>{const apply=(ref,list)=>{const o=new THREE.Object3D()
    list.forEach(([x,y,z,w,h,d],i)=>{o.position.set(x,y,z);o.scale.set(w,h,d);o.updateMatrix();ref.current.setMatrixAt(i,o.matrix)})
    ref.current.instanceMatrix.needsUpdate=true}
    const bodies=[],roofs=[],bases=[],tops=[],glazing=[]
    buildings.forEach(({x,z,w,d,h})=>{
      const ground=-.3+Math.sin(x*.25)*.12+Math.cos(z*.3+x*.1)*.1
      bodies.push([x,ground+h/2,z,w,h,d])
      bases.push([x,ground+.06,z,w+.12,.12,d+.12])
      roofs.push([x,ground+h+.04,z,w+.08,.1,d+.08])
      tops.push([x,ground+h+.19,z,w*.34,.3,d*.34])
      const floors=Math.max(1,Math.floor(h/.48))
      for(let floor=0;floor<floors;floor++){
        const wy=ground+.3+floor*.46
        for(const side of [-1,1]){
          for(const offset of [-.24,.24]){
            glazing.push([x+offset,wy,z+side*(d/2+.012),.13,.2,.035])
          }
        }
      }
    })
    apply(body,bodies);apply(roof,roofs);apply(base,bases);apply(top,tops);apply(windows,glazing)
  },[buildings])
  return <group>
    <instancedMesh ref={base} args={[null,null,buildings.length]}><boxGeometry/><meshStandardMaterial color="#8293a1" roughness={.85}/></instancedMesh>
    <instancedMesh ref={body} args={[null,null,buildings.length]}><boxGeometry/><meshStandardMaterial color="#526a7d" roughness={.88}/></instancedMesh>
    <instancedMesh ref={roof} args={[null,null,buildings.length]}><boxGeometry/><meshStandardMaterial color="#9aa8b2" roughness={.82}/></instancedMesh>
    <instancedMesh ref={top} args={[null,null,buildings.length]}><boxGeometry/><meshStandardMaterial color="#60788b" roughness={.9}/></instancedMesh>
    <instancedMesh ref={windows} args={[null,null,buildings.reduce((count,{h})=>count+Math.max(1,Math.floor(h/.48))*8,0)]}><boxGeometry/><meshStandardMaterial color="#91d8f2" emissive="#28617c" emissiveIntensity={.35} roughness={.35}/></instancedMesh>
  </group>
}
const Zone=memo(function Zone({z,mode,phase,sel,onSel,sat,lang,plan,emergency,riskView}){
  const affected=emergency?.affectedIds.includes(z.id), rv=!!riskView, rk=rv?assetRisk(z):0, rc=rv?COL[riskStatus(rk)]:null
  const c=rv?rc:emergency?(affected?'#fbbf24':'#163247'):tone(mode,phase,z.id,riskOf(z.id,phase,plan),z.pressure,'#0f3b52',plan), hot=phase==='insight'&&statusOf(z.id,phase,plan)!=='ok', m=useRef()
  useFrame(({clock})=>{ if(hot&&m.current&&!RM) m.current.material.emissiveIntensity=.45+.3*Math.sin(clock.elapsedTime*4) })
  return <group position={[z.x,0,z.z]}>
    <mesh ref={m} position={[0,.08,0]} onClick={e=>{e.stopPropagation();emergency?emergency.onSelect(z.id):onSel('zone',z.id)}}>
      <boxGeometry args={[4.4,.16,3.6]}/><meshStandardMaterial color={c} emissive={c} emissiveIntensity={.35} transparent opacity={mode==='assets'?.3:sat?.5:.85}/></mesh>
    <lineSegments geometry={ZE} position={[0,.17,0]}><lineBasicMaterial color={sel?'#fff':'#38bdf8'} transparent opacity={sel?1:.35}/></lineSegments>
    <Html position={[0,.5,-1.5]} center distanceFactor={24} style={{pointerEvents:'none'}}><span className={'zl'+(hot||(rv&&riskStatus(rk)==='critical')?' hot':'')}>{tr(lang,z.name)}{rv&&' · '+Math.round(rk)+'%'}</span></Html>
  </group>
})
const Asset=memo(function Asset({a,mode,phase,sel,onSel,plan,emergency,riskView}){
  const s=statusOf(a.id,phase,plan), affected=emergency?.affectedIds.includes(a.id), rv=!!riskView, rk=rv?assetRisk(a):0, rs=riskStatus(rk), c=rv?COL[rs]:emergency?(affected?'#fbbf24':'#71849a'):tone(mode,phase,a.id,riskOf(a.id,phase,plan),a.pressure,'#9fb3c8',plan), [h,setH]=useState(false), hot=phase==='insight'&&s!=='ok'
  const M=<meshStandardMaterial color={c} metalness={.4} roughness={.4} emissive={c} emissiveIntensity={.18} transparent opacity={mode==='alerts'&&phase!=='idle'&&s==='ok'?.35:1}/>
  const R={plant:2.3,reservoir:1.8,pump:1.1,tower:1.3}[a.type]
  return <group position={[a.x,0,a.z]} onClick={e=>{e.stopPropagation();emergency?emergency.onSelect(a.id):onSel('asset',a.id)}} onPointerOver={e=>{e.stopPropagation();setH(true);document.body.style.cursor='pointer'}} onPointerOut={()=>{setH(false);document.body.style.cursor=''}}>
    {a.type==='plant'&&<><mesh position={[0,.6,0]}><boxGeometry args={[3,1.2,2]}/>{M}</mesh><mesh position={[-.8,1.6,0]}><cylinderGeometry args={[.35,.35,1.2,16]}/>{M}</mesh><mesh position={[.8,1.4,0]}><boxGeometry args={[1,.8,1.2]}/>{M}</mesh></>}
    {a.type==='reservoir'&&<><mesh position={[0,.4,0]}><cylinderGeometry args={[1.3,1.3,.8,32]}/>{M}</mesh><mesh position={[0,.82,0]}><cylinderGeometry args={[1.15,1.15,.05,32]}/><meshBasicMaterial color="#22d3ee"/></mesh></>}
    {a.type==='tower'&&<><mesh position={[0,1.4,0]}><cylinderGeometry args={[.12,.35,2.8,8]}/>{M}</mesh><mesh position={[0,3.1,0]}><cylinderGeometry args={[.9,.9,.9,24]}/>{M}</mesh><mesh position={[0,3.7,0]}><coneGeometry args={[.95,.5,24]}/>{M}</mesh></>}
    {a.type==='pump'&&<><mesh position={[0,.35,0]}><boxGeometry args={[.9,.7,.9]}/>{M}</mesh><mesh position={[.6,.3,0]} rotation-z={Math.PI/2}><cylinderGeometry args={[.22,.22,.5,16]}/>{M}</mesh></>}
    {(sel||h||hot||(rv&&rs!=='ok'))&&<mesh rotation-x={-Math.PI/2} position-y={.03}><ringGeometry args={[R,R+.12,48]}/><meshBasicMaterial color={sel?'#fff':rv?COL[rs]:hot?COL[s]:'#38bdf8'}/></mesh>}
    <Html position={[0,a.type==='plant'?2.5:a.type==='tower'?4.5:1.6,0]} center distanceFactor={24} style={{pointerEvents:'none'}}><span className={'zl'+(hot||(rv&&rs==='critical')?' hot':'')}>{a.id}{rv&&' · '+Math.round(rk)+'%'}</span></Html>
  </group>
})
function Flow({curve,color,speed,n,visible,reverse=false}){
  const ref=useRef(), o=useMemo(()=>new THREE.Object3D(),[])
  useFrame(({clock})=>{ if(!visible||!ref.current)return; const t=clock.elapsedTime*speed; for(let i=0;i<n;i++){const u=(t+i/n)%1;o.position.copy(curve.getPoint(reverse?1-u:u));o.updateMatrix();ref.current.setMatrixAt(i,o.matrix)} ref.current.instanceMatrix.needsUpdate=true })
  return <instancedMesh ref={ref} args={[null,null,n]} frustumCulled={false} visible={visible}><sphereGeometry args={[.13,8,8]}/><meshBasicMaterial color={color}/></instancedMesh>
}
const Pipe=memo(function Pipe({p,mode,phase,plan,emergency,riskView}){
  const curve=curves[p.id], s=statusOf(p.id,phase,plan), hot=phase==='insight'&&s!=='ok'
  const damaged=emergency?.damagedId===p.id, rv=!!riskView, rs=rv?riskStatus(assetRisk(p)):null
  const alternative=!!emergency&&!rv&&emergency.preview&&emergency.alternativeIds.includes(p.id)
  const downstream=!!emergency&&!rv&&emergency.preview&&emergency.downstreamIds.includes(p.id)
  const picked=emergency?.selectedId===p.id, emph=damaged||alternative
  const c=rv?COL[rs]:emergency?(damaged?'#f87171':alternative?'#22c55e':downstream?'#fbbf24':'#26384d'):tone(mode,phase,p.id,riskOf(p.id,phase,plan),60,'#38bdf8',plan)
  const r=rv?({ok:.07,warning:.1,critical:.14}[rs]+(picked?.03:0)):emergency&&emph?(picked?.17:.12):mode==='flow'?.07+p.flow/90000:.07
  const g=useMemo(()=>new THREE.TubeGeometry(curve,24,r,6),[curve,r]), mat=useRef()
  const hit=useMemo(()=>emergency&&(emph||downstream||rv)?new THREE.TubeGeometry(curve,12,.35,6):null,[curve,!!emergency,emph,downstream,rv])
  const dim=rv?false:emergency?!(emph||downstream):mode==='assets'||(mode==='alerts'&&!hot)
  const select=e=>{e.stopPropagation();emergency.onSelect(p.id)}
  useFrame(({clock})=>{if(damaged&&mat.current)mat.current.emissiveIntensity=.45+.65*(.5+.5*Math.sin(clock.elapsedTime*5))})
  return <group>
    <mesh geometry={g} onClick={e=>{if(emergency)select(e)}}>
      <meshStandardMaterial ref={mat} color={c} emissive={c} emissiveIntensity={damaged?.8:picked?1.1:alternative?.7:mode==='flow'?.6:.3} transparent opacity={dim?.14:.95}/>
    </mesh>
    {hit&&<mesh geometry={hit} onClick={select}><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>}
    {(emergency?alternative||downstream:!dim)&&<Flow curve={curve} color={alternative?'#86efac':downstream?'#fde68a':hot?COL[s]:'#bae6fd'} n={alternative?16:hot||downstream?14:8} speed={RM?0:alternative?.3:downstream?.2:hot?.34:.05+p.flow/60000} reverse={!!emergency&&emergency.reversedIds.includes(p.id)} visible={!dim}/>}
  </group>
})

function IncidentMarker({id}){
  const ref=useRef(), point=curves[id].getPoint(.5)
  useFrame(({clock})=>{const pulse=.82+.24*(.5+.5*Math.sin(clock.elapsedTime*5.5));ref.current.scale.setScalar(pulse);ref.current.material.opacity=.55+.4*(.5+.5*Math.sin(clock.elapsedTime*5.5))})
  return <group position={[point.x,.35,point.z]}>
    <mesh ref={ref} rotation-x={-Math.PI/2}><ringGeometry args={[.55,.68,48]}/><meshBasicMaterial color="#f87171" transparent/></mesh>
    <mesh position-y={.1}><sphereGeometry args={[.18,16,16]}/><meshBasicMaterial color="#ef4444"/></mesh>
    <Html position={[0,.7,0]} center distanceFactor={22} style={{pointerEvents:'none'}}><span className="emergency-map-marker">INCIDENT · P-104</span></Html>
  </group>
}
function Sensor({s,phase,plan}){
  const pos=useMemo(()=>curves[s.pipe].getPoint(s.u),[s]), st=statusOf(s.id,phase,plan)
  return <group position={[pos.x,pos.y,pos.z]}><mesh position-y={.25}><cylinderGeometry args={[.02,.02,.5]}/><meshBasicMaterial color="#475569"/></mesh>
    <mesh position-y={.55}><sphereGeometry args={[.16,12,12]}/><meshBasicMaterial color={phase==='insight'?COL[st]:'#38bdf8'}/></mesh></group>
}
function Pulse({x,z,color}){
  const r=useRef(); useFrame(({clock})=>{ const t=RM?.3:(clock.elapsedTime*.95)%1; r.current.scale.setScalar(1+t*2.2); r.current.material.opacity=(1-t)*.7 })
  return <mesh ref={r} position={[x,.25,z]} rotation-x={-Math.PI/2}><ringGeometry args={[1.6,1.75,64]}/><meshBasicMaterial color={color} transparent/></mesh>
}
export const ScanView = function Scan(){
  const r=useRef(), t0=useRef(null)
  useFrame(({clock})=>{ if(t0.current===null) t0.current=clock.elapsedTime; r.current.position.x=-22+(((clock.elapsedTime-t0.current)*9)%44) })
  return <mesh ref={r} position={[0,.6,0]}><boxGeometry args={[.25,1.2,44]}/><meshBasicMaterial color="#22d3ee" transparent opacity={.4}/></mesh>
}
const RISK_COLORS={critical:'#f87171',warning:'#fbbf24',ok:'#34d399'}
const RISK_LEVELS=[['critical','مخاطر عالية','High risk','≥ 65%'],['warning','مخاطر متوسطة','Medium risk','45–64%'],['ok','مخاطر منخفضة','Low risk','< 45%']]
const RISK_CSS=`
.rk-wrap{position:absolute;right:14px;bottom:14px;z-index:6;display:flex;flex-direction:column;align-items:flex-end;gap:10px}
.rk-btn{display:flex;align-items:center;gap:8px;padding:11px 18px;border:1px solid rgba(251,191,36,.6);border-radius:999px;background:rgba(10,30,50,.92);color:#fde68a;font-weight:600;font-size:14px;line-height:1;font-family:inherit;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.35)}
.rk-btn:hover{filter:brightness(1.15)}
.rk-btn.on{background:linear-gradient(135deg,#b45309,#f59e0b);color:#fff;border-color:#fbbf24}
.rk-panel{position:relative;width:min(320px,calc(100vw - 28px));padding:12px 14px;border-radius:10px;border:1px solid rgba(56,189,248,.3);background:rgba(8,16,28,.9);backdrop-filter:blur(6px);color:#dbeafe;box-shadow:0 8px 24px rgba(0,0,0,.4)}
.rk-title{margin:0 0 8px;padding-inline-end:22px;font-size:13px;font-weight:700;letter-spacing:.03em;color:#e6f4ff}
.rk-title small{display:block;margin-top:2px;font-size:11px;font-weight:500;opacity:.65;letter-spacing:0}
.rk-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:6px 0;border-top:1px solid rgba(255,255,255,.1);font-size:12.5px}
.rk-row span{display:flex;align-items:center;gap:8px;opacity:.85}.rk-row b{text-align:end}
.rk-dot{width:10px;height:10px;border-radius:50%;flex:none}
.rk-list{margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.1);display:grid;gap:2px}
.rk-list h5{margin:0 0 4px;font-size:11.5px;opacity:.7;font-weight:600}
.rk-item{display:flex;justify-content:space-between;gap:10px;width:100%;padding:5px 6px;border:0;border-radius:6px;background:transparent;color:inherit;font:inherit;font-size:12.5px;text-align:start;cursor:pointer}
.rk-item:hover{background:rgba(255,255,255,.08)}
.rk-note{margin:8px 0 0;font-size:11px;opacity:.6}
.rk-close{position:absolute;top:8px;inset-inline-end:8px;background:none;border:0;color:#cfe8ff;cursor:pointer;padding:4px;font-size:16px;line-height:1}
`
function RiskControl({lang,on,setOn,stats,onSel}){
  const ar=lang==='ar', fmt=n=>n.toLocaleString(ar?'ar-EG':'en-US')
  return <div className="rk-wrap">
    <style>{RISK_CSS}</style>
    {on&&<div className="rk-panel" dir={ar?'rtl':'ltr'}>
      <button className="rk-close" onClick={()=>setOn(false)} aria-label="close">×</button>
      <h4 className="rk-title">Asset Risk Classification
        <small>{ar?'من بيانات الأصول مباشرة · بدون ميزانية تجديد':'From asset data · no renewal budget applied'}</small></h4>
      {RISK_LEVELS.map(([k,arL,enL,range])=><div className="rk-row" key={k}>
        <span><i className="rk-dot" style={{background:RISK_COLORS[k]}}/>{ar?arL:enL} ({range})</span>
        <b>{fmt(stats.assets[k])} {ar?'أصل':'assets'} · {fmt(stats.pipes[k])} {ar?'خط':'pipes'}</b></div>)}
      <div className="rk-list"><h5>{ar?'الأعلى خطورة':'Highest risk assets'}</h5>
        {stats.top.map(i=><button key={i.id} className="rk-item" onClick={()=>onSel('asset',i.id)}>
          <span>{i.id} · {tr(lang,i.name)}</span><b style={{color:RISK_COLORS[riskStatus(i.risk)]}}>{Math.round(i.risk)}%</b></button>)}</div>
      <p className="rk-note">{ar?'درجات استرشادية من بيانات تجريبية — تتطلب مراجعة هندسية.':'Indicative scores from sample data — engineering review required.'}</p>
    </div>}
    <button className={'rk-btn'+(on?' on':'')} onClick={()=>setOn(!on)}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 4 5v6c0 5 3.4 9.3 8 11 4.6-1.7 8-6 8-11V5l-8-3z"/><path d="M12 8v4M12 16h.01"/></svg>
      {on?(ar?'إخفاء المخاطر':'Hide risks'):(ar?'عرض مخاطر الأصول':'Show asset risks')}
    </button>
  </div>
}
export default function Scene({mode,phase,sel,onSel,focus,sat,lang,showBuildings,plan=getPlan(),emergency=null}){
  const [riskView,setRiskView]=useState(false)
  const riskStats=useMemo(()=>{const cnt=l=>l.reduce((m,o)=>{m[riskStatus(assetRisk(o))]++;return m},{critical:0,warning:0,ok:0})
    return {assets:cnt(assets),pipes:cnt(pipes),top:[...assets].map(a=>({id:a.id,name:a.name,risk:assetRisk(a)})).sort((x,y)=>y.risk-x.risk).slice(0,5)}},[])
  const ctl=useRef(), pi=order.indexOf(phase), topId=plan.ids[0], tp=topId&&posOf(topId)
  const pulseColor=topId&&phase==='insight'?COL[riskStatus(riskOf(topId,phase,plan))]:COL[statusOf(topId,phase,plan)]
  return <div style={{position:'relative',width:'100%',height:'100%',overflow:'hidden'}}>
  <Canvas camera={{position:OVERVIEW.cam,fov:45}} dpr={[1,1.25]} gl={{antialias:false}} onPointerMissed={()=>{onSel(null);emergency?.onSelect(null)}}>
    <color attach="background" args={['#060b14']}/><fog attach="fog" args={['#060b14',48,95]}/>
    <ambientLight intensity={.7}/><directionalLight position={[10,20,8]} intensity={1.1}/>
    <Terrain sat={sat}/>{showBuildings&&<City/>}
    {zones.map(z=><Zone key={z.id} z={z} mode={mode} phase={phase} sel={sel?.id===z.id||emergency?.selectedId===z.id} onSel={onSel} sat={sat} lang={lang} plan={plan} emergency={emergency} riskView={riskView}/>)}
    {pipes.map(p=><Pipe key={p.id} p={p} mode={mode} phase={phase} plan={plan} emergency={emergency} riskView={riskView}/>)}
    {assets.map(a=><Asset key={a.id} a={a} mode={mode} phase={phase} sel={sel?.id===a.id||emergency?.selectedId===a.id} onSel={onSel} plan={plan} emergency={emergency} riskView={riskView}/>)}
    {sensors.map(s=><Sensor key={s.id} s={s} phase={phase} plan={plan}/>)}
    {emergency&&<IncidentMarker id={emergency.damagedId}/>}
    {(pi===1||emergency?.scanning)&&<ScanView/>}
    {pi>=2&&tp&&<Pulse x={tp.x} z={tp.z} color={pulseColor}/>}
    <OrbitControls ref={ctl} makeDefault enableDamping maxPolarAngle={1.3} minDistance={5} maxDistance={55}/>
    <Rig focus={focus} ctl={ctl}/>
  </Canvas>
  {!emergency&&<RiskControl lang={lang} on={riskView} setOn={setRiskView} stats={riskStats} onSel={onSel}/>}
  </div>
}