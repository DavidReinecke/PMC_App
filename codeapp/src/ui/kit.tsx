import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { DataProvider } from '@/data/provider'
import type { Access } from '@/data/access'
import type { Person, Position, RoleAssignment, Unit } from '@/data/types'

/** What every screen receives from App. */
export interface Ctx {
  provider: DataProvider; areaId: string; user: Person; access: Access; roles: RoleAssignment[]
  positions: Position[]; units: Unit[]; reload: () => Promise<void>; notify: (msg: string) => void
}

/** Load data for a screen and reload it after a change. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[], initial: T) {
  const [data, setData] = useState<T>(initial)
  const [loading, setLoading] = useState(true)
  const fnRef = useRef(fn); fnRef.current = fn
  const reload = useCallback(async () => { setData(await fnRef.current()); setLoading(false) }, [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reload() }, deps)
  return { data, loading, reload }
}

/** Run an action, show its error in place, and report success. */
export function useAction() {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  async function run(fn: () => Promise<unknown>): Promise<boolean> {
    setBusy(true); setErr('')
    try { await fn(); return true }
    catch (e) { setErr(e instanceof Error ? e.message : 'That could not be saved.'); return false }
    finally { setBusy(false) }
  }
  return { busy, err, setErr, run }
}

export function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return <label className={'field' + (wide ? ' wide' : '')}><span>{label}</span>{children}</label>
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div className="scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="mh"><h2>{title}</h2><button className="ib" aria-label="Close" onClick={onClose}>×</button></div>
        <div className="mb">{children}</div>
      </div>
    </div>
  )
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: 'warn' | 'ok' }) {
  return <div className={'stat' + (tone ? ' ' + tone : '')}><div className="sv">{value}</div><div className="sl">{label}</div></div>
}

export function Tag({ tone, children }: { tone: 'ok' | 'warn' | 'bad' | 'info' | 'mute'; children: ReactNode }) {
  return <span className={'tag ' + tone}>{children}</span>
}

export const fmtDate = (iso: string | null) => (iso ? new Date(iso + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—')
export const money = (n: number) => n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
export const daysSince = (iso: string | null) => (iso ? Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86400000)) : 0)

export function PriorityTag({ approved, requested, plain }: { approved: string | null; requested: string | null; plain?: boolean }) {
  const v = approved ?? requested
  if (!v) return <span className="mute">Not rated</span>
  const tone = v === 'Critical' ? 'bad' : v === 'High' ? 'warn' : v === 'Medium' ? 'info' : 'mute'
  const differs = approved && requested && approved !== requested
  return <span title={differs ? `Requested as ${requested}` : approved ? 'Approved priority' : 'Requested priority, not yet approved'}><Tag tone={tone}>{v}{!approved && !plain ? ' (req.)' : ''}</Tag></span>
}
