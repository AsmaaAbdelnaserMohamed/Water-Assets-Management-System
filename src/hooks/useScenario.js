import { useRef, useState, useCallback } from 'react'
import { computePlan, byId, RENEWED } from '../data/network'
export const order=['idle','analyzing','locating','detected','insight']
let PLAN=computePlan(0)
export const getPlan=()=>PLAN
export const renewed=(id,phase,plan=PLAN)=>order.indexOf(phase)>=3&&plan.set.has(id)
export const riskOf=(id,phase,plan=PLAN)=>renewed(id,phase,plan)?RENEWED:byId[id]?.risk??0
export const statusOf=(id,phase,plan=PLAN)=>{ if(order.indexOf(phase)===2&&plan.set.has(id)) return 'warning'
  const r=riskOf(id,phase,plan); return r>=65?'critical':r>=45?'warning':'ok' }
export function useScenario(){
  const [phase,setPhase]=useState('idle'); const t=useRef([])
  const clear=()=>{t.current.forEach(clearTimeout);t.current=[]}
  const reset=useCallback(()=>{clear();PLAN=computePlan(0);setPhase('idle')},[])
  const run=useCallback((budget)=>{clear();PLAN=computePlan(budget);setPhase('analyzing')
    t.current=[setTimeout(()=>setPhase('locating'),3000),setTimeout(()=>setPhase('detected'),5200),setTimeout(()=>setPhase('insight'),7000)]},[])
  const updateBudget=useCallback((budget)=>{PLAN=computePlan(budget)},[])
  return {phase,run,reset,updateBudget}
}
