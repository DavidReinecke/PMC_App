import { useMemo, useState } from 'react'
import type { PayRate } from '@/data/types'
import { laborFor } from '@/data/services'
import { Field, Stat, Tag, money, useAction, useLoad, type Ctx } from '@/ui/kit'

export default function Labor(c: Ctx) {
  const { data, reload, loading } = useLoad(async () => {
    const [r, l] = await Promise.all([c.provider.listPayRates(), c.provider.listLaborSettings()])
    return { r, l }
  }, [c.areaId], { r: [] as PayRate[], l: [] })
  const premium = data.l.find((l) => l.areaId === c.areaId)?.premium ?? 32
  const [scope, setScope] = useState<'All' | 'Filled' | 'Vacant'>('All')
  const [draft, setDraft] = useState<string | null>(null)
  const a = useAction()
  const canEdit = c.access.isDA || c.access.isBudget

  const rows = useMemo(() => c.positions.filter((p) => scope === 'All' || p.status === scope).map((p) => ({ p, ...laborFor(p, data.r, premium) })), [c.positions, scope, data.r, premium])
  const byUnit = useMemo(() => {
    const m = new Map<string, { n: number; total: number; missing: number }>()
    for (const r of rows) { const e = m.get(r.p.unitName) ?? { n: 0, total: 0, missing: 0 }; e.n++; e.total += r.total; if (!r.found) e.missing++; m.set(r.p.unitName, e) }
    return [...m.entries()].sort((x, y) => y[1].total - x[1].total)
  }, [rows])
  const total = rows.reduce((s, r) => s + r.total, 0)
  const missing = rows.filter((r) => !r.found)
  const vacTotal = c.positions.filter((p) => p.status === 'Vacant').reduce((s, p) => s + laborFor(p, data.r, premium).total, 0)
  const max = Math.max(1, ...byUnit.map(([, v]) => v.total))

  if (loading) return <div className="page"><p className="mute">Loading pay rates…</p></div>
  return (
    <div className="page">
      <div className="stats-row">
        <Stat label={`Annual estimate (${scope.toLowerCase()})`} value={money(total)} />
        <Stat label="Vacant positions" value={money(vacTotal)} />
        <Stat label="Positions priced" value={`${rows.length - missing.length} of ${rows.length}`} />
        <Stat label="Premium on base pay" value={`${premium}%`} />
      </div>
      <div className="filters">
        <div className="seg">{(['All', 'Filled', 'Vacant'] as const).map((s) => <button key={s} className={scope === s ? 'on' : ''} onClick={() => setScope(s)}>{s}</button>)}</div>
        {canEdit && (
          <span className="row"><Field label="Premium %"><input type="number" min={0} max={100} value={draft ?? premium} onChange={(e) => setDraft(e.target.value)} style={{ width: 90 }} /></Field>
            <button className="btn" disabled={a.busy || draft === null} onClick={async () => { const v = Number(draft); if (!(v >= 0 && v <= 100)) { a.setErr('Enter a percent from 0 to 100.'); return } if (await a.run(() => c.provider.saveLaborSetting(c.areaId, v))) { setDraft(null); await reload(); c.notify(`Premium set to ${v}%.`) } }}>Save</button></span>
        )}
        {a.err && <span className="err">{a.err}</span>}
      </div>
      {missing.length > 0 && <div className="note">{missing.length} positions have no step 5 rate in the Pay Rates table ({[...new Set(missing.map((m) => `${m.p.payPlan}-${m.p.grade}`))].join(', ')}). They count as $0 until rates are loaded.</div>}
      <div className="split">
        <div className="tablewrap"><table><thead><tr><th>Unit</th><th>Positions</th><th>Estimate</th><th /></tr></thead><tbody>
          {byUnit.map(([u, v]) => <tr key={u}><td>{u}</td><td>{v.n}</td><td>{money(v.total)}</td><td className="barcell"><i style={{ width: `${(v.total / max) * 100}%` }} /></td></tr>)}
        </tbody></table></div>
        <div className="tablewrap"><table><thead><tr><th>Position</th><th>Grade</th><th>Base</th><th>With premium</th></tr></thead><tbody>
          {rows.sort((x, y) => y.total - x.total).map((r) => <tr key={r.p.id}><td>{r.p.positionId} · {r.p.title} <span className="mute">{r.p.unitName}</span></td><td>{r.p.payPlan}-{r.p.grade}</td><td>{r.found ? money(r.base) : <Tag tone="warn">No rate</Tag>}</td><td>{r.found ? money(r.total) : '—'}</td></tr>)}
        </tbody></table></div>
      </div>
    </div>
  )
}
