import type { Position, RoleAssignment } from './types'

// Same rules as the canvas app's OnStart formulas.
export interface Access {
  isDAAll: boolean; isDA: boolean; isChief: boolean; isBudget: boolean; isPMC: boolean; isSup: boolean
  canSeeAll: boolean; canEditInc: boolean; canDetail: boolean; canEditHiring: boolean
  canFund: boolean; canPMC: boolean; canRequest: boolean
}

const CHIEF_ROLES = ['Area fire chief', 'Deputy chief', 'Assistant Chief Operations', 'Assistant Chief Support Services']

export function computeAccess(roles: RoleAssignment[], myPositions: Position[], allPositions: Position[]): Access {
  const has = (f: (r: RoleAssignment) => boolean) => roles.some(f)
  const isDAAll = has((r) => r.role === 'Data administrator' && r.allAreas)
  const isDA = has((r) => r.role === 'Data administrator')
  const isChief = has((r) => CHIEF_ROLES.includes(r.role))
  const isBudget = has((r) => r.role === 'Budget')
  const isPMC = has((r) => r.role === 'PMC member')
  const mine = new Set(myPositions.map((p) => p.id))
  const isSup = allPositions.some((p) => p.supervisorId !== null && mine.has(p.supervisorId))
  const canPMC = isPMC || isDA || isChief
  return {
    isDAAll, isDA, isChief, isBudget, isPMC, isSup,
    canSeeAll: isChief || isDAAll,
    canEditInc: isDA || isChief,
    canDetail: isSup || isDA || isChief,
    canEditHiring: isSup || isDA,
    canFund: isBudget || isDA,
    canPMC,
    canRequest: isSup || canPMC,
  }
}

/** Position ids at or below any of the given positions in the reporting line. */
export function descendantIds(rootIds: Set<string>, all: Position[]): Set<string> {
  const out = new Set(rootIds)
  let grew = true
  while (grew) {
    grew = false
    for (const p of all) if (p.supervisorId && out.has(p.supervisorId) && !out.has(p.id)) { out.add(p.id); grew = true }
  }
  return out
}
