import { useState } from 'react'
import type { HiringAction, SelectionStep } from '@/data/types'
import { canDecide, decideStep } from '@/data/services'
import { Tag, fmtDate, useAction, useLoad, type Ctx } from '@/ui/kit'

const TONE = { Waiting: 'mute', Pending: 'warn', Approved: 'ok', Returned: 'bad' } as const

export default function Approvals(c: Ctx) {
  const { data, reload } = useLoad(async () => {
    const [h, s] = await Promise.all([c.provider.listHiringActions(c.areaId), c.provider.listSteps(c.areaId)])
    return { h, s }
  }, [c.areaId], { h: [] as HiringAction[], s: [] as SelectionStep[] })
  const [mineOnly, setMineOnly] = useState(false)
  const actions = data.h.filter((h) => data.s.some((s) => s.actionId === h.id))
  const decidable = (s: SelectionStep) => canDecide(s, c.user.email, c.roles, c.access.isDA)
  const shown = actions.filter((h) => !mineOnly || data.s.some((s) => s.actionId === h.id && decidable(s)))
  const waiting = data.s.filter(decidable).length
  async function changed(msg: string) { await reload(); await c.reload(); c.notify(msg) }

  return (
    <div className="page">
      <div className="filters">
        <div className="seg">{[false, true].map((v) => <button key={String(v)} className={mineOnly === v ? 'on' : ''} onClick={() => setMineOnly(v)}>{v ? `Waiting on me (${waiting})` : 'All selections'}</button>)}</div>
        <span className="mute">{shown.length} selections</span>
      </div>
      {shown.map((h) => <Card key={h.id} c={c} h={h} steps={data.s.filter((s) => s.actionId === h.id)} decidable={decidable} onChanged={changed} />)}
      {!shown.length && <div className="coming"><p className="mute">No selections to show.</p></div>}
    </div>
  )
}

function Card({ c, h, steps, decidable, onChanged }: { c: Ctx; h: HiringAction; steps: SelectionStep[]; decidable: (s: SelectionStep) => boolean; onChanged: (m: string) => Promise<void> }) {
  const p = c.positions.find((x) => x.id === h.positionId)
  const latest = steps.reduce((m, s) => Math.max(m, s.round), 1)
  const cur = steps.filter((s) => s.round === latest).sort((a, b) => a.sequence - b.sequence)
  const older = steps.filter((s) => s.round < latest).sort((a, b) => a.round - b.round || a.sequence - b.sequence)
  const [comment, setComment] = useState('')
  const a = useAction()
  const actor = { name: c.user.name, email: c.user.email }
  const mine = cur.find(decidable)
  return (
    <section className="card">
      <div className="ch">
        <div><h2>{p?.title} <span className="mute">· {p?.unitName}</span></h2><div className="mute">{h.actionId} · {h.candidate} · {h.proposedGrade} · round {latest}</div></div>
        <Tag tone={h.stage === 'Selection approved' ? 'ok' : h.stage === 'Interviews' ? 'bad' : 'warn'}>{h.stage === 'Interviews' ? 'Returned to hiring' : h.stage}</Tag>
      </div>
      <ol className="steps">
        {cur.map((s) => (
          <li key={s.id} className={'step ' + s.decision.toLowerCase()}>
            <div className="sn">{s.sequence}</div>
            <div className="sb"><b>{s.group}</b><div className="mute small">{s.decision === 'Waiting' ? 'Not yet routed' : s.decision === 'Pending' ? 'Waiting on decision' : `${s.decision} by ${s.decidedBy}, ${fmtDate(s.decidedOn)}`}</div>
              {s.comment && <div className="small memo">“{s.comment}”</div>}</div>
            <Tag tone={TONE[s.decision]}>{s.decision}</Tag>
          </li>
        ))}
      </ol>
      {mine && (
        <div className="blk">
          <label className="field wide"><span>Comment for step {mine.sequence} ({mine.group}). Required to return.</span><textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} /></label>
          {a.err && <div className="err">{a.err}</div>}
          <div className="row">
            <button className="btn pri" disabled={a.busy} onClick={async () => { if (await a.run(() => decideStep(c.provider, mine, true, comment, actor))) { setComment(''); await onChanged(`Step ${mine.sequence} approved.`) } }}>Approve</button>
            <button className="btn" disabled={a.busy} onClick={async () => { if (await a.run(() => decideStep(c.provider, mine, false, comment, actor))) { setComment(''); await onChanged('Selection returned.') } }}>Return</button>
          </div>
        </div>
      )}
      {older.length > 0 && (
        <details className="hist"><summary>Earlier rounds ({older.length} steps)</summary>
          {older.map((s) => <div key={s.id} className="small mute">Round {s.round} · step {s.sequence} {s.group}: {s.decision}{s.decidedBy ? ` by ${s.decidedBy}` : ''}{s.comment ? ` — “${s.comment}”` : ''}</div>)}
        </details>
      )}
    </section>
  )
}
