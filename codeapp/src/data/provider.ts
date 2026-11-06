import type { Area, Person, Position, RoleAssignment, Unit } from './types'

// Everything the screens need from the back end. Screens only talk to this interface, so the sample
// data and the Dataverse connection are interchangeable.
export interface DataProvider {
  readonly kind: 'sample' | 'dataverse'
  getCurrentUser(): Promise<Person>
  getRoles(email: string): Promise<RoleAssignment[]>
  listAreas(): Promise<Area[]>
  listUnits(areaId: string): Promise<Unit[]>
  listPositions(areaId: string): Promise<Position[]>
  /** Fill, change or vacate a position. Pass null to vacate. */
  setIncumbent(positionId: string, incumbent: Person | null, actor: string): Promise<Position>
}
