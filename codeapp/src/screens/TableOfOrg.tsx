import { useMemo, useState } from 'react'
import type { Position, Unit } from '@/data/types'

interface Props { positions: Position[]; units: Unit[]; selectedId: string | null; onSelect: (id: string) => void }
const daysSince = (iso: string | null) => (iso ? Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86400000)) : 0)

export default function TableOfOrg({ positions, units, selectedId, onSelect }: Props) {
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<'All' | 'Filled' | 'Vacant'>('All')
  const [unit, setUnit] = useState('All units')
  const rows = useMemo(() => positions.filter((p) =>
    (status === 'All' || p.status === status) &&
    (unit === 'All units' || p.unitName === unit) &&
    (!q || `${p.positionId} ${p.title} ${p.incumbent}`.toLowerCase().includes(q.toLowerCase()))
  ).sort((a, b) => a.positionId.localeCompare(b.positionId)), [positions, q, status, unit])
  const unitNames = ['All units', ...Array.from(new Set([...units.map((u) => u.name), ...positions.map((p) => p.unitName)])).sort()]

  return (
    <div className="page">
      <div className="filters">
        <input className="search" placeholder="Search position, title or person" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={unit} onChange={(e) => setUnit(e.target.value)}>{unitNames.map((u) => <option key={u}>{u}</option>)}</select>
        <div className="seg" role="group" aria-label="Status">
          {(['All', 'Filled', 'Vacant'] as const).map((s) => <button key={s} className={status === s ? 'on' : ''} onClick={() => setStatus(s)}>{s}</button>)}
        </div>
        <span className="mute">{rows.length} of {positions.length} positions</span>
      </div>
      <div className="tablewrap">
        <table>
          <thead><tr><th>Position</th><th>Title</th><th>Incumbent</th><th>Unit</th><th>Grade</th><th>Type</th><th>Funding</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className={selectedId === p.id ? 'sel' : ''} onClick={() => onSelect(p.id)} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') onSelect(p.id) }}>
                <td className="mono">{p.positionId}</td>
                <td>{p.title}</td>
                <td>{p.status === 'Filled' ? p.incumbent : <span className="vacant-text">Vacant{p.previousIncumbent ? ` · was ${p.previousIncumbent}` : ''}</span>}</td>
                <td>{p.unitName}</td>
                <td>{p.payPlan}-{p.grade}</td>
                <td>{p.employmentType}</td>
                <td>{p.status === 'Vacant' ? p.fundingStatus : '—'}</td>
                <td><span className={`pill-s ${p.status === 'Vacant' ? 'vac' : 'fil'}`}>{p.status}{p.status === 'Vacant' && daysSince(p.vacantSince) ? ` · ${daysSince(p.vacantSince)} d` : ''}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
