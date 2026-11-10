import { useState } from 'react'
import { loadDemoData, removeDemoData } from '@/data/demo'
import { useAction, type Ctx } from '@/ui/kit'

export default function Demo(c: Ctx) {
  const a = useAction()
  const [msg, setMsg] = useState('')
  const demoCount = c.positions.filter((p) => p.positionId.startsWith('DEMO-')).length
  return (
    <div className="page">
      <h2>Demo data</h2>
      <p>Fills PMC Requests, Incumbents, Vacancies &amp; Hiring and Selection Approvals with made-up examples so you can walk a colleague through the app.
        Everything it creates has an ID that starts with <b>DEMO-</b> and it never changes your real positions. Remove it when you are done.</p>
      <ul className="mute">
        <li>13 demo positions (10 vacant, 3 filled) spread across the units in this area.</li>
        <li>6 PMC requests: submitted, returned with a comment, cleared, withdrawn, and one new position.</li>
        <li>6 hiring actions at different stages, with 3 selections in approval (the first approval step is assigned to you).</li>
        <li>5 incumbent updates: pending, applied and rejected.</li>
      </ul>
      <p className="mute">Demo positions also show on the org chart, Tables of Organization and Labor Estimate until you remove them. Tell your audience they are examples.</p>
      {a.err && <div className="err">{a.err}</div>}
      {msg && <div className="mute">{msg}</div>}
      <div className="row">
        <button className="btn pri" disabled={a.busy} onClick={async () => {
          setMsg('')
          let out = ''
          if (await a.run(async () => { out = await loadDemoData(c.provider, c.areaId, c.units, c.positions, { name: c.user.name, email: c.user.email }) })) { setMsg(out); await c.reload(); c.notify('Demo data loaded.') }
        }}>{demoCount ? 'Reload demo data' : 'Load demo data'}</button>
        <button className="btn" disabled={a.busy || !demoCount} onClick={async () => {
          if (!window.confirm('Remove all demo data from this area? Your real data is not touched.')) return
          setMsg('')
          let n = 0
          if (await a.run(async () => { n = await removeDemoData(c.provider, c.areaId) })) { setMsg(`Removed ${n} demo rows.`); await c.reload(); c.notify('Demo data removed.') }
        }}>Remove demo data</button>
      </div>
      {a.busy && <p className="mute">Working. This takes up to a minute against Dataverse.</p>}
    </div>
  )
}
