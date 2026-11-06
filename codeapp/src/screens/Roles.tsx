import { useMemo, useState } from 'react'
import type { RoleName, RoleRow } from '@/data/types'
import { assignRole, endRole } from '@/data/services'
import { Field, Modal, Tag, fmtDate, useAction, useLoad, type Ctx } from '@/ui/kit'

const ROLES: RoleName[] = ['Data administrator', 'Area fire chief', 'Deputy chief', 'Assistant Chief Operations', 'Assistant Chief Support Services', 'Budget', 'PMC member']

export default function Roles(c: Ctx) {
  const { data: rows, reload } = useLoad(() => c.provider.listRoleRows(null), [], [] as RoleRow[])
  const [q, setQ] = useState('')
  const [active, setActive] = useState(true)
  const [adding, setAdding] = useState(false)
  const a = useAction()
  const shown = useMemo(() => rows.filter((r) => (!active || r.status === 'Active') && (!q || `${r.person} ${r.email} ${r.role}`.toLowerCase().includes(q.toLowerCase()))).sort((x, y) => x.person.localeCompare(y.person)), [rows, q, active])
  const people = new Set(shown.map((r) => r.email)).size
  return (
    <div className="page">
      <div className="filters">
        <input className="search" placeholder="Search a person, email or role" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="seg">{[true, false].map((v) => <button key={String(v)} className={active === v ? 'on' : ''} onClick={() => setActive(v)}>{v ? 'Active' : 'All'}</button>)}</div>
        <span className="mute">{shown.length} assignments · {people} people</span>
        <button className="btn pri push" onClick={() => setAdding(true)}>Assign a role</button>
      </div>
      {a.err && <div className="err">{a.err}</div>}
      <div className="tablewrap"><table>
        <thead><tr><th>Person</th><th>Role</th><th>Area</th><th>Since</th><th>Status</th><th /></tr></thead>
        <tbody>
          {shown.map((r) => (
            <tr key={r.id}><td>{r.person}<div className="mute small">{r.email}</div></td><td>{r.role}</td>
              <td>{r.allAreas ? 'All areas' : (r.areaId === c.areaId ? 'This area' : r.areaId ?? '—')}</td><td>{fmtDate(r.startDate)}</td>
              <td><Tag tone={r.status === 'Active' ? 'ok' : 'mute'}>{r.status}</Tag></td>
              <td>{r.status === 'Active' && <button className="btn small" disabled={a.busy} onClick={async () => { if (await a.run(() => endRole(c.provider, r))) { await reload(); c.notify(`${r.role} ended for ${r.person}.`) } }}>End</button>}</td></tr>
          ))}
          {!shown.length && <tr><td colSpan={6} className="empty">No role assignments match.</td></tr>}
        </tbody>
      </table></div>
      {adding && <Assign c={c} known={rows} onClose={() => setAdding(false)} onDone={async () => { setAdding(false); await reload(); c.notify('Role assigned.') }} />}
    </div>
  )
}

function Assign({ c, known, onClose, onDone }: { c: Ctx; known: RoleRow[]; onClose: () => void; onDone: () => void }) {
  const [person, setPerson] = useState(''); const [email, setEmail] = useState('')
  const [role, setRole] = useState<RoleName>('PMC member'); const [all, setAll] = useState(false)
  const a = useAction()
  const people = [...new Map(known.map((r) => [r.email, r.person])).entries()]
  return (
    <Modal title="Assign a role" onClose={onClose}>
      <div className="formgrid">
        <Field label="Person" wide><input list="known-people" value={person} onChange={(e) => { setPerson(e.target.value); const m = people.find(([, n]) => n === e.target.value); if (m) setEmail(m[0]) }} />
          <datalist id="known-people">{people.map(([e, n]) => <option key={e} value={n} />)}</datalist></Field>
        <Field label="Sign-in email" wide><input value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Role"><select value={role} onChange={(e) => setRole(e.target.value as RoleName)}>{ROLES.map((r) => <option key={r}>{r}</option>)}</select></Field>
        <Field label="Scope"><select value={all ? 'all' : 'area'} onChange={(e) => setAll(e.target.value === 'all')}><option value="area">This area</option>{role === 'Data administrator' && <option value="all">All areas</option>}</select></Field>
      </div>
      {a.err && <div className="err">{a.err}</div>}
      <div className="row"><button className="btn pri" disabled={a.busy} onClick={async () => { if (await a.run(() => assignRole(c.provider, { person, email, role, areaId: c.areaId, allAreas: all }, { name: c.user.name, email: c.user.email }))) onDone() }}>Assign</button><button className="btn" onClick={onClose}>Cancel</button></div>
    </Modal>
  )
}
