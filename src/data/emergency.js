import { byId, nodeById, pipes } from './network'

export const emergencyIncident = {
  id: 'INC-2026-041',
  type: 'Reported pipeline burst',
  damagedAssetId: 'P-104',
  reportedAt: '15 Oct 2026 · 09:42 EET',
  location: 'Zone 07 supply corridor',
  status: 'Reported',
  severity: 'High · preliminary simulation',
  potentiallyAffectedAreas: ['Z07', 'Z08'],
}

const damagedPipe = byId[emergencyIncident.damagedAssetId]
const targetId = damagedPipe.b
const SOURCE_TYPES = new Set(['plant', 'reservoir'])

// Shortest route over EXISTING pipes from a plant/reservoir to targetId, skipping blocked pipes.
export function findAlternativeRoute(target, blockedIds = []) {
  const adj = {}
  pipes.forEach((p) => {
    if (blockedIds.includes(p.id)) return
    ;(adj[p.b] ||= []).push({ pipe: p, to: p.a, forward: true })   // supply flows a -> b
    ;(adj[p.a] ||= []).push({ pipe: p, to: p.b, forward: false })  // supply flows b -> a
  })
  const prev = { [target]: null }, queue = [target]
  while (queue.length) {
    const id = queue.shift()
    if (id !== target && SOURCE_TYPES.has(nodeById[id]?.type)) {
      const steps = []
      for (let cur = id; prev[cur]; cur = prev[cur].from) {
        const { pipe, forward } = prev[cur]
        steps.push({ pipeId: pipe.id, forward, from: forward ? pipe.a : pipe.b, to: forward ? pipe.b : pipe.a })
      }
      return steps // ordered source -> target
    }
    for (const n of adj[id] || []) {
      if (n.to in prev) continue
      prev[n.to] = { from: id, pipe: n.pipe, forward: n.forward }
      queue.push(n.to)
    }
  }
  return null
}

const steps = findAlternativeRoute(targetId, [damagedPipe.id]) ?? []
const routePipes = steps.map((s) => byId[s.pipeId])
const bottleneck = routePipes.length ? routePipes.reduce((m, p) => (p.flow < m.flow ? p : m)) : null
const affected = emergencyIncident.potentiallyAffectedAreas
const downstreamIds = pipes
  .filter((p) => p.id !== damagedPipe.id && affected.includes(p.a) && affected.includes(p.b))
  .map((p) => p.id)

export const emergencyRoute = {
  found: steps.length > 0,
  id: 'Existing alternative route',
  targetId,
  steps,
  pipeIds: steps.map((s) => s.pipeId),
  reversedIds: steps.filter((s) => !s.forward).map((s) => s.pipeId),
  downstreamIds,
  path: steps.length ? [steps[0].from, ...steps.flatMap((s) => [s.pipeId, s.to])] : [],
  requiredFlow: damagedPipe.flow,
  bottleneckId: bottleneck?.id ?? null,
  bottleneckFlow: bottleneck?.flow ?? null,
  coverage: bottleneck ? Math.round((100 * bottleneck.flow) / damagedPipe.flow) : null,
  reason: 'Supply is redirected through existing network pipelines only, bypassing the damaged pipeline. No new connection is assumed.',
  limitation: 'Route connectivity comes from the sample topology. Diameter, rated capacity, valve status, and hydraulic data are not available, so the route cannot be confirmed as suitable. Verify network data and line capacity, and obtain authorized approval before any operation.',
  suitability: 'Existing route · capacity verification required',
}

export const affectedZoneSupply = affected.map((id) => {
  if (id === targetId) return { id, via: emergencyRoute.pipeIds.at(-1), mode: 'direct' }
  const dp = pipes.find((p) => downstreamIds.includes(p.id) && (p.a === id || p.b === id))
  return { id, via: dp?.id ?? null, mode: dp ? 'downstream' : 'none' }
})

export const emergencyAssets = {
  damaged: byId[emergencyIncident.damagedAssetId],
  alternative: byId[emergencyRoute.pipeIds[0]],
}

export const emergencyImpact = {
  affectedAreas: emergencyIncident.potentiallyAffectedAreas,
  customers: 'About 1,250 connections · illustrative estimate',
  interruption: 'Approximately 2–4 hours · illustrative estimate',
  pressureChange: 'Pressure: −20% to −30%; flow: about −25% · illustrative estimate',
  restorationTime: 'Approximately 6–10 hours after dispatch · illustrative estimate',
}