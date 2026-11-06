import { useMemo, useState } from 'react'
import { PRIORITIES, type FundingStatus, type HiringAction, type Priority, type Stage } from '@/data/types'
import { ADVANCE_STAGES, PRIORITY_RANK, effectivePriority, recordDetail, setApprovedPriority, setEntryOnDuty, setFunding, setStage, submitSelection, today } from '@/data/services'
import { Field, Modal, PriorityTag, Tag, daysSince, fmtDate, useAction, useLoad, type Ctx } from '@/ui/kit'

const STAGE_TONE: Record<Stage, 'info' | 'warn' | 'ok' | 'mute'> = {
  Draft: 'mute', 'PMC review': 'mute', 'Cleared to advertise': 'info', Announced: 'info', 'Certificate issued': 'info',
  Interviews: 'warn', 'Selection approval': 'warn', 'Selection approved': 'ok', Offer: 'ok',
}

export default function Vacancies(c: Ctx) {
  const { data, reload } = useLoad(async () => {
    const [h, d] = await Promise.all([c.provider.listHiringActions(c.areaId), c.provider.listDetails(c.areaId)])
    return { h, d }
  }, [c.areaId, c.positions], { h: [] as HiringAction[], d: [] })
  const [q, setQ] = useState('')
  const [stage, setStageFilter] = useState('All stages')
  const [prio, setPrio] = useState('All priorities')
  const [selId, setSelId] = useState<string | null>(null)
  const pos = (id: string) => c.positions.find((p) => p.id === id)
  const rows = useMemo(() => data.h.filter((h) => {
    const p = pos(h.positionId)
    return (stage === 'All stages' || h.stage === stage) && (prio === 'All priorities' || effectivePriority(h) === prio) && (!q || `${h.actionId} ${p?.title} ${p?.unitName} ${h.candidate}`.toLowerCase().includes(q.toLowerCase()))
  }).sort((a, b) => (PRIORITY_RANK[effectivePriority(a) ?? 'Low'] - PRIORITY_RANK[effectivePriority(b) ?? 'Low']) || (pos(a.positionId)?.vacantSince ?? '').localeCompare(pos(b.positionId)?.vacantSince ?? '')), [data.h, q, stage, prio, c.positions]) // eslint-disable-line react-hooks/exhaustive-deps
  const sel = data.h.find((h) => h.id === selId) ?? null
  const detailedIn = (positionId: string) => data.d.filter((d) => d.homePositionId === positionId).map((d) => pos(d.detailedToId)?.incumbent).filter(Boolean)
  const withoutAction = c.positions.filter((p) => p.status === 'Vacant' && !data.h.some((h) => h.positionId === p.id && h.stage !== 'Offer'))
  async function changed(msg: string) { await reload(); await c.reload(); c.notify(msg) }

  return (
    <div className="page">
      <div className="filters">
        <input className="search" placeholder="Search action, position, unit or candidate" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={stage} onChange={(e) => setStageFilter(e.target.value)}>{['All stages', 'Cleared to advertise', 'Announced', 'Certificate issued', 'Interviews', 'Selection approval', 'Selection approved', 'Offer'].map((s) => <option key={s}>{s}</option>)}</select>
        <select value={prio} onChange={(e) => setPrio(e.target.value)}>{['All priorities', ...PRIORITIES].map((s) => <option key={s}>{s}</option>)}</select>
        <span className="mute">{rows.length} hiring actions · {withoutAction.length} vacancies not yet cleared</span>
      </div>
      <div className="tablewrap">
        <table>
          <thead><tr><th>Priority</th><th>Action</th><th>Position</th><th>Unit</th><th>Grade</th><th>Stage</th><th>Candidate</th><th>Vacant</th><th>Funding</th><th>Detail</th></tr></thead>
          <tbody>
            {rows.map((h) => { const p = pos(h.positionId); const dt = detailedIn(h.positionId); return (
              <tr key={h.id} tabIndex={0} className={selId === h.id ? 'sel' : ''} onClick={() => setSelId(h.id)} onKeyDown={(e) => e.key === 'Enter' && setSelId(h.id)}>
                <td><PriorityTag approved={h.approvedPriority} requested={h.requestedPriority} /></td><td className="mono">{h.actionId}</td><td>{p?.title}</td><td>{p?.unitName}</td><td>{p ? `${p.payPlan}-${p.grade}` : ''}</td>
                <td><Tag tone={STAGE_TONE[h.stage]}>{h.stage}</Tag></td><td>{h.candidate || '—'}</td>
                <td>{p?.status === 'Vacant' ? `${daysSince(p.vacantSince)} d` : '—'}</td><td>{p?.status === 'Vacant' ? p.fundingStatus : '—'}</td>
                <td>{dt.length ? <Tag tone="info">Detailed in: {dt.join(', ')}</Tag> : ''}</td>
              </tr>) })}
            {!rows.length && <tr><td colSpan={10} className="empty">No hiring actions yet. Clear a PMC request to open one.</td></tr>}
          </tbody>
        </table>
      </div>
      {sel && pos(sel.positionId) && <ActionModal c={c} h={sel} details={data.d.filter((d) => d.homePositionId === sel.positionId)} onClose={() => setSelId(null)} onChanged={changed} />}
    </div>
  )
}

function ActionModal({ c, h, details, onClose, onChanged }: { c: Ctx; h: HiringAction; details: { id: string; detailedToId: string }[]; onClose: () => void; onChanged: (m: string) => Promise<void> }) {
  const p = c.positions.find((x) => x.id === h.positionId)!
  const actor = { name: c.user.name, email: c.user.email }
  const a = useAction()
  const [stage, setStageV] = useState<Stage>(h.stage)
  const [cand, setCand] = useState(h.candidate); const [grade, setGrade] = useState(h.proposedGrade || `${p.payPlan}-${p.grade} Step 1`)
  const [eod, setEod] = useState(h.entryOnDuty ?? today())
  const [detTo, setDetTo] = useState('')
  const [candEmail, setCandEmail] = useState('')
  const editable = c.access.canEditHiring
  const boss = c.positions.find((x) => x.id === p.supervisorId)
  const advance = ADVANCE_STAGES.includes(h.stage)

  return (
    <Modal title={`${h.actionId} · ${p.title}`} onClose={onClose}>
      <dl className="grid">
        <div><dt>Position</dt><dd>{p.positionId} · {p.unitName}</dd></div>
        <div><dt>Grade</dt><dd>{p.payPlan}-{p.grade} · {p.employmentType}</dd></div>
        <div><dt>Stage</dt><dd>{h.stage}</dd></div>
        <div><dt>Reports to</dt><dd>{boss?.title ?? '—'}</dd></div>
        {h.candidate && <div><dt>Selected candidate</dt><dd>{h.candidate} · {h.proposedGrade}</dd></div>}
        {h.entryOnDuty && <div><dt>Entry on duty</dt><dd>{fmtDate(h.entryOnDuty)}</dd></div>}
      </dl>
      {a.err && <div className="err top">{a.err}</div>}

      <div className="blk"><h3 className="h3">Hiring priority</h3>
        <div className="row">
          <span>Requested: <PriorityTag approved={null} requested={h.requestedPriority} plain /></span>
          <select value={h.approvedPriority ?? ''} disabled={!c.access.canPMC || a.busy} onChange={async (e) => { const v = e.target.value as Priority; if (await a.run(() => setApprovedPriority(c.provider, h, v, actor))) await onChanged(`${h.actionId} priority: ${v}.`) }}>
            <option value="" disabled>Approved: not set</option>{PRIORITIES.map((x) => <option key={x}>{x}</option>)}
          </select>
          {!c.access.canPMC && <span className="mute small">PMC members, chiefs and data administrators set the approved priority.</span>}
        </div>
        {h.priorityBy && h.approvedPriority && <p className="mute small">Set by {h.priorityBy}.</p>}
      </div>

      {p.status === 'Vacant' && (
        <div className="blk"><h3 className="h3">Funding</h3>
          <div className="row">
            <select value={p.fundingStatus} disabled={!c.access.canFund || a.busy} onChange={async (e) => { const v = e.target.value as FundingStatus; if (await a.run(() => setFunding(c.provider, p, v))) await onChanged(`Funding for ${p.positionId}: ${v}.`) }}>
              {['Approved', 'Pending', 'Not approved'].map((f) => <option key={f}>{f}</option>)}
            </select>
            {!c.access.canFund && <span className="mute small">Only Budget or a data administrator can change funding.</span>}
          </div>
        </div>
      )}

      {advance && editable && (
        <div className="blk"><h3 className="h3">Stage</h3>
          <div className="row">
            <select value={stage} onChange={(e) => setStageV(e.target.value as Stage)}>{ADVANCE_STAGES.map((s) => <option key={s}>{s}</option>)}</select>
            <button className="btn" disabled={a.busy || stage === h.stage} onClick={async () => { if (await a.run(() => setStage(c.provider, h, stage, actor))) await onChanged(`${h.actionId} is now ${stage}.`) }}>Update stage</button>
          </div>
        </div>
      )}

      {h.stage === 'Interviews' && editable && (
        <div className="blk"><h3 className="h3">Submit selection</h3>
          <div className="formgrid">
            <Field label="Selected candidate"><input value={cand} onChange={(e) => setCand(e.target.value)} /></Field>
            <Field label="Grade and step (for example GS-12 Step 3)"><input value={grade} onChange={(e) => setGrade(e.target.value)} /></Field>
          </div>
          <button className="btn pri" disabled={a.busy} onClick={async () => { if (await a.run(() => submitSelection(c.provider, h, p, c.positions, cand, grade, actor))) { await onChanged(`${h.actionId} routed for approval.`); onClose() } }}>Route for approval</button>
        </div>
      )}

      {h.stage === 'Selection approval' && <p className="mute top">Waiting on approvals. Track the steps on the Selection Approvals tab.</p>}

      {(h.stage === 'Selection approved' || h.stage === 'Offer') && editable && (
        <div className="blk"><h3 className="h3">Entry on duty</h3>
          <div className="formgrid"><Field label="Entry on duty date"><input type="date" value={eod} onChange={(e) => setEod(e.target.value)} /></Field><Field label="Candidate sign-in email"><input value={candEmail} onChange={(e) => setCandEmail(e.target.value)} /></Field></div>
          <div className="row">
            <button className="btn pri" disabled={a.busy} onClick={async () => { let filled = false; if (await a.run(async () => { filled = (await setEntryOnDuty(c.provider, h, p, eod, candEmail, actor)).filled })) { await onChanged(filled ? `${p.positionId} is now filled by ${h.candidate}.` : `Entry on duty set for ${fmtDate(eod)}.`); if (filled) onClose() } }}>Set entry on duty</button></div>
          <p className="mute small">A date today or earlier fills the position now. A later date is applied when it arrives.</p>
        </div>
      )}

      {p.status === 'Vacant' && c.access.canDetail && (
        <div className="blk"><h3 className="h3">Detail</h3>
          {details.map((d) => <div key={d.id} className="row between"><span>{c.positions.find((x) => x.id === d.detailedToId)?.incumbent || d.detailedToId} is detailed in</span>
            <button className="btn small" disabled={a.busy} onClick={async () => { if (await a.run(() => c.provider.deleteDetail(d.id))) await onChanged('Detail removed.') }}>Remove</button></div>)}
          <div className="row"><select value={detTo} onChange={(e) => setDetTo(e.target.value)}><option value="">Detail a person in…</option>
            {c.positions.filter((x) => x.status === 'Filled' && x.id !== p.id).map((x) => <option key={x.id} value={x.id}>{x.incumbent} · {x.title}</option>)}</select>
            <button className="btn" disabled={a.busy || !detTo} onClick={async () => { if (await a.run(() => recordDetail(c.provider, p.id, detTo, p.areaId, actor))) { setDetTo(''); await onChanged('Detail recorded.') } }}>Record</button></div>
        </div>
      )}
    </Modal>
  )
}
