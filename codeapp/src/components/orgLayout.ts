import type { Position } from '@/data/types'

export const NW = 250, NH = 96, GX = 22
const SP = 44, RG = 20, TOPGAP = 40
/** A supervisor with more than this many direct reports gets two columns with a line between them. */
export const SPLIT = 6

export interface Pt { x: number; y: number }
export type Link =
  | { kind: 'row'; pc: number; pb: number; bus: number; kids: { id: string; cx: number }[] }
  | { kind: 'cols'; spine: number; top: number; rows: { y: number; kids: { id: string; side: 'l' | 'r' }[] }[] }

export interface Layout { pos: Record<string, Pt>; links: Link[]; w: number; h: number }

interface Block { id: string; w: number; h: number; L: number; R: number; kind: 'leaf' | 'row' | 'cols'
  bl?: Block[]; tw?: number; rows?: Block[][]; rh?: number[]; c0?: number; c1?: number }

export function buildTree(positions: Position[]) {
  const byId = new Map(positions.map((p) => [p.id, p]))
  const kids = new Map<string, string[]>()
  positions.forEach((p) => kids.set(p.id, []))
  positions.forEach((p) => { if (p.supervisorId && byId.has(p.supervisorId)) kids.get(p.supervisorId)!.push(p.id) })
  kids.forEach((list) => list.sort((a, b) => byId.get(a)!.positionId.localeCompare(byId.get(b)!.positionId)))
  const roots = positions.filter((p) => !p.supervisorId || !byId.has(p.supervisorId)).map((p) => p.id)
  return { byId, kids, roots }
}

export function computeLayout(rootId: string, kids: Map<string, string[]>, open: Set<string>): Layout {
  const pos: Record<string, Pt> = {}
  const links: Link[] = []
  const visible = (id: string) => (open.has(id) ? kids.get(id) ?? [] : [])

  function build(id: string): Block {
    const ks = visible(id)
    if (!ks.length) return { id, w: NW, h: NH, L: NW / 2, R: NW / 2, kind: 'leaf' }
    const bl = ks.map(build)
    if (ks.length <= SPLIT) {
      const tw = bl.reduce((a, b) => a + b.w, 0) + (bl.length - 1) * GX
      const w = Math.max(NW, tw)
      return { id, kind: 'row', w, h: NH + TOPGAP + Math.max(...bl.map((b) => b.h)), L: w / 2, R: w / 2, bl, tw }
    }
    const rows: Block[][] = []
    for (let i = 0; i < bl.length; i += 2) rows.push(bl.slice(i, i + 2))
    let c0 = 0, c1 = 0
    rows.forEach((r) => { c0 = Math.max(c0, r[0].w); if (r[1]) c1 = Math.max(c1, r[1].w) })
    const rh = rows.map((r) => Math.max(r[0].h, r[1]?.h ?? 0))
    const L = Math.max(NW / 2, c0 + SP / 2), R = Math.max(NW / 2, c1 + SP / 2)
    return { id, kind: 'cols', w: L + R, h: NH + TOPGAP + rh.reduce((a, b) => a + b, 0) + (rows.length - 1) * RG, L, R, rows, rh, c0, c1 }
  }

  function place(b: Block, x0: number, y0: number) {
    const spine = x0 + b.L
    pos[b.id] = { x: spine - NW / 2, y: y0 }
    if (b.kind === 'row') {
      let rx = x0 + (b.w - b.tw!) / 2
      const ry = y0 + NH + TOPGAP
      b.bl!.forEach((k) => { place(k, rx, ry); rx += k.w + GX })
      links.push({ kind: 'row', pc: spine, pb: y0 + NH, bus: y0 + NH + TOPGAP / 2, kids: b.bl!.map((k) => ({ id: k.id, cx: pos[k.id].x + NW / 2 })) })
    } else if (b.kind === 'cols') {
      let y = y0 + NH + TOPGAP
      const rows: { y: number; kids: { id: string; side: 'l' | 'r' }[] }[] = []
      b.rows!.forEach((r, ri) => {
        const kidsInRow: { id: string; side: 'l' | 'r' }[] = []
        place(r[0], spine - SP / 2 - r[0].w, y); kidsInRow.push({ id: r[0].id, side: 'l' })
        if (r[1]) { place(r[1], spine + SP / 2, y); kidsInRow.push({ id: r[1].id, side: 'r' }) }
        rows.push({ y: y + NH / 2, kids: kidsInRow })
        y += b.rh![ri] + RG
      })
      links.push({ kind: 'cols', spine, top: y0 + NH, rows })
    }
  }

  const root = build(rootId)
  place(root, 0, 0)
  return { pos, links, w: root.w, h: root.h }
}

/** SVG path data for every connector. Highlighted paths trace the line from the top to one selected position. */
export function linkPaths(layout: Layout, onPath: Set<string>): { d: string; on: boolean }[] {
  const out: { d: string; on: boolean }[] = []
  const hi: { d: string; on: boolean }[] = []
  for (const L of layout.links) {
    if (L.kind === 'row') {
      const xs = [...L.kids.map((k) => k.cx), L.pc]
      out.push({ d: `M${L.pc} ${L.pb}V${L.bus}`, on: false }, { d: `M${Math.min(...xs)} ${L.bus}H${Math.max(...xs)}`, on: false })
      for (const k of L.kids) {
        const top = layout.pos[k.id].y
        out.push({ d: `M${k.cx} ${L.bus}V${top}`, on: false })
        if (onPath.has(k.id)) hi.push({ d: `M${L.pc} ${L.pb}V${L.bus}H${k.cx}V${top}`, on: true })
      }
    } else {
      const last = L.rows[L.rows.length - 1].y
      out.push({ d: `M${L.spine} ${L.top}V${last}`, on: false })
      for (const R of L.rows) for (const k of R.kids) {
        const q = layout.pos[k.id], ex = k.side === 'l' ? q.x + NW : q.x
        out.push({ d: `M${L.spine} ${R.y}H${ex}`, on: false })
        if (onPath.has(k.id)) hi.push({ d: `M${L.spine} ${L.top}V${R.y}H${ex}`, on: true })
      }
    }
  }
  return [...out, ...hi]
}
