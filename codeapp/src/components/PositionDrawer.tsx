import { useEffect, useState } from 'react'
import type { Position } from '@/data/types'
import type { Access } from '@/data/access'

interface Props {
  position: Position
  all: Position[]
  access: Access
  onSelect: (id: string) => void
  onClose: () => void
  onSetIncumbent: (p: Position, name: string | null, email: string) => Promise<void>
}

const daysSince = (iso: string | null) => (iso ? Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86400000)) : 0)

export default function PositionDrawer({ position: p, all, access, onSelect, onClose, onSetIncumbent }: Props) {
  const vac = p.status === 'Vacant'
  const reports = all.filter((x) => x.supervisorId === p.id).sort((a, b) => a.positionId.localeCompare(b.positionId))
  const sibs = p.supervisorId ? all.filter((x) => x.supervisorId === p.supervisorId).sort((a, b) => a.positionId.localeCompare(b.positionId)) : [p]
  const i = sibs.findIndex((x) => x.id === p.id)
  const boss = all.find((x) => x.id === p.supervisorId)
  const days = daysSince(p.vacantSince)

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  useEffect(() => { setEditing(false); setErr(''); setName(p.incumbent); setEmail(p.incumbentEmail) }, [p.id, p.incumbent, p.incumbentEmail])

  async function save(vacate: boolean) {
    if (!vacate && (!name.trim() || !/^\S+@\S+\.\S+$/.test(email))) { setErr('Enter a name and a valid sign-in email.'); return }
    setBusy(true); setErr('')
    try { await onSetIncumbent(p, vacate ? null : name.trim(), email.trim()); setEditing(false) }
    catch (e) { setErr(e instanceof Error ? e.message : 'The change could not be saved.') }
    finally { setBusy(false) }
  }

  return (
    <aside className="drawer" aria-live="polite">
      <div className="dh">
        <button className="ib" aria-label="Previous report" disabled={i <= 0} onClick={() => onSelect(sibs[i - 1].id)}>‹</button>
        <button className="ib" aria-label="Next report" disabled={i >= sibs.length - 1} onClick={() => onSelect(sibs[i + 1].id)}>›</button>
        <span className="count">{p.supervisorId ? `${i + 1} of ${sibs.length} reports` : 'Top of the organization'}</span>
        <button className="ib" aria-label="Close" onClick={onClose}>×</button>
      </div>
      <div className="dscroll">
        <span className={`pill ${vac ? 'vac' : 'fil'}`}>● {vac ? `Vacant${days ? ` · ${days} days` : ''}` : 'Filled'}</span>
        <div className="dt">
          <h2>{p.title}</h2>
          <div className={'nm' + (vac ? ' v' : '')}>{vac ? '— Position currently vacant —' : p.incumbent}</div>
          {!vac && p.incumbentEmail && <div className="mute small">{p.incumbentEmail}</div>}
          {vac && p.previousIncumbent && <div className="mute small">Previously {p.previousIncumbent}</div>}
        </div>
        <div className="sec">
          <h3>Position details</h3>
          <dl className="grid">
            <div><dt>Position ID</dt><dd className="mono">{p.positionId}</dd></div>
            <div><dt>Unit</dt><dd>{p.unitName}</dd></div>
            <div><dt>Pay plan and grade</dt><dd>{p.payPlan}-{p.grade}</dd></div>
            {p.series && <div><dt>Series</dt><dd>{p.series}</dd></div>}
            <div><dt>Employment type</dt><dd>{p.employmentType}</dd></div>
            <div><dt>Funding</dt><dd>{p.fundingStatus}</dd></div>
            <div><dt>Reports to</dt><dd>{boss ? boss.title : '—'}</dd></div>
          </dl>
        </div>
        <div className="sec">
          <h3>Direct reports ({reports.length})</h3>
          {reports.length === 0 ? <div className="mute">No direct reports.</div> : (
            <div className="reps">
              {reports.map((r) => (
                <button key={r.id} className={`rep ${r.status === 'Vacant' ? 'vac' : 'fil'}`} onClick={() => onSelect(r.id)}>
                  <span className="b" />
                  <span className="m"><div>{r.title}{r.unitName !== 'Area Office' ? ` · ${r.unitName}` : ''}</div><div>{r.status === 'Vacant' ? 'Vacant' : r.incumbent} · {r.payPlan}-{r.grade}</div></span>
                  <span className="s">{r.status === 'Vacant' ? (daysSince(r.vacantSince) ? `${daysSince(r.vacantSince)} d` : 'Vacant') : ''}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {editing && (
          <div className="sec">
            <h3>{vac ? 'Fill this position' : 'Change incumbent'}</h3>
            <label className="field"><span>Name</span><input value={name} onChange={(e) => setName(e.target.value)} /></label>
            <label className="field"><span>Sign-in email</span><input value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            {err && <div className="err">{err}</div>}
            <div className="row">
              <button className="btn pri" disabled={busy} onClick={() => save(false)}>Save</button>
              <button className="btn" disabled={busy} onClick={() => setEditing(false)}>Cancel</button>
              {!vac && <button className="btn danger" disabled={busy} onClick={() => save(true)}>Vacate</button>}
            </div>
          </div>
        )}
      </div>
      {!editing && access.canEditInc && (
        <div className="df"><button className="btn pri" onClick={() => { setName(vac ? '' : p.incumbent); setEmail(vac ? '' : p.incumbentEmail); setEditing(true) }}>{vac ? 'Fill position' : 'Edit incumbent'}</button></div>
      )}
      {!editing && !access.canEditInc && access.canDetail && (
        <div className="df"><button className="btn pri" disabled title="Incumbent update requests arrive with the next screens">Request an update</button></div>
      )}
    </aside>
  )
}
