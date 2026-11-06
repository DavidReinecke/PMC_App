import type { DataProvider } from './provider'
import type { Person, Position, RoleAssignment } from './types'
import { AREAS, POSITIONS, UNITS } from './sample'

// In-memory provider for local development and demos. Changes last until the page reloads.
export function createSampleProvider(user: Person, roles: RoleAssignment[]): DataProvider {
  const positions: Position[] = POSITIONS.map((p) => ({ ...p }))
  const delay = <T,>(v: T) => new Promise<T>((r) => setTimeout(() => r(v), 60))
  return {
    kind: 'sample',
    getCurrentUser: () => delay(user),
    getRoles: () => delay(roles),
    listAreas: () => delay(AREAS),
    listUnits: (areaId) => delay(UNITS.filter((u) => u.areaId === areaId)),
    listPositions: (areaId) => delay(positions.filter((p) => p.areaId === areaId).map((p) => ({ ...p }))),
    async setIncumbent(positionId, incumbent, _actor) {
      const p = positions.find((x) => x.id === positionId)
      if (!p) throw new Error('Position not found')
      if (incumbent) {
        Object.assign(p, { incumbent: incumbent.name, incumbentEmail: incumbent.email.toLowerCase(), status: 'Filled', previousIncumbent: '', vacantSince: null })
      } else {
        Object.assign(p, { previousIncumbent: p.incumbent, incumbent: '', incumbentEmail: '', status: 'Vacant', vacantSince: new Date().toISOString().slice(0, 10) })
      }
      return delay({ ...p })
    },
  }
}
