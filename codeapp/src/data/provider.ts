import type {
  Area, Detail, HiringAction, HiringEvent, IncumbentUpdate, LaborSetting, PayRate, Person, Position,
  PositionRequest, RoleAssignment, RoleRow, SelectionStep, Unit,
} from './types'

type New<T> = Omit<T, 'id'>

// Plain create, read and update operations. The Dataverse provider and the sample provider both
// implement this. Business rules (what a clear, an approval or a fill does) live in services.ts,
// so they behave the same whichever provider is in use.
export interface DataProvider {
  readonly kind: 'sample' | 'dataverse'
  getCurrentUser(): Promise<Person>
  getRoles(email: string): Promise<RoleAssignment[]>

  listAreas(): Promise<Area[]>
  listUnits(areaId: string): Promise<Unit[]>

  listPositions(areaId: string): Promise<Position[]>
  createPosition(p: New<Position>): Promise<Position>
  updatePosition(id: string, patch: Partial<Position>): Promise<Position>

  listHiringActions(areaId: string): Promise<HiringAction[]>
  createHiringAction(a: New<HiringAction>): Promise<HiringAction>
  updateHiringAction(id: string, patch: Partial<HiringAction>): Promise<HiringAction>

  listSteps(areaId: string): Promise<SelectionStep[]>
  createSteps(steps: New<SelectionStep>[]): Promise<SelectionStep[]>
  updateStep(id: string, patch: Partial<SelectionStep>): Promise<SelectionStep>

  logEvent(e: Omit<HiringEvent, 'id' | 'at'>): Promise<void>

  listDetails(areaId: string): Promise<Detail[]>
  createDetail(d: New<Detail>): Promise<Detail>
  deleteDetail(id: string): Promise<void>

  listRequests(areaId: string): Promise<PositionRequest[]>
  createRequest(r: New<PositionRequest>): Promise<PositionRequest>
  updateRequest(id: string, patch: Partial<PositionRequest>): Promise<PositionRequest>

  listIncumbentUpdates(areaId: string): Promise<IncumbentUpdate[]>
  createIncumbentUpdate(u: New<IncumbentUpdate>): Promise<IncumbentUpdate>
  updateIncumbentUpdate(id: string, patch: Partial<IncumbentUpdate>): Promise<IncumbentUpdate>

  /** Role rows for one area, plus rows that apply to all areas. Pass null for every row. */
  listRoleRows(areaId: string | null): Promise<RoleRow[]>
  createRoleRow(r: New<RoleRow>): Promise<RoleRow>
  updateRoleRow(id: string, patch: Partial<RoleRow>): Promise<RoleRow>

  listPayRates(): Promise<PayRate[]>
  listLaborSettings(): Promise<LaborSetting[]>
  saveLaborSetting(areaId: string, patch: Partial<Omit<LaborSetting, 'id' | 'areaId'>>): Promise<LaborSetting>
}
