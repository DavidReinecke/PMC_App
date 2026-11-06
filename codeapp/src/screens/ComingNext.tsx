export default function ComingNext({ title, note }: { title: string; note: string }) {
  return (
    <div className="page">
      <div className="coming"><h2>{title}</h2><p>{note}</p><p className="mute">This screen exists in the canvas app today. It is queued to be rebuilt here.</p></div>
    </div>
  )
}
