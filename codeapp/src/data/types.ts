// Domain model. Mirrors the Dataverse tables in the Workforce Planner solution (prefix wfp_).
export type PayPlan = 'GS' | 'GW' | 'WG'
export type EmploymentType = 'Full time' | 'Career seasonal' | 'Seasonal'
export type PositionStatus = 'Filled' | 'Vacant'
export type FundingStatus = 'Approved' | 'Pending' | 'Not approved'

export interface Area { id: string; name: string; code: string }
export interface Unit { id: string; name: string; areaId: string }

export interface Position {
  id: string                 // Dataverse row id
  positionId: string         // wfp_name, for example P-0001
  title: string
  areaId: string
  unitId: string
  unitName: string
  payPlan: PayPlan
  grade: number              // full performance grade
  series: string
  employmentType: EmploymentType
  status: PositionStatus
  incumbent: string
  incumbentEmail: string
  previousIncumbent: string
  supervisorId: string | null   // Position.id of the supervisor position
  fundingStatus: FundingStatus
  vacantSince: string | null    // ISO date. Needs a new column on Positions.
}

export type RoleName =
  | 'Budget' | 'Area fire chief' | 'Deputy chief' | 'Assistant Chief Operations'
  | 'Assistant Chief Support Services' | 'PMC member' | 'Data administrator'

export interface RoleAssignment { role: RoleName; areaId: string | null; allAreas: boolean }

export interface Person { name: string; email: string }
