import type { DataProvider } from './provider'
import type {
  Area, Detail, HiringAction, HiringEvent, IncumbentUpdate, LaborSetting, PayRate, Person, Position,
  PositionRequest, RoleAssignment, RoleName, RoleRow, SelectionStep, Unit,
} from './types'

// Dataverse provider. Talks to the tables through the services that `pa app add data-source` generates
// into src/generated. Those files are loaded on demand, so the app still builds and runs on sample data
// when they are not present (for example in the GitHub build check).

// ---------------------------------------------------------------- choice columns
// Values come from the generated models (100000000 and up). Labels match the domain types exactly.
type Opts<T extends string> = { toNum: Record<T, number>; toLabel: (n: unknown) => T | undefined }
function opts<T extends string>(labels: readonly T[]): Opts<T> {
  const toNum = {} as Record<T, number>
  labels.forEach((l, i) => { toNum[l] = 100000000 + i })
  return { toNum, toLabel: (n) => (typeof n === 'number' || (typeof n === 'string' && n !== '') ? labels[Number(n) - 100000000] : undefined) }
}
const PAYPLAN = opts(['GS', 'GW', 'WG'])
const EMPLOY = opts(['Full time', 'Career seasonal', 'Seasonal'])
const POSSTATUS = opts(['Filled', 'Vacant'])
const FUNDING = opts(['Approved', 'Pending', 'Not approved'])
const STAGE = opts(['Draft', 'PMC review', 'Cleared to advertise', 'Announced', 'Certificate issued', 'Interviews', 'Selection approval', 'Selection approved', 'Offer'])
const PRIORITY = opts(['Critical', 'High', 'Medium', 'Low'])
const GROUP = opts(['Supervisor', 'Budget', 'Assistant Chief Operations', 'Assistant Chief Support Services', 'Area chief or deputy'])
const DECISION = opts(['Waiting', 'Pending', 'Approved', 'Returned'])
const EVENT = opts(['Stage change', 'Selection routed', 'Approval', 'Detail', 'Incumbent change', 'Role assigned'])
const REQTYPE = opts(['Advertise vacancy', 'Add position'])
const REQSTATUS = opts(['Submitted', 'Cleared', 'Returned', 'Withdrawn'])
const UPDTYPE = opts(['Fill', 'Change incumbent', 'Vacate'])
const UPDSTATUS = opts(['Pending', 'Applied', 'Rejected'])
const ROLE = opts<RoleName>(['Budget', 'Area fire chief', 'Deputy chief', 'Assistant Chief Operations', 'Assistant Chief Support Services', 'PMC member', 'Data administrator'])
const ASSIGN = opts(['Active', 'Ended'])

// ---------------------------------------------------------------- helpers
/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>
interface Svc {
  getAll(o?: Row): Promise<{ success: boolean; data: Row[]; error?: unknown; skipToken?: string }>
  get(id: string): Promise<{ success: boolean; data: Row; error?: unknown }>
  create(r: Row): Promise<{ success: boolean; data: Row; error?: unknown }>
  update(id: string, r: Row): Promise<{ success: boolean; data: Row; error?: unknown }>
  delete(id: string): Promise<{ success: boolean; error?: unknown }>
}

function fail(what: string, error: unknown): never {
  const msg = error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error ?? 'unknown error')
  throw new Error(`${what}: ${msg}`)
}
const str = (v: unknown) => (v == null ? '' : String(v))
const date = (v: unknown) => (v ? String(v).slice(0, 10) : null)
const q = (s: string) => `'${s.replace(/'/g, "''")}'`
const bind = (set: string, id: string | null | undefined) => (id ? `/${set}(${id})` : null)
/** Copy a field into the row only when the patch actually contains it. */
function has<T extends object>(p: T, k: keyof T) { return Object.prototype.hasOwnProperty.call(p, k) && p[k] !== undefined }

export async function createDataverseProvider(me: Person): Promise<DataProvider | null> {
  const loaders: Record<string, () => Promise<unknown>> = import.meta.glob('../generated/index.ts')
  const load = Object.values(loaders)[0]
  if (!load) return null
  const g = (await load()) as Record<string, Svc>
  const S = {
    area: g.Wfp_geographicareasService, unit: g.Wfp_unitsService, pos: g.Wfp_positionsService,
    ha: g.Wfp_hiringactionsService, step: g.Wfp_selectionstepsService, event: g.Wfp_hiringeventsService,
    detail: g.Wfp_detailsService, req: g.Wfp_positionrequestsService, inc: g.Wfp_incumbentupdatesService,
    role: g.Wfp_roleassignmentsService, rate: g.Wfp_payratesService, labor: g.Wfp_laborsettingsService,
  }
  if (Object.values(S).some((s) => !s)) throw new Error('src/generated is missing one of the 12 table services. Run pa app add data-source for each table again.')

  async function all(svc: Svc, filter?: string, orderBy?: string[]): Promise<Row[]> {
    const out: Row[] = []
    let token: string | undefined
    for (let page = 0; page < 200; page++) {
      const r = await svc.getAll({ filter: filter ? `statecode eq 0 and (${filter})` : 'statecode eq 0', orderBy, skipToken: token })
      if (!r.success) fail('Could not load rows', r.error)
      out.push(...(r.data ?? []))
      token = r.skipToken
      if (!token) break
    }
    return out
  }
  async function make(svc: Svc, idField: string, row: Row): Promise<Row> {
    const r = await svc.create(row)
    if (!r.success) fail('Could not save', r.error)
    const id = r.data?.[idField]
    if (id) {
      const back = await svc.get(id)
      if (back.success && back.data) return back.data
    }
    return r.data
  }
  async function change(svc: Svc, id: string, row: Row): Promise<Row> {
    const r = await svc.update(id, row)
    if (!r.success) fail('Could not save', r.error)
    const back = await svc.get(id)
    if (!back.success) fail('Could not reload row', back.error)
    return back.data
  }

  const area = (r: Row) => str(r._wfp_geographicarea_value)
  const inArea = (areaId: string) => `_wfp_geographicarea_value eq ${areaId}`

  // ---- units, with a small cache so positions can show a unit name
  const unitCache = new Map<string, Unit[]>()
  const mapUnit = (r: Row): Unit => ({ id: r.wfp_unitid, name: str(r.wfp_name), areaId: area(r) })
  async function units(areaId: string) {
    if (!unitCache.has(areaId)) unitCache.set(areaId, (await all(S.unit, inArea(areaId), ['wfp_name asc'])).map(mapUnit))
    return unitCache.get(areaId)!
  }

  // ---- positions
  const mapPos = (r: Row, us: Unit[]): Position => {
    const unitId = str(r._wfp_unit_value)
    const parsed = parseInt(String(r.wfp_grade ?? '').replace(/\D+/g, '').slice(-2), 10)
    return {
      id: r.wfp_positionid, positionId: str(r.wfp_name), title: str(r.wfp_title), areaId: area(r), unitId,
      unitName: us.find((u) => u.id === unitId)?.name ?? '',
      payPlan: PAYPLAN.toLabel(r.wfp_payplan) ?? 'GS',
      grade: r.wfp_topgrade ?? (Number.isFinite(parsed) ? parsed : 0),
      series: '',                                   // no series column in Dataverse
      employmentType: EMPLOY.toLabel(r.wfp_employmenttype) ?? 'Full time',
      status: POSSTATUS.toLabel(r.wfp_status) ?? 'Vacant',
      incumbent: str(r.wfp_incumbent), incumbentEmail: str(r.wfp_incumbentemail).toLowerCase(), previousIncumbent: str(r.wfp_previousincumbent),
      supervisorId: r._wfp_supervisor_value ? str(r._wfp_supervisor_value) : null,
      fundingStatus: FUNDING.toLabel(r.wfp_fundingstatus) ?? 'Approved',
      vacantSince: date(r.wfp_vacantsince),
      prepPercent: r.wfp_preppercent ?? null, premiumOverride: r.wfp_premiumoverride ?? null,
    }
  }
  function posRow(p: Partial<Position>): Row {
    const o: Row = {}
    if (has(p, 'positionId')) o.wfp_name = p.positionId
    if (has(p, 'title')) o.wfp_title = p.title
    if (has(p, 'areaId')) o['wfp_position_geographicarea@odata.bind'] = bind('wfp_geographicareas', p.areaId)
    if (has(p, 'unitId')) o['wfp_position_unit@odata.bind'] = bind('wfp_units', p.unitId)
    if (has(p, 'payPlan')) o.wfp_payplan = PAYPLAN.toNum[p.payPlan!]
    if (has(p, 'grade')) { o.wfp_topgrade = p.grade; if (p.payPlan) o.wfp_grade = `${p.payPlan}-${p.grade}` }
    if (has(p, 'employmentType')) o.wfp_employmenttype = EMPLOY.toNum[p.employmentType!]
    if (has(p, 'status')) o.wfp_status = POSSTATUS.toNum[p.status!]
    if (has(p, 'incumbent')) o.wfp_incumbent = p.incumbent
    if (has(p, 'incumbentEmail')) o.wfp_incumbentemail = p.incumbentEmail
    if (has(p, 'previousIncumbent')) o.wfp_previousincumbent = p.previousIncumbent
    if (has(p, 'supervisorId')) o['wfp_position_supervisor@odata.bind'] = bind('wfp_positions', p.supervisorId)
    if (has(p, 'fundingStatus')) o.wfp_fundingstatus = FUNDING.toNum[p.fundingStatus!]
    if (has(p, 'vacantSince')) o.wfp_vacantsince = p.vacantSince ?? null
    if (has(p, 'prepPercent')) o.wfp_preppercent = p.prepPercent ?? null
    if (has(p, 'premiumOverride')) o.wfp_premiumoverride = p.premiumOverride ?? null
    return o
  }

  // ---- hiring
  const mapHA = (r: Row): HiringAction => ({
    id: r.wfp_hiringactionid, actionId: str(r.wfp_name), positionId: str(r._wfp_position_value), areaId: area(r),
    stage: STAGE.toLabel(r.wfp_stage) ?? 'Draft', candidate: str(r.wfp_candidate), proposedGrade: str(r.wfp_proposedgrade),
    entryOnDuty: date(r.wfp_entryonduty),
    requestedPriority: PRIORITY.toLabel(r.wfp_requestedpriority) ?? null, approvedPriority: PRIORITY.toLabel(r.wfp_approvedpriority) ?? null,
    priorityBy: str(r.wfp_priorityby),
  })
  function haRow(a: Partial<HiringAction>): Row {
    const o: Row = {}
    if (has(a, 'actionId')) o.wfp_name = a.actionId
    if (has(a, 'positionId')) o['wfp_hiringaction_position@odata.bind'] = bind('wfp_positions', a.positionId)
    if (has(a, 'areaId')) o['wfp_hiringaction_geographicarea@odata.bind'] = bind('wfp_geographicareas', a.areaId)
    if (has(a, 'stage')) o.wfp_stage = STAGE.toNum[a.stage!]
    if (has(a, 'candidate')) o.wfp_candidate = a.candidate
    if (has(a, 'proposedGrade')) o.wfp_proposedgrade = a.proposedGrade
    if (has(a, 'entryOnDuty')) o.wfp_entryonduty = a.entryOnDuty ?? null
    if (has(a, 'requestedPriority')) o.wfp_requestedpriority = a.requestedPriority ? PRIORITY.toNum[a.requestedPriority] : null
    if (has(a, 'approvedPriority')) o.wfp_approvedpriority = a.approvedPriority ? PRIORITY.toNum[a.approvedPriority] : null
    if (has(a, 'priorityBy')) o.wfp_priorityby = a.priorityBy
    return o
  }

  const mapStep = (r: Row): SelectionStep => ({
    id: r.wfp_selectionstepid, name: str(r.wfp_name), actionId: str(r._wfp_hiringaction_value), areaId: area(r),
    sequence: (r.wfp_sequence ?? 1) as 1 | 2 | 3, group: GROUP.toLabel(r.wfp_approvergroup) ?? 'Supervisor',
    decision: DECISION.toLabel(r.wfp_decision) ?? 'Waiting', decidedBy: str(r.wfp_decidedby), decidedOn: date(r.wfp_decidedon),
    comment: str(r.wfp_comment), round: r.wfp_round ?? 1, supervisorEmail: str(r.wfp_supervisoremail).toLowerCase(), positionText: str(r.wfp_positiontext),
  })
  function stepRow(s: Partial<SelectionStep>): Row {
    const o: Row = {}
    if (has(s, 'name')) o.wfp_name = s.name
    if (has(s, 'actionId')) o['wfp_selectionstep_hiringaction@odata.bind'] = bind('wfp_hiringactions', s.actionId)
    if (has(s, 'areaId')) o['wfp_selectionstep_geographicarea@odata.bind'] = bind('wfp_geographicareas', s.areaId)
    if (has(s, 'sequence')) o.wfp_sequence = s.sequence
    if (has(s, 'group')) o.wfp_approvergroup = GROUP.toNum[s.group!]
    if (has(s, 'decision')) o.wfp_decision = DECISION.toNum[s.decision!]
    if (has(s, 'decidedBy')) o.wfp_decidedby = s.decidedBy
    if (has(s, 'decidedOn')) o.wfp_decidedon = s.decidedOn ?? null
    if (has(s, 'comment')) o.wfp_comment = s.comment
    if (has(s, 'round')) o.wfp_round = s.round
    if (has(s, 'supervisorEmail')) o.wfp_supervisoremail = s.supervisorEmail
    if (has(s, 'positionText')) o.wfp_positiontext = s.positionText
    return o
  }

  const mapDetail = (r: Row): Detail => ({ id: r.wfp_detailid, homePositionId: str(r._wfp_homeposition_value), detailedToId: str(r._wfp_detailedto_value), areaId: area(r), by: str(r.wfp_enteredby) })

  // ---- requests
  const mapReq = (r: Row): PositionRequest => ({
    id: r.wfp_positionrequestid, requestId: str(r.wfp_name), type: REQTYPE.toLabel(r.wfp_requesttype) ?? 'Advertise vacancy',
    positionId: r._wfp_position_value ? str(r._wfp_position_value) : null, unitId: r._wfp_unit_value ? str(r._wfp_unit_value) : null, areaId: area(r),
    proposedTitle: str(r.wfp_proposedtitle), payPlan: PAYPLAN.toLabel(r.wfp_payplan) ?? 'GS', grade: r.wfp_topgrade ?? 0,
    employmentType: EMPLOY.toLabel(r.wfp_employmenttype) ?? 'Full time', priority: PRIORITY.toLabel(r.wfp_priority) ?? 'Medium',
    justification: str(r.wfp_justification), fundingSource: str(r.wfp_fundingsource), requestedBy: str(r.wfp_requestedby),
    requestedByEmail: str(r.wfp_requestedbyemail).toLowerCase(), requestDate: date(r.wfp_requestdate) ?? '',
    status: REQSTATUS.toLabel(r.wfp_requeststatus) ?? 'Submitted', decidedBy: str(r.wfp_decidedby), decidedOn: date(r.wfp_decidedon), pmcComment: str(r.wfp_pmccomment),
  })
  function reqRow(x: Partial<PositionRequest>): Row {
    const o: Row = {}
    if (has(x, 'requestId')) o.wfp_name = x.requestId
    if (has(x, 'type')) o.wfp_requesttype = REQTYPE.toNum[x.type!]
    if (has(x, 'positionId')) o['wfp_positionrequest_position@odata.bind'] = bind('wfp_positions', x.positionId)
    if (has(x, 'unitId')) o['wfp_positionrequest_unit@odata.bind'] = bind('wfp_units', x.unitId)
    if (has(x, 'areaId')) o['wfp_positionrequest_geographicarea@odata.bind'] = bind('wfp_geographicareas', x.areaId)
    if (has(x, 'proposedTitle')) o.wfp_proposedtitle = x.proposedTitle
    if (has(x, 'payPlan')) o.wfp_payplan = PAYPLAN.toNum[x.payPlan!]
    if (has(x, 'grade')) o.wfp_topgrade = x.grade
    if (has(x, 'employmentType')) o.wfp_employmenttype = EMPLOY.toNum[x.employmentType!]
    if (has(x, 'priority')) o.wfp_priority = PRIORITY.toNum[x.priority!]
    if (has(x, 'justification')) o.wfp_justification = x.justification
    if (has(x, 'fundingSource')) o.wfp_fundingsource = x.fundingSource
    if (has(x, 'requestedBy')) o.wfp_requestedby = x.requestedBy
    if (has(x, 'requestedByEmail')) o.wfp_requestedbyemail = x.requestedByEmail
    if (has(x, 'requestDate')) o.wfp_requestdate = x.requestDate || null
    if (has(x, 'status')) o.wfp_requeststatus = REQSTATUS.toNum[x.status!]
    if (has(x, 'decidedBy')) o.wfp_decidedby = x.decidedBy
    if (has(x, 'decidedOn')) o.wfp_decidedon = x.decidedOn ?? null
    if (has(x, 'pmcComment')) o.wfp_pmccomment = x.pmcComment
    return o
  }

  const mapInc = (r: Row): IncumbentUpdate => ({
    id: r.wfp_incumbentupdateid, updateId: str(r.wfp_name), positionId: str(r._wfp_position_value), areaId: area(r),
    type: UPDTYPE.toLabel(r.wfp_updatetype) ?? 'Fill', newIncumbent: str(r.wfp_newincumbent), newIncumbentEmail: str(r.wfp_newincumbentemail).toLowerCase(),
    effectiveDate: date(r.wfp_effectivedate), reason: str(r.wfp_reason), requestedBy: str(r.wfp_requestedby),
    requestedByEmail: str(r.wfp_requestedbyemail).toLowerCase(), createdOn: str(r.createdon),
    status: UPDSTATUS.toLabel(r.wfp_updatestatus) ?? 'Pending', decidedBy: str(r.wfp_decidedby), decidedOn: date(r.wfp_decidedon), comment: str(r.wfp_comment),
  })
  function incRow(x: Partial<IncumbentUpdate>): Row {
    const o: Row = {}
    if (has(x, 'updateId')) o.wfp_name = x.updateId
    if (has(x, 'positionId')) o['wfp_incumbentupdate_position@odata.bind'] = bind('wfp_positions', x.positionId)
    if (has(x, 'areaId')) o['wfp_incumbentupdate_geographicarea@odata.bind'] = bind('wfp_geographicareas', x.areaId)
    if (has(x, 'type')) o.wfp_updatetype = UPDTYPE.toNum[x.type!]
    if (has(x, 'newIncumbent')) o.wfp_newincumbent = x.newIncumbent
    if (has(x, 'newIncumbentEmail')) o.wfp_newincumbentemail = x.newIncumbentEmail
    if (has(x, 'effectiveDate')) o.wfp_effectivedate = x.effectiveDate ?? null
    if (has(x, 'reason')) o.wfp_reason = x.reason
    if (has(x, 'requestedBy')) o.wfp_requestedby = x.requestedBy
    if (has(x, 'requestedByEmail')) o.wfp_requestedbyemail = x.requestedByEmail
    if (has(x, 'status')) o.wfp_updatestatus = UPDSTATUS.toNum[x.status!]
    if (has(x, 'decidedBy')) o.wfp_decidedby = x.decidedBy
    if (has(x, 'decidedOn')) o.wfp_decidedon = x.decidedOn ?? null
    if (has(x, 'comment')) o.wfp_comment = x.comment
    return o
  }

  // ---- roles
  const mapRole = (r: Row): RoleRow => ({
    id: r.wfp_roleassignmentid, person: str(r.wfp_name), email: str(r.wfp_useremail).toLowerCase(),
    role: ROLE.toLabel(r.wfp_role) ?? 'PMC member', status: ASSIGN.toLabel(r.wfp_status) ?? 'Active',
    areaId: r.wfp_allareas ? null : (r._wfp_geographicarea_value ? str(r._wfp_geographicarea_value) : null),
    allAreas: !!r.wfp_allareas, startDate: date(r.wfp_startdate),
  })
  function roleRow(x: Partial<RoleRow>): Row {
    const o: Row = {}
    if (has(x, 'person')) o.wfp_name = x.person
    if (has(x, 'email')) o.wfp_useremail = x.email
    if (has(x, 'role')) o.wfp_role = ROLE.toNum[x.role!]
    if (has(x, 'status')) o.wfp_status = ASSIGN.toNum[x.status!]
    if (has(x, 'areaId')) o['wfp_roleassignment_geographicarea@odata.bind'] = bind('wfp_geographicareas', x.areaId)
    if (has(x, 'allAreas')) o.wfp_allareas = x.allAreas
    if (has(x, 'startDate')) o.wfp_startdate = x.startDate ?? null
    return o
  }

  const mapLabor = (r: Row): LaborSetting => ({
    id: r.wfp_laborsettingid, areaId: area(r), premium: r.wfp_premium ?? 32, payStep: r.wfp_paystep ?? 5,
    tempPercent: r.wfp_temppercent ?? 50, defaultPrep: r.wfp_defaultprep ?? 100,
  })

  return {
    kind: 'dataverse',
    async getCurrentUser() { return me },
    async getRoles(email) {
      const rows = (await all(S.role, `wfp_useremail eq ${q(email)}`)).map(mapRole).filter((r) => r.status === 'Active')
      return rows.map<RoleAssignment>((r) => ({ role: r.role, areaId: r.areaId, allAreas: r.allAreas }))
    },

    async listAreas() { return (await all(S.area, undefined, ['wfp_name asc'])).map((r): Area => ({ id: r.wfp_geographicareaid, name: str(r.wfp_name), code: str(r.wfp_code) })) },
    listUnits: units,

    async listPositions(areaId) { const us = await units(areaId); return (await all(S.pos, inArea(areaId), ['wfp_name asc'])).map((r) => mapPos(r, us)) },
    async createPosition(p) { const us = await units(p.areaId); return mapPos(await make(S.pos, 'wfp_positionid', posRow(p)), us) },
    async updatePosition(id, patch) { const r = await change(S.pos, id, posRow(patch)); return mapPos(r, await units(area(r))) },

    async listHiringActions(areaId) { return (await all(S.ha, inArea(areaId), ['wfp_name asc'])).map(mapHA) },
    async createHiringAction(a) { return mapHA(await make(S.ha, 'wfp_hiringactionid', haRow(a))) },
    async updateHiringAction(id, patch) { return mapHA(await change(S.ha, id, haRow(patch))) },

    async listSteps(areaId) { return (await all(S.step, inArea(areaId), ['wfp_name asc'])).map(mapStep) },
    async createSteps(list) { const out: SelectionStep[] = []; for (const s of list) out.push(mapStep(await make(S.step, 'wfp_selectionstepid', stepRow(s)))); return out },
    async updateStep(id, patch) { return mapStep(await change(S.step, id, stepRow(patch))) },

    async logEvent(e: Omit<HiringEvent, 'id' | 'at'>) {
      await make(S.event, 'wfp_hiringeventid', {
        wfp_name: e.summary.slice(0, 190), wfp_eventtype: EVENT.toNum[e.type], wfp_actor: e.by, wfp_note: e.note,
        'wfp_hiringevent_geographicarea@odata.bind': bind('wfp_geographicareas', e.areaId),
      })
    },

    async listDetails(areaId) { return (await all(S.detail, inArea(areaId))).map(mapDetail) },
    async createDetail(d) {
      return mapDetail(await make(S.detail, 'wfp_detailid', {
        wfp_name: `DT-${Date.now().toString().slice(-8)}`, wfp_enteredby: d.by,
        'wfp_detail_homeposition@odata.bind': bind('wfp_positions', d.homePositionId),
        'wfp_detail_detailedto@odata.bind': bind('wfp_positions', d.detailedToId),
        'wfp_detail_geographicarea@odata.bind': bind('wfp_geographicareas', d.areaId),
      }))
    },
    async deleteDetail(id) { const r = await S.detail.delete(id); if (!r.success) fail('Could not remove detail', r.error) },

    async listRequests(areaId) { return (await all(S.req, inArea(areaId), ['wfp_name asc'])).map(mapReq) },
    async createRequest(r) { return mapReq(await make(S.req, 'wfp_positionrequestid', reqRow(r))) },
    async updateRequest(id, patch) { return mapReq(await change(S.req, id, reqRow(patch))) },

    async listIncumbentUpdates(areaId) { return (await all(S.inc, inArea(areaId), ['wfp_name asc'])).map(mapInc) },
    async createIncumbentUpdate(u) { return mapInc(await make(S.inc, 'wfp_incumbentupdateid', incRow(u))) },
    async updateIncumbentUpdate(id, patch) { return mapInc(await change(S.inc, id, incRow(patch))) },

    async listRoleRows(areaId) {
      const rows = (await all(S.role, undefined, ['wfp_name asc'])).map(mapRole)
      return areaId === null ? rows : rows.filter((r) => r.allAreas || r.areaId === areaId)
    },
    async createRoleRow(r) { return mapRole(await make(S.role, 'wfp_roleassignmentid', roleRow(r))) },
    async updateRoleRow(id, patch) { return mapRole(await change(S.role, id, roleRow(patch))) },

    async deleteRows(kind, ids) {
      const svc = { step: S.step, hiringAction: S.ha, request: S.req, incumbentUpdate: S.inc, position: S.pos }[kind]
      for (const id of ids) { const r = await svc.delete(id); if (!r.success) fail('Could not delete a demo row', r.error) }
    },

    async listPayRates() {
      return (await all(S.rate)).map((r): PayRate => ({
        plan: PAYPLAN.toLabel(r.wfp_payplan) ?? 'GS', grade: r.wfp_grade ?? 0, step: r.wfp_step ?? 1,
        rate: Number(r.wfp_annualrate ?? 0), year: r.wfp_effectiveyear ?? 0, wageArea: str(r.wfp_wagearea),
      }))
    },
    async listLaborSettings() { return (await all(S.labor)).map(mapLabor) },
    async saveLaborSetting(areaId, patch) {
      const row: Row = {}
      if (has(patch, 'premium')) row.wfp_premium = patch.premium
      if (has(patch, 'payStep')) row.wfp_paystep = patch.payStep
      if (has(patch, 'tempPercent')) row.wfp_temppercent = patch.tempPercent
      if (has(patch, 'defaultPrep')) row.wfp_defaultprep = patch.defaultPrep
      const existing = (await all(S.labor, inArea(areaId)))[0]
      if (existing) return mapLabor(await change(S.labor, existing.wfp_laborsettingid, row))
      return mapLabor(await make(S.labor, 'wfp_laborsettingid', {
        wfp_name: 'Labor settings', wfp_premium: 32, wfp_paystep: 5, wfp_temppercent: 50, wfp_defaultprep: 100, ...row,
        'wfp_laborsetting_geographicarea@odata.bind': bind('wfp_geographicareas', areaId),
      }))
    },
  }
}
