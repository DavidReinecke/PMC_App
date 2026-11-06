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

// ---- hiring ----
export const STAGES = ['Draft', 'PMC review', 'Cleared to advertise', 'Announced', 'Certificate issued', 'Interviews', 'Selection approval', 'Selection approved', 'Offer'] as const
export type Stage = (typeof STAGES)[number]

export interface HiringAction {
  id: string; actionId: string; positionId: string; areaId: string; stage: Stage
  candidate: string; proposedGrade: string; entryOnDuty: string | null   // ISO date
}

export type ApproverGroup = 'Supervisor' | 'Budget' | 'Assistant Chief Operations' | 'Assistant Chief Support Services' | 'Area chief or deputy'
export type Decision = 'Waiting' | 'Pending' | 'Approved' | 'Returned'
export interface SelectionStep {
  id: string; name: string; actionId: string; areaId: string; sequence: 1 | 2 | 3; group: ApproverGroup
  decision: Decision; decidedBy: string; decidedOn: string | null; comment: string; round: number
  supervisorEmail: string; positionText: string
}

export type EventType = 'Stage change' | 'Selection routed' | 'Approval' | 'Detail' | 'Incumbent change' | 'Role assigned'
export interface HiringEvent { id: string; summary: string; type: EventType; areaId: string; by: string; note: string; at: string }

export interface Detail { id: string; homePositionId: string; detailedToId: string; areaId: string; by: string }

// ---- requests ----
export type RequestType = 'Advertise vacancy' | 'Add position'
export type RequestStatus = 'Submitted' | 'Cleared' | 'Returned' | 'Withdrawn'
export interface PositionRequest {
  id: string; requestId: string; type: RequestType; positionId: string | null; unitId: string | null; areaId: string
  proposedTitle: string; payPlan: PayPlan; grade: number; employmentType: EmploymentType
  justification: string; fundingSource: string; requestedBy: string; requestedByEmail: string; requestDate: string
  status: RequestStatus; decidedBy: string; decidedOn: string | null; pmcComment: string
}

export type UpdateType = 'Fill' | 'Change incumbent' | 'Vacate'
export type UpdateStatus = 'Pending' | 'Applied' | 'Rejected'
export interface IncumbentUpdate {
  id: string; updateId: string; positionId: string; areaId: string; type: UpdateType
  newIncumbent: string; newIncumbentEmail: string; effectiveDate: string | null; reason: string
  requestedBy: string; requestedByEmail: string; createdOn: string
  status: UpdateStatus; decidedBy: string; decidedOn: string | null; comment: string
}

// ---- roles and pay ----
export type AssignmentStatus = 'Active' | 'Ended'
export interface RoleRow { id: string; person: string; email: string; role: RoleName; status: AssignmentStatus; areaId: string | null; allAreas: boolean; startDate: string | null }
export interface PayRate { plan: PayPlan; grade: number; step: number; rate: number; year: number; wageArea: string }
export interface LaborSetting { id: string; areaId: string; premium: number }
