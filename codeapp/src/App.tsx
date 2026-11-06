import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Area, Person, Position, RoleAssignment, Unit } from './data/types'
import type { DataProvider } from './data/provider'
import { createSampleProvider } from './data/sampleProvider'
import { computeAccess } from './data/access'
import { getHostUser } from './host'
import OrgChart from './components/OrgChart'
import PositionDrawer from './components/PositionDrawer'
import TableOfOrg from './screens/TableOfOrg'
import PmcRequests from './screens/PmcRequests'
import Incumbents from './screens/Incumbents'
import Vacancies from './screens/Vacancies'
import Approvals from './screens/Approvals'
import Labor from './screens/Labor'
import Roles from './screens/Roles'
import { applyIncumbent } from './data/services'
import type { Ctx } from './ui/kit'

type Tab = 'chart' | 'toe' | 'vac' | 'appr' | 'labor' | 'pmc' | 'inc' | 'roles'
const TABS: { id: Tab; label: string }[] = [
  { id: 'chart', label: 'Org Chart' },
  { id: 'toe', label: 'Tables of Organization' },
  { id: 'vac', label: 'Vacancies & Hiring' },
  { id: 'appr', label: 'Selection Approvals' },
  { id: 'labor', label: 'Labor Estimate' },
  { id: 'pmc', label: 'PMC Requests' },
  { id: 'inc', label: 'Incumbents' },
  { id: 'roles', label: 'Role Assignments' },
]

// "Preview as" choices, shown only with sample data so every role's view can be tried
const PREVIEWS: { label: string; person: Person; roles: RoleAssignment[] }[] = [
  { label: 'Data administrator, all areas', person: { name: 'Pat Sample', email: 'pat.sample@example.gov' }, roles: [{ role: 'Data administrator', areaId: null, allAreas: true }] },
  { label: 'Area fire chief', person: { name: 'Dana Whitfield', email: 'dana.whitfield@example.gov' }, roles: [{ role: 'Area fire chief', areaId: 'area-nr', allAreas: false }] },
  { label: 'PMC member', person: { name: 'Riley Quinn', email: 'riley.quinn@example.gov' }, roles: [{ role: 'PMC member', areaId: 'area-nr', allAreas: false }] },
  { label: 'Supervisor (Unit Fire Chief)', person: { name: 'Colby Reyes', email: 'colby.reyes@example.gov' }, roles: [] },
  { label: 'Employee, no role', person: { name: 'Taylor Brooks', email: 'taylor.brooks@example.gov' }, roles: [] },
]

export default function App() {
  const [host, setHost] = useState<Person | null | undefined>(undefined)
  const [preview, setPreview] = useState(0)
  const [tab, setTab] = useState<Tab>('chart')
  const [areas, setAreas] = useState<Area[]>([])
  const [areaId, setAreaId] = useState('')
  const [units, setUnits] = useState<Unit[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [allForMe, setAllForMe] = useState<Position[]>([])
  const [roles, setRoles] = useState<RoleAssignment[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [dark, setDark] = useState(() => !window.matchMedia?.('(prefers-color-scheme: light)').matches)

  useEffect(() => { getHostUser().then(setHost) }, [])
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light' }, [dark])

  const user = host ?? PREVIEWS[preview].person
  // Hosted in Power Apps: the Dataverse provider replaces this once the tables are connected (docs/CodeApp.md).
  const provider: DataProvider = useMemo(
    () => createSampleProvider(user, host ? [{ role: 'Data administrator', areaId: null, allAreas: true }] : PREVIEWS[preview].roles),
    [user, host, preview],
  )

  useEffect(() => {
    if (host === undefined) return
    let live = true
    ;(async () => {
      const [a, r] = await Promise.all([provider.listAreas(), provider.getRoles(user.email)])
      if (!live) return
      setAreas(a); setRoles(r); setAreaId((cur) => cur || a[0]?.id || '')
    })()
    return () => { live = false }
  }, [provider, host, user.email])

  const load = useCallback(async () => {
    if (!areaId) return
    const [p, u] = await Promise.all([provider.listPositions(areaId), provider.listUnits(areaId)])
    setPositions(p); setUnits(u); setAllForMe(p)
  }, [provider, areaId])
  useEffect(() => { load() }, [load])

  const mine = useMemo(() => allForMe.filter((p) => p.incumbentEmail === user.email), [allForMe, user.email])
  const access = useMemo(() => computeAccess(roles, mine, allForMe), [roles, mine, allForMe])
  const selected = positions.find((p) => p.id === selectedId) ?? null

  async function setIncumbent(p: Position, name: string | null, email: string) {
    const updated = await applyIncumbent(provider, p, name ? { name, email } : null, { name: user.name, email: user.email })
    setPositions((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
    setNotice(name ? `${p.positionId} is now filled by ${name}.` : `${p.positionId} is now vacant.`)
    setTimeout(() => setNotice(''), 5000)
  }

  const notify = useCallback((m: string) => { setNotice(m); setTimeout(() => setNotice(''), 5000) }, [])
  const ctx: Ctx = { provider, areaId, user, access, roles, positions, units, reload: load, notify }
  const showDrawer = (tab === 'chart' || tab === 'toe') && selected

  return (
    <div className="app">
      <header className="top">
        <div className="brand">Workforce Planner</div>
        <nav className="tabs" aria-label="Sections">
          {TABS.filter((t) => t.id !== 'roles' || access.isDA).map((t) => (
            <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </nav>
        <div className="who">
          {access.canSeeAll && areas.length > 1
            ? <select value={areaId} onChange={(e) => { setAreaId(e.target.value); setSelectedId(null) }} aria-label="Geographic area">{areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
            : <span className="mute">{areas.find((a) => a.id === areaId)?.name} · your area</span>}
          <span className="user">{user.name}</span>
          <button className="btn small" onClick={() => setDark(!dark)} aria-label="Toggle theme">{dark ? 'Light' : 'Dark'}</button>
        </div>
      </header>
      {provider.kind === 'sample' && (
        <div className="banner">
          <span><b>Sample data.</b> {host ? `Signed in as ${host.name}. ` : ''}Changes are not saved after you reload.</span>
          {!host && (
            <label>Preview as <select value={preview} onChange={(e) => { setPreview(Number(e.target.value)); setSelectedId(null) }}>
              {PREVIEWS.map((p, i) => <option key={p.label} value={i}>{p.label}</option>)}
            </select></label>
          )}
        </div>
      )}
      {notice && <div className="toast" role="status">{notice}</div>}
      <main className={'stage' + (showDrawer ? ' with-drawer' : '')}>
        <section className="main">
          {tab === 'chart' && <OrgChart positions={positions} unitNames={[...new Set(positions.map((p) => p.unitName))].sort()} selectedId={selectedId} onSelect={setSelectedId} />}
          {tab === 'toe' && <TableOfOrg positions={positions} units={units} selectedId={selectedId} onSelect={setSelectedId} />}
          {tab === 'vac' && <Vacancies {...ctx} />}
          {tab === 'appr' && <Approvals {...ctx} />}
          {tab === 'labor' && <Labor {...ctx} />}
          {tab === 'pmc' && <PmcRequests {...ctx} />}
          {tab === 'inc' && <Incumbents {...ctx} />}
          {tab === 'roles' && <Roles {...ctx} />}
        </section>
        {showDrawer && selected && (
          <PositionDrawer position={selected} all={positions} access={access} onSelect={setSelectedId} onClose={() => setSelectedId(null)} onSetIncumbent={setIncumbent} />
        )}
      </main>
    </div>
  )
}
