import { useMemo, useState } from 'react'
import type { PayRate, Position } from '@/data/types'
import { DEFAULT_LABOR, costPosition, setSplit, validateAssumptions, type LaborAssumptions, type PositionCost } from '@/data/services'
import { Field, Stat, Tag, money, useAction, useLoad, type Ctx } from '@/ui/kit'

const ALL = 'Entire Geographic Area'
type Row = { p: Position; c: PositionCost; state: 'counted' | 'unfunded' | 'excluded' }
const paren = (n: number) => `(${money(n)})`

export default function Labor(c: Ctx) {
  const { data, reload, loading } = useLoad(async () => {
    const [r, l] = await Promise.all([c.provider.listPayRates(), c.provider.listLaborSettings()])
    return { r, l }
  }, [c.areaId], { r: [] as PayRate[], l: [] })
  const saved = data.l.find((l) => l.areaId === c.areaId)
  const A: LaborAssumptions = saved ?? DEFAULT_LABOR
  const [scope, setScope] = useState(ALL)
  const [incl, setIncl] = useState<'funded' | 'filled'>('funded')
  const [draft, setDraft] = useState<Record<keyof LaborAssumptions, string> | null>(null)
  const [showTables, setShowTables] = useState(false)
  const a = useAction()
  const canEdit = c.access.isDA || c.access.isBudget

  const all = useMemo<Row[]>(() => c.positions.map((p) => {
    const cost = costPosition(p, data.r, A)
    const state: Row['state'] = !cost.funded ? 'unfunded' : p.status === 'Vacant' && incl === 'filled' ? 'excluded' : 'counted'
    return { p, c: cost, state }
  }), [c.positions, data.r, A.premium, A.payStep, A.tempPercent, A.defaultPrep, incl]) // eslint-disable-line react-hooks/exhaustive-deps

  const units = useMemo(() => [...new Set(c.positions.map((p) => p.unitName))].sort((x, y) => (x === 'Area Office' ? -1 : y === 'Area Office' ? 1 : x.localeCompare(y))), [c.positions])
  const scoped = useMemo(() => all.filter((r) => scope === ALL || r.p.unitName === scope), [all, scope])
  const sum = (rows: Row[], f: (r: Row) => number) => rows.filter((r) => r.state === 'counted').reduce((s, r) => s + f(r), 0)
  const total = sum(scoped, (r) => r.c.total), prep = sum(scoped, (r) => r.c.prepCost), fuels = sum(scoped, (r) => r.c.fuelsCost)
  const byUnit = units.map((u) => { const rows = all.filter((r) => r.p.unitName === u); return { u, n: rows.filter((r) => r.state === 'counted').length, total: sum(rows, (r) => r.c.total), prep: sum(rows, (r) => r.c.prepCost), fuels: sum(rows, (r) => r.c.fuelsCost) } })
  const grand = { total: byUnit.reduce((s, x) => s + x.total, 0), prep: byUnit.reduce((s, x) => s + x.prep, 0), fuels: byUnit.reduce((s, x) => s + x.fuels, 0), n: byUnit.reduce((s, x) => s + x.n, 0) }
  const missing = scoped.filter((r) => r.state === 'counted' && !r.c.found)
  const pct = (n: number) => (total ? `${((n / total) * 100).toFixed(1)}%` : '0.0%')
  const max = Math.max(1, ...byUnit.map((x) => x.total))

  if (loading) return <div className="page"><p className="mute">Loading pay rates…</p></div>

  const form = draft ?? { premium: String(A.premium), payStep: String(A.payStep), tempPercent: String(A.tempPercent), defaultPrep: String(A.defaultPrep) }
  async function saveAssumptions() {
    const next: LaborAssumptions = { premium: Number(form.premium), payStep: Number(form.payStep), tempPercent: Number(form.tempPercent), defaultPrep: Number(form.defaultPrep) }
    if (await a.run(async () => { validateAssumptions(next); await c.provider.saveLaborSetting(c.areaId, next) })) { setDraft(null); await reload(); c.notify('Labor assumptions saved.') }
  }
  async function saveRow(p: Position, patch: { prepPercent?: number | null; premiumOverride?: number | null }) {
    if (await a.run(() => setSplit(c.provider, p, patch))) await c.reload()
  }
  function exportCsv() {
    const head = ['Position', 'Title', 'Unit', 'Status', 'Funding', 'Employment type', 'Grade', 'Counted', 'Salary', 'Premium %', 'Total cost', 'Preparedness %', 'Fuels %', 'Preparedness cost', 'Fuels cost']
    const lines = scoped.map((r) => [r.p.positionId, r.p.title, r.p.unitName, r.p.status, r.p.status === 'Vacant' ? r.p.fundingStatus : '', r.p.employmentType, `${r.p.payPlan}-${r.p.grade}`, r.state === 'counted' ? 'Yes' : 'No', r.c.salary, r.c.premiumPct, r.c.total, r.c.prepPct, r.c.fuelsPct, r.c.prepCost, r.c.fuelsCost])
    const csv = [head, ...lines].map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const el = document.createElement('a'); el.href = url; el.download = `labor-estimate-${scope.replace(/\W+/g, '-').toLowerCase()}.csv`; el.click(); URL.revokeObjectURL(url)
  }

  return (
    <div className="page">
      <div className="filters">
        <label className="inl">Show costs for <select value={scope} onChange={(e) => setScope(e.target.value)}>{[ALL, ...units].map((u) => <option key={u}>{u}</option>)}</select></label>
        <label className="inl">Positions included <select value={incl} onChange={(e) => setIncl(e.target.value as 'funded' | 'filled')}>
          <option value="funded">Filled and funded vacant</option><option value="filled">Filled only</option></select></label>
        <button className="btn push" onClick={exportCsv}>Export CSV</button>
      </div>

      <div className="stats-row">
        <Stat label={`Total cost incl. premium · ${scope}`} value={money(total)} />
        <Stat label={`Preparedness · ${pct(prep)}`} value={money(prep)} />
        <Stat label={`Fuels · ${pct(fuels)}`} value={money(fuels)} />
        <Stat label="Positions counted" value={scoped.filter((r) => r.state === 'counted').length} />
      </div>
      <div className="splitbar" aria-label="Preparedness and Fuels share of total"><i className="pp" style={{ width: pct(prep) }} /><i className="ff" style={{ width: pct(fuels) }} /></div>
      <div className="legend2"><span><i className="pp" /> Preparedness</span><span><i className="ff" /> Fuels</span></div>

      <details className="assump" open={canEdit}>
        <summary>Assumptions · {A.premium}% premium · step {A.payStep} · temp at {A.tempPercent}% · default {A.defaultPrep}% Preparedness</summary>
        {canEdit ? (
          <div className="formgrid4">
            <Field label="Premium %"><input type="number" min={0} max={100} value={form.premium} onChange={(e) => setDraft({ ...form, premium: e.target.value })} /></Field>
            <Field label="Pay step"><input type="number" min={1} max={10} value={form.payStep} onChange={(e) => setDraft({ ...form, payStep: e.target.value })} /></Field>
            <Field label="Temp (seasonal) % of annual"><input type="number" min={1} max={100} value={form.tempPercent} onChange={(e) => setDraft({ ...form, tempPercent: e.target.value })} /></Field>
            <Field label="Default Preparedness %"><input type="number" min={0} max={100} value={form.defaultPrep} onChange={(e) => setDraft({ ...form, defaultPrep: e.target.value })} /></Field>
            <div className="row"><button className="btn pri" disabled={a.busy || draft === null} onClick={saveAssumptions}>Save assumptions</button></div>
          </div>
        ) : <p className="mute small">Only Budget or a data administrator can change these.</p>}
      </details>
      {a.err && <div className="err">{a.err}</div>}
      {missing.length > 0 && <div className="note">{missing.length} counted positions have no step {A.payStep} rate in the Pay Rates table ({[...new Set(missing.map((m) => `${m.p.payPlan}-${m.p.grade}`))].join(', ')}). They count as $0 until rates are loaded.</div>}

      <h3 className="h3">By unit</h3>
      <div className="tablewrap"><table>
        <thead><tr><th>Unit</th><th className="num">Positions</th><th className="num">Preparedness</th><th className="num">Fuels</th><th className="num">Total</th><th /></tr></thead>
        <tbody>
          {byUnit.map((x) => (
            <tr key={x.u} className={scope === x.u ? 'sel' : ''} tabIndex={0} onClick={() => setScope(scope === x.u ? ALL : x.u)} onKeyDown={(e) => e.key === 'Enter' && setScope(scope === x.u ? ALL : x.u)}>
              <td>{x.u}</td><td className="num">{x.n}</td><td className="num">{money(x.prep)}</td><td className="num">{money(x.fuels)}</td><td className="num">{money(x.total)}</td>
              <td className="barcell"><i style={{ width: `${(x.total / max) * 100}%` }} /></td>
            </tr>
          ))}
          <tr className="totrow"><td>All units</td><td className="num">{grand.n}</td><td className="num">{money(grand.prep)}</td><td className="num">{money(grand.fuels)}</td><td className="num">{money(grand.total)}</td><td /></tr>
        </tbody>
      </table></div>

      <h3 className="h3">Roster costs · {scope}</h3>
      <p className="mute small">Unfunded vacancies show in red parentheses and are left out of every total. {canEdit ? 'Edit Preparedness % or Premium % in a row; Fuels % always fills in the rest so the two total 100%. Clear a field to use the default.' : 'Only Budget or a data administrator can edit the split.'}</p>
      <div className="tablewrap"><table className="roster">
        <thead><tr><th>Position</th><th>Status</th><th>Grade</th><th className="num">Salary</th><th className="num">Premium %</th><th className="num">Total cost</th><th className="num">Preparedness %</th><th className="num">Fuels %</th><th className="num">Preparedness $</th><th className="num">Fuels $</th></tr></thead>
        <tbody>
          {[...scoped].sort((x, y) => x.p.positionId.localeCompare(y.p.positionId)).map(({ p, c: k, state }) => {
            const money_ = (n: number) => (!k.found ? '—' : state === 'unfunded' ? paren(n) : money(n))
            return (
              <tr key={p.id} className={state}>
                <td>{p.positionId} · {p.title}<div className="mute small">{p.unitName}{p.employmentType === 'Seasonal' ? ' · seasonal' : ''}</div></td>
                <td>{p.status === 'Filled' ? <Tag tone="ok">Filled</Tag> : <Tag tone={p.fundingStatus === 'Approved' ? 'info' : 'bad'}>Vacant · {p.fundingStatus}</Tag>}</td>
                <td>{p.payPlan}-{p.grade}</td>
                <td className="num">{k.found ? money_(k.salary) : <Tag tone="warn">No rate</Tag>}</td>
                <td className="num"><Pct canEdit={canEdit && !a.busy} value={p.premiumOverride ?? null} shown={k.premiumPct} onSave={(v) => saveRow(p, { premiumOverride: v })} /></td>
                <td className="num">{money_(k.total)}</td>
                <td className="num"><Pct canEdit={canEdit && !a.busy} value={p.prepPercent ?? null} shown={k.prepPct} onSave={(v) => saveRow(p, { prepPercent: v })} /></td>
                <td className="num">{k.fuelsPct}%</td>
                <td className="num">{money_(k.prepCost)}</td><td className="num">{money_(k.fuelsCost)}</td>
              </tr>
            )
          })}
        </tbody>
      </table></div>

      <button className="btn small top" onClick={() => setShowTables(!showTables)}>{showTables ? 'Hide' : 'Show'} pay tables</button>
      {showTables && <PayTables rates={data.r} step={A.payStep} />}
    </div>
  )
}

/** A percent box. Blank means "use the default". Saves when you leave the box. */
function Pct({ value, shown, canEdit, onSave }: { value: number | null; shown: number; canEdit: boolean; onSave: (v: number | null) => void }) {
  const [txt, setTxt] = useState<string | null>(null)
  if (!canEdit) return <span className={value === null ? 'mute' : ''}>{shown}%</span>
  const commit = () => {
    if (txt === null) return
    const t = txt.trim(), v = t === '' ? null : Number(t)
    setTxt(null)
    if (v !== null && !Number.isFinite(v)) return
    if (v !== value) onSave(v)
  }
  return <input className={'pctbox' + (value === null ? ' dflt' : '')} inputMode="decimal" aria-label="Percent" value={txt ?? (value === null ? '' : String(value))} placeholder={String(shown)}
    onChange={(e) => setTxt(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} />
}

function PayTables({ rates, step }: { rates: PayRate[]; step: number }) {
  const year = new Date().getFullYear()
  const rows = rates.filter((r) => r.step === step && r.year <= year).sort((x, y) => x.plan.localeCompare(y.plan) || x.grade - y.grade)
  return (
    <div className="tablewrap top"><table><thead><tr><th>Pay plan</th><th>Grade</th><th>Step</th><th className="num">Annual rate</th><th>Year</th><th>Wage area</th></tr></thead>
      <tbody>{rows.map((r) => <tr key={`${r.plan}${r.grade}${r.step}${r.year}`}><td>{r.plan}</td><td>{r.grade}</td><td>{r.step}</td><td className="num">{money(r.rate)}</td><td>{r.year}</td><td>{r.wageArea}</td></tr>)}
        {!rows.length && <tr><td colSpan={6} className="empty">No rates at step {step}.</td></tr>}</tbody></table></div>
  )
}
