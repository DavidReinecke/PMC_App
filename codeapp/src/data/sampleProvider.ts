import type { DataProvider } from './provider'
import type { Person, Position, RoleAssignment } from './types'
import { AREAS, POSITIONS, UNITS } from './sample'
import { DETAILS, EVENTS, HIRING, LABOR, PAY_RATES, REQUESTS, ROLE_ROWS, STEPS, UPDATES } from './sampleSeed'

const copy = <T,>(rows: T[]) => rows.map((r) => ({ ...r }))
const delay = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 40))
let seq = 100
const nid = (p: string) => `${p}-${++seq}`

// In-memory provider for local development and demos. Changes last until the page reloads.
export function createSampleProvider(user: Person, roles: RoleAssignment[]): DataProvider {
  const positions: Position[] = copy(POSITIONS)
  const hiring = copy(HIRING), steps = copy(STEPS), events = copy(EVENTS), details = copy(DETAILS)
  const requests = copy(REQUESTS), updates = copy(UPDATES), roleRows = copy(ROLE_ROWS), labor = copy(LABOR)

  // generic helpers over a table held in memory
  function update<T extends { id: string }>(rows: T[], id: string, patch: Partial<T>): Promise<T> {
    const row = rows.find((r) => r.id === id)
    if (!row) return Promise.reject(new Error('Row not found'))
    Object.assign(row, patch)
    return delay({ ...row })
  }
  function create<T extends { id: string }>(rows: T[], prefix: string, data: Omit<T, 'id'>): Promise<T> {
    const row = { ...data, id: nid(prefix) } as T
    rows.push(row)
    return delay({ ...row })
  }
  const inArea = <T extends { areaId: string | null }>(rows: T[], areaId: string) => delay(copy(rows.filter((r) => r.areaId === areaId)))

  return {
    kind: 'sample',
    getCurrentUser: () => delay(user),
    getRoles: () => delay(roles),
    listAreas: () => delay(AREAS),
    listUnits: (areaId) => delay(UNITS.filter((u) => u.areaId === areaId)),

    listPositions: (a) => inArea(positions, a),
    createPosition: (p) => create(positions, 'P', p),
    updatePosition: (id, patch) => update(positions, id, patch),

    listHiringActions: (a) => inArea(hiring, a),
    createHiringAction: (x) => create(hiring, 'HA', x),
    updateHiringAction: (id, patch) => update(hiring, id, patch),

    listSteps: (a) => inArea(steps, a),
    createSteps: async (list) => Promise.all(list.map((s) => create(steps, 'S', s))),
    updateStep: (id, patch) => update(steps, id, patch),

    async logEvent(e) { events.push({ ...e, id: nid('E'), at: new Date().toISOString() }) },

    listDetails: (a) => inArea(details, a),
    createDetail: (d) => create(details, 'D', d),
    async deleteDetail(id) { const i = details.findIndex((d) => d.id === id); if (i >= 0) details.splice(i, 1) },

    listRequests: (a) => inArea(requests, a),
    createRequest: (r) => create(requests, 'R', r),
    updateRequest: (id, patch) => update(requests, id, patch),

    listIncumbentUpdates: (a) => inArea(updates, a),
    createIncumbentUpdate: (u) => create(updates, 'U', u),
    updateIncumbentUpdate: (id, patch) => update(updates, id, patch),

    listRoleRows: (a) => delay(copy(roleRows.filter((r) => a === null || r.areaId === a || r.allAreas))),
    createRoleRow: (r) => create(roleRows, 'RR', r),
    updateRoleRow: (id, patch) => update(roleRows, id, patch),

    listPayRates: () => delay(copy(PAY_RATES)),
    listLaborSettings: () => delay(copy(labor)),
    async saveLaborSetting(areaId, premium) {
      const row = labor.find((l) => l.areaId === areaId)
      if (row) { row.premium = premium; return delay({ ...row }) }
      return create(labor, 'L', { areaId, premium })
    },
  }
}
