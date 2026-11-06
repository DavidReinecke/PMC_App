import { useMemo, useState } from 'react'
import type { PayPlan, EmploymentType, PositionRequest, RequestType } from '@/data/types'
import { clearRequest, returnRequest, submitRequest, withdrawRequest, type RequestDraft } from '@/data/services'
import { Field, Modal, Stat, Tag, daysSince, fmtDate, useAction, useLoad, type Ctx } from '@/ui/kit'

const STATUS_TONE = { Submitted: 'info', Cleared: 'ok', Returned: 'warn', Withdrawn: 'mute' } as const
const blank: RequestDraft = { type: 'Advertise vacancy', positionId: null, unitId: null, proposedTitle: '', payPlan: 'GS', grade: 11, employmentType: 'Full time', justification: '', fundingSource: '' }

export default function PmcRequests(c: Ctx) {
  const { data: rows, reload } = useLoad(() => c.provider.listRequests(c.areaId), [c.areaId], [] as PositionRequest[])
  const [status, setStatus] = useState<'Open' | 'All'>('Open')
  const [sel, setSel] = useState<PositionRequest | null>(null)
  const [form, setForm] = useState<{ draft: RequestDraft; existing?: PositionRequest } | null>(null)
  const posName = (id: string | null) => { const p = c.positions.find((x) => x.id === id); return p ? `${p.positionId} · ${p.title}${p.unitName ? ` · ${p.unitName}` : ''}` : '—' }
  const shown = useMemo(() => rows.filter((r) => status === 'All' || r.status === 'Submitted' || r.status === 'Returned').sort((a, b) => b.requestDate.localeCompare(a.requestDate)), [rows, status])
  const sub = rows.filter((r) => r.status === 'Submitted')
  const oldest = sub.reduce((m, r) => Math.max(m, daysSince(r.requestDate)), 0)
  const mine = (r: PositionRequest) => r.requestedByEmail.toLowerCase() === c.user.email.toLowerCase()
  async function done(msg: string) { await reload(); await c.reload(); c.notify(msg); setSel(null); setForm(null) }

  return (
    <div className="page">
      <div className="stats-row">
        <Stat label="Waiting for PMC" value={sub.length} tone={sub.length ? 'warn' : undefined} />
        <Stat label="Oldest waiting (days)" value={oldest} />
        <Stat label="Returned to requester" value={rows.filter((r) => r.status === 'Returned').length} />
        <Stat label="Cleared" value={rows.filter((r) => r.status === 'Cleared').length} tone="ok" />
      </div>
      <div className="filters">
        <div className="seg">{(['Open', 'All'] as const).map((s) => <button key={s} className={status === s ? 'on' : ''} onClick={() => setStatus(s)}>{s}</button>)}</div>
        <span className="mute">{shown.length} requests</span>
        {c.access.canRequest && <button className="btn pri push" onClick={() => setForm({ draft: blank })}>New request</button>}
      </div>
      <div className="tablewrap">
        <table>
          <thead><tr><th>Request</th><th>Type</th><th>Position</th><th>Requested by</th><th>Date</th><th>Status</th></tr></thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} tabIndex={0} onClick={() => setSel(r)} onKeyDown={(e) => e.key === 'Enter' && setSel(r)}>
                <td className="mono">{r.requestId}</td><td>{r.type}</td>
                <td>{r.type === 'Add position' ? `New: ${r.proposedTitle}` : posName(r.positionId)}</td>
                <td>{r.requestedBy}</td><td>{fmtDate(r.requestDate)}</td><td><Tag tone={STATUS_TONE[r.status]}>{r.status}</Tag></td>
              </tr>
            ))}
            {!shown.length && <tr><td colSpan={6} className="empty">No requests to show.</td></tr>}
          </tbody>
        </table>
      </div>
      {sel && <Detail c={c} r={sel} mine={mine(sel)} posName={posName} onClose={() => setSel(null)} onDone={done} onEdit={() => { setForm({ existing: sel, draft: { type: sel.type, positionId: sel.positionId, unitId: sel.unitId, proposedTitle: sel.proposedTitle, payPlan: sel.payPlan, grade: sel.grade, employmentType: sel.employmentType, justification: sel.justification, fundingSource: sel.fundingSource } }); setSel(null) }} />}
      {form && <RequestForm c={c} init={form.draft} existing={form.existing} onClose={() => setForm(null)} onDone={done} />}
    </div>
  )
}

function Detail({ c, r, mine, posName, onClose, onDone, onEdit }: { c: Ctx; r: PositionRequest; mine: boolean; posName: (id: string | null) => string; onClose: () => void; onDone: (m: string) => void; onEdit: () => void }) {
  const [comment, setComment] = useState('')
  const a = useAction()
  const actor = { name: c.user.name, email: c.user.email }
  const open = r.status === 'Submitted'
  return (
    <Modal title={`${r.requestId} · ${r.type}`} onClose={onClose}>
      <dl className="grid">
        <div><dt>Status</dt><dd><Tag tone={STATUS_TONE[r.status]}>{r.status}</Tag></dd></div>
        <div><dt>Requested by</dt><dd>{r.requestedBy}<div className="mute small">{r.requestedByEmail}</div></dd></div>
        <div><dt>{r.type === 'Add position' ? 'Proposed title' : 'Position'}</dt><dd>{r.type === 'Add position' ? r.proposedTitle : posName(r.positionId)}</dd></div>
        {r.type === 'Add position' && <div><dt>Unit</dt><dd>{c.units.find((u) => u.id === r.unitId)?.name ?? '—'}</dd></div>}
        <div><dt>Grade</dt><dd>{r.payPlan}-{r.grade}</dd></div>
        <div><dt>Employment type</dt><dd>{r.employmentType}</dd></div>
        <div><dt>Funding source</dt><dd>{r.fundingSource}</dd></div>
        <div><dt>Date</dt><dd>{fmtDate(r.requestDate)}</dd></div>
      </dl>
      <h3 className="h3">Justification</h3><p className="memo">{r.justification}</p>
      {r.pmcComment && <><h3 className="h3">PMC comment{r.decidedBy ? ` · ${r.decidedBy}, ${fmtDate(r.decidedOn)}` : ''}</h3><p className="memo">{r.pmcComment}</p></>}
      {open && c.access.canPMC && (
        <>
          <Field label="PMC comment (required to return)" wide><textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} /></Field>
          {a.err && <div className="err">{a.err}</div>}
          <div className="row">
            <button className="btn pri" disabled={a.busy} onClick={async () => { if (await a.run(() => clearRequest(c.provider, r, comment, actor))) onDone(`${r.requestId} cleared. A hiring action was opened.`) }}>Clear</button>
            <button className="btn" disabled={a.busy} onClick={async () => { if (await a.run(() => returnRequest(c.provider, r, comment, actor))) onDone(`${r.requestId} returned to ${r.requestedBy}.`) }}>Return</button>
          </div>
        </>
      )}
      {(r.status === 'Submitted' || r.status === 'Returned') && mine && (
        <>
          {a.err && !c.access.canPMC && <div className="err">{a.err}</div>}
          <div className="row top">
            <button className="btn" onClick={onEdit}>{r.status === 'Returned' ? 'Edit and resubmit' : 'Edit'}</button>
            <button className="btn danger" disabled={a.busy} onClick={async () => { if (await a.run(() => withdrawRequest(c.provider, r))) onDone(`${r.requestId} withdrawn.`) }}>Withdraw</button>
          </div>
        </>
      )}
    </Modal>
  )
}

function RequestForm({ c, init, existing, onClose, onDone }: { c: Ctx; init: RequestDraft; existing?: PositionRequest; onClose: () => void; onDone: (m: string) => void }) {
  const [d, setD] = useState(init)
  const a = useAction()
  const set = <K extends keyof RequestDraft>(k: K, v: RequestDraft[K]) => setD((x) => ({ ...x, [k]: v }))
  const vacant = c.positions.filter((p) => p.status === 'Vacant').sort((x, y) => x.positionId.localeCompare(y.positionId))
  return (
    <Modal title={existing ? `Edit ${existing.requestId}` : 'New PMC request'} onClose={onClose}>
      <div className="formgrid">
        <Field label="Request type"><select value={d.type} disabled={!!existing} onChange={(e) => set('type', e.target.value as RequestType)}><option>Advertise vacancy</option><option>Add position</option></select></Field>
        {d.type === 'Advertise vacancy'
          ? <Field label="Vacant position"><select value={d.positionId ?? ''} onChange={(e) => { const p = vacant.find((x) => x.id === e.target.value); setD((x) => ({ ...x, positionId: e.target.value || null, ...(p ? { payPlan: p.payPlan, grade: p.grade, employmentType: p.employmentType } : {}) })) }}><option value="">Choose…</option>{vacant.map((p) => <option key={p.id} value={p.id}>{p.positionId} · {p.title} · {p.unitName}</option>)}</select></Field>
          : <>
              <Field label="Unit"><select value={d.unitId ?? ''} onChange={(e) => set('unitId', e.target.value || null)}><option value="">Choose…</option>{c.units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>
              <Field label="Proposed title" wide><input value={d.proposedTitle} onChange={(e) => set('proposedTitle', e.target.value)} /></Field>
            </>}
        <Field label="Pay plan"><select value={d.payPlan} onChange={(e) => set('payPlan', e.target.value as PayPlan)}><option>GS</option><option>GW</option><option>WG</option></select></Field>
        <Field label="Full performance grade"><input type="number" min={1} max={15} value={d.grade} onChange={(e) => set('grade', Number(e.target.value))} /></Field>
        <Field label="Employment type"><select value={d.employmentType} onChange={(e) => set('employmentType', e.target.value as EmploymentType)}><option>Full time</option><option>Career seasonal</option><option>Seasonal</option></select></Field>
        <Field label="Funding source"><input value={d.fundingSource} onChange={(e) => set('fundingSource', e.target.value)} /></Field>
        <Field label="Justification memo" wide><textarea rows={4} value={d.justification} onChange={(e) => set('justification', e.target.value)} /></Field>
      </div>
      {a.err && <div className="err">{a.err}</div>}
      <div className="row">
        <button className="btn pri" disabled={a.busy} onClick={async () => { if (await a.run(() => submitRequest(c.provider, c.areaId, d, { name: c.user.name, email: c.user.email }, existing))) onDone(existing ? 'Request resubmitted.' : 'Request submitted to the PMC.') }}>{existing ? 'Resubmit' : 'Submit'}</button>
        <button className="btn" onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  )
}
