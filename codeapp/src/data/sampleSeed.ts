// Extra sample rows so every screen has something to show. All names and numbers are made up.
import type { Detail, HiringAction, HiringEvent, IncumbentUpdate, LaborSetting, PayRate, PositionRequest, RoleRow, SelectionStep } from './types'

const day = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10)
const A = 'area-nr'

export const HIRING: HiringAction[] = [
  { id: 'HA-0001', actionId: 'HA-0001', positionId: 'P-0007', areaId: A, stage: 'Cleared to advertise', candidate: '', proposedGrade: '', entryOnDuty: null, requestedPriority: 'High', approvedPriority: 'High', priorityBy: 'Riley Quinn' },
  { id: 'HA-0002', actionId: 'HA-0002', positionId: 'P-0010', areaId: A, stage: 'Announced', candidate: '', proposedGrade: '', entryOnDuty: null, requestedPriority: 'Medium', approvedPriority: 'High', priorityBy: 'Riley Quinn' },
  { id: 'HA-0003', actionId: 'HA-0003', positionId: 'P-0008', areaId: A, stage: 'Interviews', candidate: '', proposedGrade: '', entryOnDuty: null, requestedPriority: 'Critical', approvedPriority: 'Critical', priorityBy: 'Riley Quinn' },
  { id: 'HA-0004', actionId: 'HA-0004', positionId: 'P-0009', areaId: A, stage: 'Selection approval', candidate: 'Jamie Foster', proposedGrade: 'GS-13 Step 2', entryOnDuty: null, requestedPriority: 'Medium', approvedPriority: 'Medium', priorityBy: 'Riley Quinn' },
  { id: 'HA-0005', actionId: 'HA-0005', positionId: 'P-0015', areaId: A, stage: 'Offer', candidate: 'Avery Lindqvist', proposedGrade: 'GS-13 Step 1', entryOnDuty: day(21), requestedPriority: 'Low', approvedPriority: null, priorityBy: '' },
]

export const STEPS: SelectionStep[] = [
  { id: 'S-1', name: 'HA-0004 · Step 1', actionId: 'HA-0004', areaId: A, sequence: 1, group: 'Supervisor', decision: 'Approved', decidedBy: 'Sam Delgado', decidedOn: day(-3), comment: 'Strong fit.', round: 1, supervisorEmail: 'sam.delgado@example.gov', positionText: 'GA Center Manager' },
  { id: 'S-2', name: 'HA-0004 · Step 2', actionId: 'HA-0004', areaId: A, sequence: 2, group: 'Budget', decision: 'Pending', decidedBy: '', decidedOn: null, comment: '', round: 1, supervisorEmail: 'sam.delgado@example.gov', positionText: 'GA Center Manager' },
  { id: 'S-3', name: 'HA-0004 · Step 3', actionId: 'HA-0004', areaId: A, sequence: 3, group: 'Area chief or deputy', decision: 'Waiting', decidedBy: '', decidedOn: null, comment: '', round: 1, supervisorEmail: 'sam.delgado@example.gov', positionText: 'GA Center Manager' },
]

export const REQUESTS: PositionRequest[] = [
  { id: 'R-1', requestId: 'REQ-0001', type: 'Advertise vacancy', positionId: 'P-0012', unitId: null, areaId: A, proposedTitle: '', payPlan: 'GS', grade: 13, employmentType: 'Full time', priority: 'Critical', justification: 'Unit has no chief for the coming season.', fundingSource: 'Base 2610', requestedBy: 'Sam Delgado', requestedByEmail: 'sam.delgado@example.gov', requestDate: day(-5), status: 'Submitted', decidedBy: '', decidedOn: null, pmcComment: '' },
  { id: 'R-2', requestId: 'REQ-0002', type: 'Add position', positionId: null, unitId: 'unit-yellowstone-unit', areaId: A, proposedTitle: 'Fuels Technician', payPlan: 'GS', grade: 5, employmentType: 'Seasonal', priority: 'Medium', justification: 'New prescribed fire module.', fundingSource: 'Fuels program', requestedBy: 'Hannah Okafor', requestedByEmail: 'hannah.okafor@example.gov', requestDate: day(-2), status: 'Submitted', decidedBy: '', decidedOn: null, pmcComment: '' },
  { id: 'R-3', requestId: 'REQ-0003', type: 'Advertise vacancy', positionId: 'P-0018', unitId: null, areaId: A, proposedTitle: '', payPlan: 'GS', grade: 11, employmentType: 'Full time', priority: 'Low', justification: 'Backlog of contract actions.', fundingSource: 'Base 2610', requestedBy: 'Priya Nandakumar', requestedByEmail: 'priya.nandakumar@example.gov', requestDate: day(-14), status: 'Returned', decidedBy: 'Riley Quinn', decidedOn: day(-10), pmcComment: 'Funding is still pending. Resubmit once approved.' },
]

export const UPDATES: IncumbentUpdate[] = [
  { id: 'U-1', updateId: 'INC-0001', positionId: 'P-0006', areaId: A, type: 'Fill', newIncumbent: 'Chris Lowell', newIncumbentEmail: 'chris.lowell@example.gov', effectiveDate: day(7), reason: 'Selected through the internal announcement.', requestedBy: 'Marcus Hale', requestedByEmail: 'marcus.hale@example.gov', createdOn: day(-1), status: 'Pending', decidedBy: '', decidedOn: null, comment: '' },
]

export const ROLE_ROWS: RoleRow[] = [
  { id: 'RR-1', person: 'Pat Sample', email: 'pat.sample@example.gov', role: 'Data administrator', status: 'Active', areaId: null, allAreas: true, startDate: '2026-01-05' },
  { id: 'RR-2', person: 'Dana Whitfield', email: 'dana.whitfield@example.gov', role: 'Area fire chief', status: 'Active', areaId: A, allAreas: false, startDate: '2026-01-05' },
  { id: 'RR-3', person: 'Marcus Hale', email: 'marcus.hale@example.gov', role: 'Deputy chief', status: 'Active', areaId: A, allAreas: false, startDate: '2026-01-05' },
  { id: 'RR-4', person: 'Priya Nandakumar', email: 'priya.nandakumar@example.gov', role: 'Assistant Chief Support Services', status: 'Active', areaId: A, allAreas: false, startDate: '2026-01-05' },
  { id: 'RR-5', person: 'Wen Li', email: 'wen.li@example.gov', role: 'Budget', status: 'Active', areaId: A, allAreas: false, startDate: '2026-02-01' },
  { id: 'RR-6', person: 'Riley Quinn', email: 'riley.quinn@example.gov', role: 'PMC member', status: 'Active', areaId: A, allAreas: false, startDate: '2026-02-01' },
  { id: 'RR-7', person: 'Jordan Pike', email: 'jordan.pike@example.gov', role: 'PMC member', status: 'Ended', areaId: A, allAreas: false, startDate: '2025-03-01' },
]

export const EVENTS: HiringEvent[] = []
export const DETAILS: Detail[] = []
export const LABOR: LaborSetting[] = [{ id: 'L-1', areaId: A, premium: 32 }]

// Placeholder pay table. Real rates come from the Pay Rates table in Dataverse.
export const PAY_RATES: PayRate[] = [
  ...Array.from({ length: 11 }, (_, i): PayRate => {
    const grade = i + 5
    return { plan: 'GS', grade, step: 5, rate: Math.round(36000 * Math.pow(1.13, i) / 10) * 10, year: 2026, wageArea: 'Rest of U.S.' }
  }),
  ...[3, 4, 5, 6, 7, 8, 9, 10].map((g): PayRate => ({ plan: 'WG', grade: g, step: 5, rate: 41000 + g * 1500, year: 2026, wageArea: 'Placeholder' })),
  ...[3, 4, 5, 6, 7, 8, 9].map((g): PayRate => ({ plan: 'GW', grade: g, step: 5, rate: 42000 + g * 1700, year: 2026, wageArea: 'Placeholder' })),
]
