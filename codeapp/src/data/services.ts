// Business rules. They use only the primitive operations on DataProvider, so they behave the same
// against sample data and Dataverse. Each function throws an Error with a plain message when a rule is broken.
import type { DataProvider } from './provider'
import type {
  ApproverGroup, EventType, HiringAction, IncumbentUpdate, PayPlan, PayRate, Priority, Position, PositionRequest,
  RoleName, RoleRow, SelectionStep, Stage,
} from './types'

export const today = () => new Date().toISOString().slice(0, 10)
export const need = (cond: unknown, msg: string): void => { if (!cond) throw new Error(msg) }
const EMAIL = /^\S+@\S+\.\S+$/
export const validEmail = (s: string) => EMAIL.test(s.trim())

export interface Actor { name: string; email: string }

async function log(p: DataProvider, areaId: string, type: EventType, summary: string, by: string, note = '') {
  await p.logEvent({ summary, type, areaId, by, note })
}

// ---------- positions and incumbents ----------
export async function applyIncumbent(p: DataProvider, pos: Position, who: { name: string; email: string } | null, actor: Actor): Promise<Position> {
  const patch: Partial<Position> = who
    ? { incumbent: who.name, incumbentEmail: who.email.toLowerCase(), status: 'Filled', previousIncumbent: '', vacantSince: null }
    : { previousIncumbent: pos.incumbent, incumbent: '', incumbentEmail: '', status: 'Vacant', vacantSince: today() }
  const updated = await p.updatePosition(pos.id, patch)
  await log(p, pos.areaId, 'Incumbent change', who ? `${pos.positionId} filled by ${who.name}` : `${pos.positionId} vacated (${pos.incumbent})`, actor.name)
  return updated
}

export async function submitIncumbentUpdate(p: DataProvider, pos: Position, d: { type: IncumbentUpdate['type']; name: string; email: string; effective: string | null; reason: string }, actor: Actor) {
  if (d.type !== 'Vacate') {
    need(d.name.trim(), 'Enter the new incumbent’s name.')
    need(validEmail(d.email), 'Enter a valid sign-in email for the new incumbent.')
  }
  need(d.reason.trim(), 'Enter a reason.')
  const n = (await p.listIncumbentUpdates(pos.areaId)).length + 1
  return p.createIncumbentUpdate({
    updateId: `INC-${String(n).padStart(4, '0')}`, positionId: pos.id, areaId: pos.areaId, type: d.type,
    newIncumbent: d.type === 'Vacate' ? '' : d.name.trim(), newIncumbentEmail: d.type === 'Vacate' ? '' : d.email.trim().toLowerCase(),
    effectiveDate: d.effective, reason: d.reason.trim(), requestedBy: actor.name, requestedByEmail: actor.email,
    createdOn: today(), status: 'Pending', decidedBy: '', decidedOn: null, comment: '',
  })
}

export async function decideIncumbentUpdate(p: DataProvider, u: IncumbentUpdate, pos: Position, apply: boolean, comment: string, actor: Actor) {
  need(u.status === 'Pending', 'This update was already decided.')
  if (!apply) need(comment.trim(), 'Enter a comment when rejecting.')
  if (apply) await applyIncumbent(p, pos, u.type === 'Vacate' ? null : { name: u.newIncumbent, email: u.newIncumbentEmail }, actor)
  return p.updateIncumbentUpdate(u.id, { status: apply ? 'Applied' : 'Rejected', decidedBy: actor.name, decidedOn: today(), comment: comment.trim() })
}

// ---------- PMC requests ----------
export interface RequestDraft {
  type: PositionRequest['type']; positionId: string | null; unitId: string | null; proposedTitle: string; priority: Priority
  payPlan: PayPlan; grade: number; employmentType: PositionRequest['employmentType']; justification: string; fundingSource: string
}
export function validateRequest(d: RequestDraft) {
  if (d.type === 'Advertise vacancy') need(d.positionId, 'Choose the vacant position.')
  else { need(d.unitId, 'Choose a unit.'); need(d.proposedTitle.trim(), 'Enter a proposed title.') }
  need(d.justification.trim(), 'Enter a justification.')
  need(d.fundingSource.trim(), 'Enter a funding source.')
}
export async function submitRequest(p: DataProvider, areaId: string, d: RequestDraft, actor: Actor, existing?: PositionRequest) {
  validateRequest(d)
  const body = { ...d, areaId, proposedTitle: d.proposedTitle.trim(), justification: d.justification.trim(), fundingSource: d.fundingSource.trim() }
  if (existing) {
    need(existing.status === 'Returned' || existing.status === 'Submitted', 'Only a returned or submitted request can be edited.')
    return p.updateRequest(existing.id, { ...body, status: 'Submitted', requestDate: today(), decidedBy: '', decidedOn: null, pmcComment: '' })
  }
  const n = (await p.listRequests(areaId)).length + 1
  return p.createRequest({ ...body, requestId: `REQ-${String(n).padStart(4, '0')}`, requestedBy: actor.name, requestedByEmail: actor.email, requestDate: today(), status: 'Submitted', decidedBy: '', decidedOn: null, pmcComment: '' })
}
export const withdrawRequest = (p: DataProvider, r: PositionRequest) => {
  need(r.status === 'Submitted' || r.status === 'Returned', 'Only an open request can be withdrawn.')
  return p.updateRequest(r.id, { status: 'Withdrawn' })
}
export async function clearRequest(p: DataProvider, r: PositionRequest, comment: string, approved: Priority, actor: Actor) {
  need(r.status === 'Submitted', 'This request was already decided.')
  let positionId = r.positionId
  if (r.type === 'Add position') {
    const unit = (await p.listUnits(r.areaId)).find((u) => u.id === r.unitId)
    const created = await p.createPosition({
      positionId: `P-${Date.now().toString().slice(-6)}`, title: r.proposedTitle, areaId: r.areaId, unitId: r.unitId ?? '', unitName: unit?.name ?? '',
      payPlan: r.payPlan, grade: r.grade, series: '', employmentType: r.employmentType, status: 'Vacant', incumbent: '', incumbentEmail: '',
      previousIncumbent: '', supervisorId: null, fundingStatus: 'Pending', vacantSince: today(),
    })
    positionId = created.id
  }
  need(positionId, 'The request has no position.')
  const existing = (await p.listHiringActions(r.areaId)).find((h) => h.positionId === positionId && h.stage !== 'Offer')
  if (!existing) {
    const n = (await p.listHiringActions(r.areaId)).length + 1
    await p.createHiringAction({ actionId: `HA-${String(n).padStart(4, '0')}`, positionId: positionId!, areaId: r.areaId, stage: 'Cleared to advertise', candidate: '', proposedGrade: '', entryOnDuty: null, requestedPriority: r.priority, approvedPriority: approved, priorityBy: actor.name })
    await log(p, r.areaId, 'Stage change', `${r.requestId} cleared. Hiring action opened at Cleared to advertise`, actor.name, comment)
  }
  if (existing) await p.updateHiringAction(existing.id, { requestedPriority: r.priority, approvedPriority: approved, priorityBy: actor.name })
  return p.updateRequest(r.id, { status: 'Cleared', decidedBy: actor.name, decidedOn: today(), pmcComment: comment.trim(), positionId })
}
export function returnRequest(p: DataProvider, r: PositionRequest, comment: string, actor: Actor) {
  need(r.status === 'Submitted', 'This request was already decided.')
  need(comment.trim(), 'Enter a comment explaining what to change.')
  return p.updateRequest(r.id, { status: 'Returned', decidedBy: actor.name, decidedOn: today(), pmcComment: comment.trim() })
}

// ---------- hiring ----------
export const ADVANCE_STAGES: Stage[] = ['Cleared to advertise', 'Announced', 'Certificate issued', 'Interviews']

export async function setStage(p: DataProvider, h: HiringAction, stage: Stage, actor: Actor) {
  const updated = await p.updateHiringAction(h.id, { stage })
  await log(p, h.areaId, 'Stage change', `${h.actionId}: ${h.stage} to ${stage}`, actor.name)
  return updated
}

/** "GS-12 Step 3" gives plan GS, grade 12. Falls back to the position's own plan and grade. */
export function parseGrade(text: string, pos: Position): { plan: PayPlan; grade: number } {
  const m = /^(GS|GW|WG)-(\d{1,2})/i.exec(text.trim())
  return m ? { plan: m[1].toUpperCase() as PayPlan, grade: Number(m[2]) } : { plan: pos.payPlan, grade: pos.grade }
}
export function finalApprover(plan: PayPlan, grade: number): ApproverGroup {
  if (grade >= 10) return 'Area chief or deputy'
  return plan === 'GW' ? 'Assistant Chief Operations' : 'Assistant Chief Support Services'
}

export async function submitSelection(p: DataProvider, h: HiringAction, pos: Position, all: Position[], candidate: string, gradeText: string, actor: Actor) {
  need(h.stage === 'Interviews', 'Selections are submitted from the Interviews stage.')
  need(candidate.trim(), 'Enter the selected candidate.')
  need(/^(GS|GW|WG)-\d{1,2}(\s+Step\s+\d{1,2})?$/i.test(gradeText.trim()), 'Enter the grade like “GS-12 Step 3”.')
  const { plan, grade } = parseGrade(gradeText, pos)
  const boss = all.find((x) => x.id === pos.supervisorId)
  const prior = (await p.listSteps(h.areaId)).filter((s) => s.actionId === h.id)
  const round = prior.reduce((m, s) => Math.max(m, s.round), 0) + 1
  const groups: ApproverGroup[] = ['Supervisor', 'Budget', finalApprover(plan, grade)]
  await p.createSteps(groups.map((group, i) => ({
    name: `${h.actionId} · Step ${i + 1}`, actionId: h.id, areaId: h.areaId, sequence: (i + 1) as 1 | 2 | 3, group,
    decision: i === 0 ? 'Pending' : 'Waiting', decidedBy: '', decidedOn: null, comment: '', round,
    supervisorEmail: boss?.incumbentEmail ?? '', positionText: pos.title,
  })))
  const updated = await p.updateHiringAction(h.id, { stage: 'Selection approval', candidate: candidate.trim(), proposedGrade: gradeText.trim() })
  await log(p, h.areaId, 'Selection routed', `${h.actionId}: ${candidate.trim()} routed for approval (round ${round})`, actor.name)
  return updated
}

const FINAL_ROLES: Record<ApproverGroup, RoleName[]> = {
  Supervisor: [], Budget: ['Budget'],
  'Assistant Chief Operations': ['Assistant Chief Operations'], 'Assistant Chief Support Services': ['Assistant Chief Support Services'],
  'Area chief or deputy': ['Area fire chief', 'Deputy chief'],
}
export function canDecide(step: SelectionStep, email: string, roles: { role: RoleName }[], isDA: boolean): boolean {
  if (step.decision !== 'Pending') return false
  if (isDA) return true
  if (step.group === 'Supervisor') return step.supervisorEmail.toLowerCase() === email.toLowerCase()
  return roles.some((r) => FINAL_ROLES[step.group].includes(r.role))
}

export async function decideStep(p: DataProvider, s: SelectionStep, approve: boolean, comment: string, actor: Actor) {
  need(s.decision === 'Pending', 'This step is not waiting on a decision.')
  if (!approve) need(comment.trim(), 'Enter a comment when returning a selection.')
  const h = (await p.listHiringActions(s.areaId)).find((x) => x.id === s.actionId)
  need(h, 'Hiring action not found.')
  await p.updateStep(s.id, { decision: approve ? 'Approved' : 'Returned', decidedBy: actor.name, decidedOn: today(), comment: comment.trim() })
  if (approve) {
    if (s.sequence < 3) {
      const next = (await p.listSteps(s.areaId)).find((x) => x.actionId === s.actionId && x.round === s.round && x.sequence === s.sequence + 1)
      if (next) await p.updateStep(next.id, { decision: 'Pending' })
    } else await p.updateHiringAction(h!.id, { stage: 'Selection approved' })
    await log(p, s.areaId, 'Approval', `${h!.actionId}: step ${s.sequence} (${s.group}) approved`, actor.name, comment)
  } else {
    await p.updateHiringAction(h!.id, { stage: 'Interviews' })
    await log(p, s.areaId, 'Approval', `${h!.actionId}: returned at step ${s.sequence} (${s.group})`, actor.name, comment)
  }
}

export async function setEntryOnDuty(p: DataProvider, h: HiringAction, pos: Position, date: string, email: string, actor: Actor): Promise<{ filled: boolean }> {
  need(h.stage === 'Selection approved' || h.stage === 'Offer', 'Selection must be approved first.')
  need(date, 'Choose an entry on duty date.')
  need(h.candidate, 'The action has no selected candidate.')
  need(validEmail(email), 'Enter the candidate’s sign-in email so they can see their position.')
  await p.updateHiringAction(h.id, { stage: 'Offer', entryOnDuty: date })
  await log(p, h.areaId, 'Stage change', `${h.actionId}: entry on duty ${date}`, actor.name)
  if (date <= today()) {
    await applyIncumbent(p, pos, { name: h.candidate, email }, actor)
    return { filled: true }
  }
  return { filled: false }
}

export const PRIORITY_RANK: Record<Priority, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 }
/** Approved rating wins; until someone approves one, the requestor's rating is used. */
export const effectivePriority = (h: Pick<HiringAction, 'requestedPriority' | 'approvedPriority'>): Priority | null => h.approvedPriority ?? h.requestedPriority

export async function setApprovedPriority(p: DataProvider, h: HiringAction, v: Priority, actor: Actor) {
  const updated = await p.updateHiringAction(h.id, { approvedPriority: v, priorityBy: actor.name })
  await log(p, h.areaId, 'Stage change', `${h.actionId}: priority set to ${v}`, actor.name)
  return updated
}

export const setFunding = (p: DataProvider, pos: Position, v: Position['fundingStatus']) => p.updatePosition(pos.id, { fundingStatus: v })

// ---------- details ----------
export async function recordDetail(p: DataProvider, homeId: string, toId: string, areaId: string, actor: Actor) {
  need(homeId && toId && homeId !== toId, 'Choose two different positions.')
  const d = await p.createDetail({ homePositionId: homeId, detailedToId: toId, areaId, by: actor.name })
  await log(p, areaId, 'Detail', `Detail recorded between ${homeId} and ${toId}`, actor.name)
  return d
}

// ---------- roles ----------
export async function assignRole(p: DataProvider, d: { person: string; email: string; role: RoleName; areaId: string | null; allAreas: boolean }, actor: Actor) {
  need(d.person.trim(), 'Enter the person’s name.')
  need(validEmail(d.email), 'Enter a valid sign-in email.')
  if (!d.allAreas) need(d.areaId, 'Choose an area or all areas.')
  const rows = await p.listRoleRows(null)
  need(!rows.some((r) => r.status === 'Active' && r.email.toLowerCase() === d.email.trim().toLowerCase() && r.role === d.role && (r.allAreas === d.allAreas) && r.areaId === (d.allAreas ? null : d.areaId)), 'That person already has this role.')
  const row = await p.createRoleRow({ person: d.person.trim(), email: d.email.trim().toLowerCase(), role: d.role, status: 'Active', areaId: d.allAreas ? null : d.areaId, allAreas: d.allAreas, startDate: today() })
  await log(p, d.areaId ?? '', 'Role assigned', `${d.role} assigned to ${d.person.trim()}`, actor.name)
  return row
}
export const endRole = (p: DataProvider, r: RoleRow) => p.updateRoleRow(r.id, { status: 'Ended' })

// ---------- labor ----------
/** Pay for one position: full performance grade, step 5, latest rate year not after this year, plus the area premium. */
export function laborFor(pos: Pick<Position, 'payPlan' | 'grade'>, rates: PayRate[], premium: number, year = new Date().getFullYear()): { base: number; total: number; found: boolean } {
  const cand = rates.filter((r) => r.plan === pos.payPlan && r.grade === pos.grade && r.step === 5 && r.year <= year).sort((a, b) => b.year - a.year)[0]
  if (!cand) return { base: 0, total: 0, found: false }
  return { base: cand.rate, total: Math.round(cand.rate * (1 + premium / 100)), found: true }
}
