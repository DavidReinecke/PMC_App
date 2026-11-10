// Demo data for showing the app to a colleague. Everything it creates has an ID that starts with DEMO-
// so it can be found and removed again. It never changes your real positions.
import type { DataProvider } from './provider'
import type { HiringAction, IncumbentUpdate, Position, PositionRequest, Priority, SelectionStep, Unit } from './types'
import { finalApprover, need } from './services'

export const DEMO = 'DEMO-'
const day = (offset: number) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10)

export async function removeDemoData(p: DataProvider, areaId: string): Promise<number> {
  const [steps, has, reqs, ups, pos] = await Promise.all([p.listSteps(areaId), p.listHiringActions(areaId), p.listRequests(areaId), p.listIncumbentUpdates(areaId), p.listPositions(areaId)])
  const demoPos = pos.filter((x) => x.positionId.startsWith(DEMO))
  const demoIds = new Set(demoPos.map((x) => x.id))
  const demoHA = has.filter((h) => h.actionId.startsWith(DEMO) || demoIds.has(h.positionId))
  const demoHAIds = new Set(demoHA.map((h) => h.id))
  const dSteps = steps.filter((s) => demoHAIds.has(s.actionId)).map((s) => s.id)
  const dReqs = reqs.filter((r) => r.requestId.startsWith(DEMO) || (r.positionId && demoIds.has(r.positionId))).map((r) => r.id)
  const dUps = ups.filter((u) => u.updateId.startsWith(DEMO) || demoIds.has(u.positionId)).map((u) => u.id)
  // dependents first
  await p.deleteRows('step', dSteps)
  await p.deleteRows('hiringAction', [...demoHAIds])
  await p.deleteRows('request', dReqs)
  await p.deleteRows('incumbentUpdate', dUps)
  await p.deleteRows('position', [...demoIds])
  return dSteps.length + demoHAIds.size + dReqs.length + dUps.length + demoIds.size
}

export async function loadDemoData(p: DataProvider, areaId: string, units: Unit[], positions: Position[], me: { name: string; email: string }): Promise<string> {
  need(units.length > 0, 'Add at least one unit to this area first.')
  await removeDemoData(p, areaId)                      // loading twice never doubles the data
  const real = positions.filter((x) => !x.positionId.startsWith(DEMO))
  const unitAt = (i: number) => units[i % units.length]
  const boss = (u: Unit) => real.find((x) => x.unitId === u.id && x.status === 'Filled')?.id ?? real.find((x) => x.unitId === u.id)?.id ?? real.find((x) => x.status === 'Filled')?.id ?? null

  type Spec = { key: string; title: string; plan: Position['payPlan']; grade: number; emp?: Position['employmentType']; vacant: boolean; since?: number; inc?: [string, string] }
  const specs: Spec[] = [
    { key: 'V01', title: 'Fire Prevention Technician', plan: 'GS', grade: 7, vacant: true, since: -12 },
    { key: 'V02', title: 'Engine Captain', plan: 'GS', grade: 8, vacant: true, since: -30 },
    { key: 'V03', title: 'Hotshot Superintendent', plan: 'GS', grade: 11, vacant: true, since: -45 },
    { key: 'V04', title: 'Dispatcher', plan: 'GS', grade: 6, vacant: true, since: -20 },
    { key: 'V05', title: 'Wildland Firefighter', plan: 'GS', grade: 5, emp: 'Seasonal', vacant: true, since: -60 },
    { key: 'V06', title: 'Fuels Specialist', plan: 'GS', grade: 9, vacant: true, since: -75 },
    { key: 'V07', title: 'Helitack Crew Lead', plan: 'GS', grade: 9, vacant: true, since: -90 },
    { key: 'V08', title: 'Assistant Fire Management Officer', plan: 'GS', grade: 12, vacant: true, since: -120 },
    { key: 'V09', title: 'Fire Operations Specialist', plan: 'GS', grade: 11, vacant: true, since: -100 },
    { key: 'V10', title: 'Engine Operator', plan: 'GW', grade: 6, vacant: true, since: -140 },
    { key: 'F01', title: 'Engine Captain', plan: 'GS', grade: 8, vacant: false, inc: ['Casey Morgan', 'casey.morgan@example.gov'] },
    { key: 'F02', title: 'Fuels Technician', plan: 'GS', grade: 7, vacant: false, inc: ['Riley Park', 'riley.park@example.gov'] },
    { key: 'F03', title: 'Hotshot Squad Boss', plan: 'GS', grade: 9, vacant: false, inc: ['Sam Delgado', 'sam.delgado@example.gov'] },
  ]
  const pos: Record<string, Position> = {}
  for (const [i, s] of specs.entries()) {
    const u = unitAt(i)
    pos[s.key] = await p.createPosition({
      positionId: `${DEMO}${s.key}`, title: s.title, areaId, unitId: u.id, unitName: u.name, payPlan: s.plan, grade: s.grade, series: '',
      employmentType: s.emp ?? 'Full time', status: s.vacant ? 'Vacant' : 'Filled', incumbent: s.inc?.[0] ?? '', incumbentEmail: s.inc?.[1] ?? '',
      previousIncumbent: '', supervisorId: boss(u), fundingStatus: 'Approved', vacantSince: s.vacant ? day(s.since ?? -10) : null,
    })
  }

  // ---- PMC requests
  const req = (n: number, d: Partial<PositionRequest> & Pick<PositionRequest, 'type' | 'status' | 'priority' | 'payPlan' | 'grade' | 'justification' | 'fundingSource' | 'requestedBy' | 'requestedByEmail' | 'requestDate'>) =>
    p.createRequest({ requestId: `${DEMO}REQ-${String(n).padStart(2, '0')}`, positionId: null, unitId: null, areaId, proposedTitle: '', employmentType: 'Full time', decidedBy: '', decidedOn: null, pmcComment: '', ...d })
  await req(1, { type: 'Advertise vacancy', positionId: pos.V01.id, status: 'Submitted', priority: 'Critical', payPlan: 'GS', grade: 7, justification: 'Prevention season starts in March and the unit has no technician to staff the public contact program.', fundingSource: 'Preparedness', requestedBy: me.name, requestedByEmail: me.email, requestDate: day(-3) })
  await req(2, { type: 'Advertise vacancy', positionId: pos.V02.id, status: 'Submitted', priority: 'High', payPlan: 'GS', grade: 8, justification: 'Engine 3 is running without a captain. Crew carries a qualified acting but it is not sustainable.', fundingSource: 'Preparedness', requestedBy: 'Jordan Ellis', requestedByEmail: 'jordan.ellis@example.gov', requestDate: day(-5) })
  await req(3, { type: 'Add position', unitId: unitAt(1).id, proposedTitle: 'GIS and Fire Planning Specialist', status: 'Submitted', priority: 'Medium', payPlan: 'GS', grade: 11, justification: 'Fire planning workload has doubled and the unit has no GIS capacity.', fundingSource: 'Fuels', requestedBy: 'Dana Whitfield', requestedByEmail: 'dana.whitfield@example.gov', requestDate: day(-2) })
  await req(4, { type: 'Advertise vacancy', positionId: pos.V03.id, status: 'Returned', priority: 'High', payPlan: 'GS', grade: 11, justification: 'Replace the retiring superintendent.', fundingSource: 'Preparedness', requestedBy: 'Marcus Hale', requestedByEmail: 'marcus.hale@example.gov', requestDate: day(-14), decidedBy: 'Riley Quinn', decidedOn: day(-10), pmcComment: 'Please add the funding source detail and confirm the grade with HR before resubmitting.' })
  await req(5, { type: 'Advertise vacancy', positionId: pos.V04.id, status: 'Cleared', priority: 'Medium', payPlan: 'GS', grade: 6, justification: 'Dispatch center coverage drops below standard on weekends.', fundingSource: 'Preparedness', requestedBy: 'Priya Nandakumar', requestedByEmail: 'priya.nandakumar@example.gov', requestDate: day(-21), decidedBy: 'Riley Quinn', decidedOn: day(-18), pmcComment: 'Cleared. Raised to High because of weekend coverage.' })
  await req(6, { type: 'Advertise vacancy', positionId: pos.V05.id, status: 'Withdrawn', priority: 'Low', payPlan: 'GS', grade: 5, employmentType: 'Seasonal', justification: 'Seasonal firefighter for the summer crew.', fundingSource: 'Preparedness', requestedBy: 'Taylor Brooks', requestedByEmail: 'taylor.brooks@example.gov', requestDate: day(-25) })

  // ---- hiring actions
  const ha = (n: number, v: Position, d: Partial<HiringAction> & Pick<HiringAction, 'stage' | 'requestedPriority' | 'approvedPriority'>) =>
    p.createHiringAction({ actionId: `${DEMO}HA-${String(n).padStart(2, '0')}`, positionId: v.id, areaId, candidate: '', proposedGrade: '', entryOnDuty: null, priorityBy: 'Riley Quinn', ...d })
  const pr = (a: Priority) => a
  const h4 = await ha(1, pos.V04, { stage: 'Cleared to advertise', requestedPriority: pr('Medium'), approvedPriority: pr('High') })
  const h6 = await ha(2, pos.V06, { stage: 'Announced', requestedPriority: pr('Medium'), approvedPriority: pr('Medium') })
  const h7 = await ha(3, pos.V07, { stage: 'Interviews', requestedPriority: pr('High'), approvedPriority: pr('High') })
  const h8 = await ha(4, pos.V08, { stage: 'Selection approval', candidate: 'Jordan Ellis', proposedGrade: 'GS-12 Step 4', requestedPriority: pr('Critical'), approvedPriority: pr('Critical') })
  const h9 = await ha(5, pos.V09, { stage: 'Selection approval', candidate: 'Morgan Reyes', proposedGrade: 'GS-11 Step 2', requestedPriority: pr('High'), approvedPriority: null, priorityBy: me.name })
  const h10 = await ha(6, pos.V10, { stage: 'Selection approved', candidate: 'Avery Stone', proposedGrade: 'GW-6 Step 3', requestedPriority: pr('Medium'), approvedPriority: pr('High') })
  void h4; void h6; void h7

  // ---- selection approval steps
  const steps = (h: HiringAction, v: Position, spec: [SelectionStep['decision'], string, string?][]) => {
    const groups = ['Supervisor', 'Budget', finalApprover(v.payPlan, v.grade)] as const
    return p.createSteps(spec.map(([decision, by, comment], i) => ({
      name: `${h.actionId} · Step ${i + 1}`, actionId: h.id, areaId, sequence: (i + 1) as 1 | 2 | 3, group: groups[i], decision,
      decidedBy: decision === 'Approved' || decision === 'Returned' ? by : '', decidedOn: decision === 'Approved' || decision === 'Returned' ? day(-2 - (2 - i)) : null,
      comment: comment ?? '', round: 1, supervisorEmail: me.email, positionText: `${v.positionId} ${v.title}`,
    })))
  }
  await steps(h8, pos.V08, [['Approved', 'Marcus Hale', 'Strong operations background. Support.'], ['Pending', ''], ['Waiting', '']])
  await steps(h9, pos.V09, [['Pending', ''], ['Waiting', ''], ['Waiting', '']])
  await steps(h10, pos.V10, [['Approved', 'Marcus Hale'], ['Approved', 'Pat Lindqvist', 'Funding confirmed.'], ['Approved', 'Priya Nandakumar', 'Approved.']])

  // ---- incumbent updates
  const up = (n: number, v: Position, d: Partial<IncumbentUpdate> & Pick<IncumbentUpdate, 'type' | 'status' | 'reason'>) =>
    p.createIncumbentUpdate({ updateId: `${DEMO}INC-${String(n).padStart(2, '0')}`, positionId: v.id, areaId, newIncumbent: '', newIncumbentEmail: '', effectiveDate: null, requestedBy: me.name, requestedByEmail: me.email, createdOn: day(-1), decidedBy: '', decidedOn: null, comment: '', ...d })
  await up(1, pos.V05, { type: 'Fill', status: 'Pending', newIncumbent: 'Alex Rivera', newIncumbentEmail: 'alex.rivera@example.gov', effectiveDate: day(14), reason: 'New hire reported to the unit.' })
  await up(2, pos.F01, { type: 'Change incumbent', status: 'Pending', newIncumbent: 'Taylor Quinn', newIncumbentEmail: 'taylor.quinn@example.gov', effectiveDate: day(7), reason: 'Promotion into the captain position.' })
  await up(3, pos.F02, { type: 'Vacate', status: 'Pending', effectiveDate: day(10), reason: 'Employee is retiring.', requestedBy: 'Jordan Ellis', requestedByEmail: 'jordan.ellis@example.gov' })
  await up(4, pos.F03, { type: 'Change incumbent', status: 'Applied', newIncumbent: 'Sam Delgado', newIncumbentEmail: 'sam.delgado@example.gov', effectiveDate: day(-20), reason: 'Lateral reassignment.', requestedBy: 'Marcus Hale', requestedByEmail: 'marcus.hale@example.gov', createdOn: day(-22), decidedBy: 'Pat Lindqvist', decidedOn: day(-19), comment: 'Applied.' })
  await up(5, pos.V01, { type: 'Fill', status: 'Rejected', newIncumbent: 'Chris Nakamura', newIncumbentEmail: 'chris.nakamura@example.gov', effectiveDate: day(5), reason: 'Proposed fill.', requestedBy: 'Taylor Brooks', requestedByEmail: 'taylor.brooks@example.gov', createdOn: day(-9), decidedBy: 'Pat Lindqvist', decidedOn: day(-8), comment: 'The position has not been advertised yet. Submit a PMC request first.' })

  return 'Loaded 13 demo positions, 6 PMC requests, 6 hiring actions with approval steps, and 5 incumbent updates.'
}
