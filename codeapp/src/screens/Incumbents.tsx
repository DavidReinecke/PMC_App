import { useMemo, useState } from 'react'
import type { IncumbentUpdate, Position, UpdateType } from '@/data/types'
import { decideIncumbentUpdate, submitIncumbentUpdate } from '@/data/services'
import { descendantIds } from '@/data/access'
import { Field, Modal, Tag, fmtDate, useAction, useLoad, type Ctx } from '@/ui/kit'

const TONE = { Pending: 'info', Applied: 'ok', Rejected: 'bad' } as const

export default function Incumbents(c: Ctx) {
  const { data: rows, reload } = useLoad(() => c.provider.listIncumbentUpdates(c.areaId), [c.areaId], [] as IncumbentUpdate[])
  const [show, setShow] = useState<'Pending' | 'All'>('Pending')
  const [sel, setSel] = useState<IncumbentUpdate | null>(null)
  const [adding, setAdding] = useState(false)
  const pos = (id: string) => c.positions.find((p) => p.id === id)
  const shown = rows.filter((r) => show === 'All' || r.status === 'Pending').sort((a, b) => b.createdOn.localeCompare(a.createdOn))
  async function done(msg: string) { await reload(); await c.reload(); c.notify(msg); setSel(null); setAdding(false) }

  // Supervisors can ask about positions in their own reporting line. Chiefs and data administrators can use any position.
  const choices = useMemo(() => {
    if (c.access.canEditInc) return c.positions
    const mine = new Set(c.positions.filter((p) => p.incumbentEmail === c.user.email).map((p) => p.id))
    const ids = descendantIds(mine, c.positions); mine.forEach((m) => ids.delete(m))
    return c.positions.filter((p) => ids.has(p.id))
  }, [c.positions, c.access.canEditInc, c.user.email])

  return (
    <div className="page">
      <div className="filters">
        <div className="seg">{(['Pending', 'All'] as const).map((s) => <button key={s} className={show === s ? 'on' : ''} onClick={() => setShow(s)}>{s}</button>)}</div>
        <span className="mute">{shown.length} updates</span>
        {c.access.canDetail && <button className="btn pri push" onClick={() => setAdding(true)}>Request an update</button>}
      </div>
      <div className="tablewrap">
        <table>
          <thead><tr><th>Update</th><th>Position</th><th>Type</th><th>New incumbent</th><th>Effective</th><th>Requested by</th><th>Status</th></tr></thead>
          <tbody>
            {shown.map((u) => (
              <tr key={u.id} tabIndex={0} onClick={() => setSel(u)} onKeyDown={(e) => e.key === 'Enter' && setSel(u)}>
                <td className="mono">{u.updateId}</td><td>{pos(u.positionId)?.positionId} · {pos(u.positionId)?.title}</td><td>{u.type}</td>
                <td>{u.type === 'Vacate' ? '—' : u.newIncumbent}</td><td>{fmtDate(u.effectiveDate)}</td><td>{u.requestedBy}</td><td><Tag tone={TONE[u.status]}>{u.status}</Tag></td>
              </tr>
            ))}
            {!shown.length && <tr><td colSpan={7} className="empty">No updates to show.</td></tr>}
          </tbody>
        </table>
      </div>
      {sel && <Decide c={c} u={sel} pos={pos(sel.positionId)} onClose={() => setSel(null)} onDone={done} />}
      {adding && <NewUpdate c={c} choices={choices} onClose={() => setAdding(false)} onDone={done} />}
    </div>
  )
}

function Decide({ c, u, pos, onClose, onDone }: { c: Ctx; u: IncumbentUpdate; pos?: Position; onClose: () => void; onDone: (m: string) => void }) {
  const [comment, setComment] = useState('')
  const a = useAction()
  const actor = { name: c.user.name, email: c.user.email }
  return (
    <Modal title={`${u.updateId} · ${u.type}`} onClose={onClose}>
      <dl className="grid">
        <div><dt>Position</dt><dd>{pos ? `${pos.positionId} · ${pos.title}` : '—'}</dd></div>
        <div><dt>Current incumbent</dt><dd>{pos?.incumbent || 'Vacant'}</dd></div>
        {u.type !== 'Vacate' && <div><dt>New incumbent</dt><dd>{u.newIncumbent}<div className="mute small">{u.newIncumbentEmail}</div></dd></div>}
        <div><dt>Effective</dt><dd>{fmtDate(u.effectiveDate)}</dd></div>
        <div><dt>Requested by</dt><dd>{u.requestedBy}</dd></div>
        <div><dt>Status</dt><dd><Tag tone={TONE[u.status]}>{u.status}</Tag></dd></div>
      </dl>
      <h3 className="h3">Reason</h3><p className="memo">{u.reason}</p>
      {u.comment && <><h3 className="h3">Decision comment · {u.decidedBy}, {fmtDate(u.decidedOn)}</h3><p className="memo">{u.comment}</p></>}
      {u.status === 'Pending' && c.access.canEditInc && pos && (
        <>
          <Field label="Comment (required to reject)" wide><textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} /></Field>
          {a.err && <div className="err">{a.err}</div>}
          <div className="row">
            <button className="btn pri" disabled={a.busy} onClick={async () => { if (await a.run(() => decideIncumbentUpdate(c.provider, u, pos, true, comment, actor))) onDone(`${u.updateId} applied to ${pos.positionId}.`) }}>Apply</button>
            <button className="btn" disabled={a.busy} onClick={async () => { if (await a.run(() => decideIncumbentUpdate(c.provider, u, pos, false, comment, actor))) onDone(`${u.updateId} rejected.`) }}>Reject</button>
          </div>
        </>
      )}
    </Modal>
  )
}

function NewUpdate({ c, choices, onClose, onDone }: { c: Ctx; choices: Position[]; onClose: () => void; onDone: (m: string) => void }) {
  const [posId, setPosId] = useState('')
  const [type, setType] = useState<UpdateType>('Fill')
  const [name, setName] = useState(''); const [email, setEmail] = useState('')
  const [eff, setEff] = useState(''); const [reason, setReason] = useState('')
  const a = useAction()
  const p = choices.find((x) => x.id === posId)
  const types: UpdateType[] = p ? (p.status === 'Vacant' ? ['Fill'] : ['Change incumbent', 'Vacate']) : ['Fill', 'Change incumbent', 'Vacate']
  return (
    <Modal title="Request an incumbent update" onClose={onClose}>
      <div className="formgrid">
        <Field label="Position" wide><select value={posId} onChange={(e) => { const x = choices.find((y) => y.id === e.target.value); setPosId(e.target.value); setType(x ? (x.status === 'Vacant' ? 'Fill' : 'Change incumbent') : 'Fill') }}>
          <option value="">Choose…</option>{choices.map((x) => <option key={x.id} value={x.id}>{x.positionId} · {x.title} · {x.status === 'Vacant' ? 'Vacant' : x.incumbent}</option>)}</select></Field>
        <Field label="Update type"><select value={type} onChange={(e) => setType(e.target.value as UpdateType)}>{types.map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Effective date"><input type="date" value={eff} onChange={(e) => setEff(e.target.value)} /></Field>
        {type !== 'Vacate' && <><Field label="New incumbent name"><input value={name} onChange={(e) => setName(e.target.value)} /></Field><Field label="Sign-in email"><input value={email} onChange={(e) => setEmail(e.target.value)} /></Field></>}
        <Field label="Reason" wide><textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      </div>
      {a.err && <div className="err">{a.err}</div>}
      <div className="row">
        <button className="btn pri" disabled={a.busy} onClick={async () => { if (!p) { a.setErr('Choose a position.'); return } if (await a.run(() => submitIncumbentUpdate(c.provider, p, { type, name, email, effective: eff || null, reason }, { name: c.user.name, email: c.user.email }))) onDone('Update request submitted.') }}>Submit</button>
        <button className="btn" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  )
}
