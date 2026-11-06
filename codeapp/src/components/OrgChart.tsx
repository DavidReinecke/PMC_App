import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { Position } from '@/data/types'
import { NH, NW, buildTree, computeLayout, linkPaths } from './orgLayout'

interface Props { positions: Position[]; unitNames: string[]; selectedId: string | null; onSelect: (id: string | null) => void }
interface View { s: number; x: number; y: number }

function daysSince(iso: string | null) {
  if (!iso) return 0
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86400000))
}
const initials = (name: string) => name.split(' ').map((w) => w[0]).slice(0, 2).join('')

const ALL_UNITS = 'All units'
const UNIT_TOP = '__unit_top__'

/**
 * One unit's chart. The unit's top positions usually report to someone outside the unit, so that supervisor is added
 * as a dimmed context card at the top. If the unit's top positions report to different people, a plain "unit" card
 * stands in as the root instead.
 */
function scopeToUnit(all: Position[], unit: string): { positions: Position[]; ctx: Set<string> } {
  if (unit === ALL_UNITS) return { positions: all, ctx: new Set() }
  const inUnit = all.filter((p) => p.unitName === unit)
  const ids = new Set(inUnit.map((p) => p.id))
  const outside = [...new Set(inUnit.filter((p) => p.supervisorId && !ids.has(p.supervisorId)).map((p) => p.supervisorId!))]
  const tops = inUnit.filter((p) => !p.supervisorId || !ids.has(p.supervisorId))
  if (outside.length === 1 && tops.every((p) => p.supervisorId === outside[0])) {
    const boss = all.find((p) => p.id === outside[0])
    if (boss) return { positions: [{ ...boss, supervisorId: null }, ...inUnit], ctx: new Set([boss.id]) }
  }
  if (tops.length > 1) {
    const stub: Position = { ...inUnit[0], id: UNIT_TOP, positionId: '', title: unit, incumbent: 'Top positions in this unit', incumbentEmail: '', status: 'Filled', supervisorId: null, previousIncumbent: '', vacantSince: null }
    return { positions: [stub, ...inUnit.map((p) => (tops.includes(p) ? { ...p, supervisorId: UNIT_TOP } : p))], ctx: new Set([UNIT_TOP]) }
  }
  return { positions: inUnit, ctx: new Set() }
}

export default function OrgChart({ positions: allPositions, unitNames, selectedId, onSelect }: Props) {
  const [unit, setUnit] = useState(ALL_UNITS)
  const { positions, ctx } = useMemo(() => scopeToUnit(allPositions, unit), [allPositions, unit])
  const { byId, kids, roots } = useMemo(() => buildTree(positions), [positions])
  const rootId = roots[0]
  const [open, setOpen] = useState<Set<string>>(() => new Set())
  const [view, setView] = useState<View>({ s: 1, x: 0, y: 0 })
  const [animate, setAnimate] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null)

  const openToDepth = useCallback((depth: number) => {
    const next = new Set<string>()
    const walk = (id: string, d: number) => { if (d < depth) { next.add(id); (kids.get(id) ?? []).forEach((k) => walk(k, d + 1)) } }
    if (rootId) walk(rootId, 0)
    setOpen(next)
  }, [kids, rootId])

  // Open the first two levels when data first arrives
  useEffect(() => { if (rootId) openToDepth(2) }, [rootId, openToDepth])

  const layout = useMemo(() => (rootId ? computeLayout(rootId, kids, open) : null), [rootId, kids, open])
  const onPath = useMemo(() => {
    const s = new Set<string>(); let id: string | null = selectedId
    while (id) { s.add(id); id = byId.get(id)?.supervisorId ?? null }
    return s
  }, [selectedId, byId])

  const fit = useCallback((anim = true) => {
    if (!layout || !box.current) return
    const r = box.current.getBoundingClientRect(), pad = 40
    const s = Math.max(0.25, Math.min(1, (r.width - pad * 2) / layout.w, (r.height - pad * 2) / layout.h))
    setAnimate(anim)
    setView({ s, x: (r.width - layout.w * s) / 2, y: Math.max(pad, (r.height - layout.h * s) / 2) })
  }, [layout])

  const focusOn = useCallback((id: string, scale?: number) => {
    if (!layout || !box.current || !layout.pos[id]) return
    const r = box.current.getBoundingClientRect(), q = layout.pos[id]
    setAnimate(true)
    setView((v) => { const s = scale ?? v.s; return { s, x: r.width / 2 - (q.x + NW / 2) * s, y: r.height / 3 - (q.y + NH / 2) * s } })
  }, [layout])

  // First fit, then keep the chart fitted when the window changes size
  const fitted = useRef(false)
  useLayoutEffect(() => { if (layout && !fitted.current) { fitted.current = true; fit(false) } }, [layout, fit])
  useEffect(() => { const f = () => fit(false); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f) }, [fit])

  // Reveal the selected position: open its supervisors, then centre on it
  const lastFocus = useRef<string | null>(null)
  useEffect(() => {
    if (!selectedId || selectedId === lastFocus.current) return
    lastFocus.current = selectedId
    let id = byId.get(selectedId)?.supervisorId ?? null, changed = false
    const next = new Set(open)
    while (id) { if (!next.has(id)) { next.add(id); changed = true } id = byId.get(id)?.supervisorId ?? null }
    if (changed) setOpen(next)
    const t = setTimeout(() => focusOn(selectedId, Math.max(view.s, 0.7)), 0)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  if (!layout) return <div className="empty-state">No positions yet.</div>
  const paths = linkPaths(layout, onPath)

  const zoomAt = (f: number, cx: number, cy: number) => setView((v) => {
    const s = Math.min(1.6, Math.max(0.2, v.s * f)), k = s / v.s
    setAnimate(false)
    return { s, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k }
  })
  const center = () => { const r = box.current!.getBoundingClientRect(); return [r.width / 2, r.height / 2] as const }

  const toggle = (id: string) => setOpen((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const visibleCount = Object.keys(layout.pos).length
  const counted = positions.filter((p) => !ctx.has(p.id))
  const vacant = counted.filter((p) => p.status === 'Vacant').length

  return (
    <div className="chart-wrap">
      <div className="chart-bar">
        <label className="inl">Unit <select value={unit} onChange={(e) => setUnit(e.target.value)}>{[ALL_UNITS, ...unitNames].map((u) => <option key={u}>{u}</option>)}</select></label>
        <button className="btn" onClick={() => { openToDepth(99) ; setTimeout(() => fit(true), 0) }}>Expand all</button>
        <button className="btn" onClick={() => { openToDepth(2); setTimeout(() => fit(true), 0) }}>Collapse to 2 levels</button>
        <button className="btn" onClick={() => fit(true)}>Fit to screen</button>
        <div className="stats">
          <span>Positions <b>{counted.length}</b></span><span>Filled <b>{counted.length - vacant}</b></span>
          <span className="v">Vacant <b>{vacant}</b></span><span>Showing <b>{visibleCount}</b></span>
        </div>
      </div>
      <div
        ref={box}
        className={'chart-view' + (drag.current ? ' drag' : '')}
        onPointerDown={(e) => { if ((e.target as HTMLElement).closest('.node,.tog,.zoom,.legend')) return; drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y }; e.currentTarget.setPointerCapture(e.pointerId) }}
        onPointerMove={(e) => { const d = drag.current; if (d) { setAnimate(false); setView((v) => ({ ...v, x: d.vx + e.clientX - d.x, y: d.vy + e.clientY - d.y })) } }}
        onPointerUp={() => { drag.current = null }}
        onPointerCancel={() => { drag.current = null }}
        onWheel={(e) => { const r = e.currentTarget.getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1.1 : 1 / 1.1, e.clientX - r.left, e.clientY - r.top) }}
      >
        <div className="hint">Click a position for details · drag to pan · scroll to zoom</div>
        <div className={'world' + (animate ? ' anim' : '')} style={{ transform: `translate(${view.x}px,${view.y}px) scale(${view.s})` }}>
          <svg className="links" width={layout.w} height={layout.h}>
            {paths.map((p, i) => <path key={i} d={p.d} className={p.on ? 'on' : ''} />)}
          </svg>
          {Object.entries(layout.pos).map(([id, q]) => {
            const p = byId.get(id)!, vac = p.status === 'Vacant', nk = (kids.get(id) ?? []).length
            const days = vac ? daysSince(p.vacantSince) : 0
            return (
              <div key={id}>
                <button
                  type="button"
                  className={`node ${vac ? 'vac' : 'fil'}${selectedId === id ? ' sel' : ''}${ctx.has(id) ? ' ctx' : ''}`}
                  style={{ left: q.x, top: q.y }}
                  aria-label={`${p.title}, ${vac ? 'vacant' : p.incumbent}`}
                  onClick={() => onSelect(id)}
                >
                  <div className="rail">{vac ? '!' : initials(p.incumbent)}</div>
                  <div className="body">
                    <div className="t">{p.title}</div>
                    <div className="who">{vac ? 'Vacant' : p.incumbent}{p.unitName && p.unitName !== 'Area Office' ? ` · ${p.unitName}` : ''}</div>
                    <div className="chips">
                      <span className="chip">{p.payPlan}-{p.grade}</span>
                      {vac && days > 0 && <span className="days">{days} d</span>}
                      {nk > 0 && <span className="mng">Manages {nk}</span>}
                    </div>
                  </div>
                </button>
                {nk > 0 && (
                  <button type="button" className="tog" style={{ left: q.x + NW / 2 - 12, top: q.y + NH - 12 }}
                    aria-label={`${open.has(id) ? 'Collapse' : 'Expand'} ${p.title}`} onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => { e.stopPropagation(); toggle(id) }}>{open.has(id) ? '−' : '+'}</button>
                )}
              </div>
            )
          })}
        </div>
        <div className="zoom">
          <button aria-label="Zoom in" onClick={() => zoomAt(1.2, ...center())}>+</button>
          <span>{Math.round(view.s * 100)}%</span>
          <button aria-label="Zoom out" onClick={() => zoomAt(1 / 1.2, ...center())}>−</button>
        </div>
        <div className="legend">
          <span><i className="g" />Filled</span><span><i className="r" />Vacant</span><span><i className="b" />Reporting line to selection</span>
        </div>
      </div>
    </div>
  )
}
