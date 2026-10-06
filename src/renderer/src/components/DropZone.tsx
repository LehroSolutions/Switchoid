import { CloudUpload, Loader2, ImageIcon, FileVideo, Music4, Play } from 'lucide-react'
import type { MediaKind } from '@shared/types'
import mediaArt from '../assets/media-art.webp'

export function DropZone({ active, busy, onBrowse, count }: {
  active: boolean; busy: boolean; onBrowse: () => void; count: number
}) {
  return <div className="drop-zone">
    <button type="button" onClick={onBrowse} aria-label="Drop files here, or browse to choose files"
      className={`orb ${active ? 'orb-dragging' : ''}`}>
      <span className="orb-orbit" aria-hidden="true" />
      <span className="orb-content">
        {busy ? <Loader2 className="upload-icon animate-spin" /> : <CloudUpload className="upload-icon" strokeWidth={1.6} />}
        <strong>{active ? 'Release to add' : count ? `${count} file${count === 1 ? '' : 's'} staged` : 'Drop files here'}</strong>
        <span>or click to browse</span>
      </span>
    </button>
  </div>
}

const cards = [
  { kind: 'image' as const, label: 'Images', detail: 'PNG, JPG, WEBP, BMP, TIFF, AVIF', icon: ImageIcon },
  { kind: 'video' as const, label: 'Video', detail: 'MP4, MOV, MKV, AVI, WEBM, GIF', icon: FileVideo },
  { kind: 'audio' as const, label: 'Audio', detail: 'MP3, WAV, FLAC, AAC, OGG, M4A', icon: Music4 }
]

export function MediaTypeCards({ counts, onPick }: { counts: Record<string, number>; onPick: (kind: MediaKind) => void }) {
  return <div className="media-cards">
    {cards.map(({ kind, label, detail, icon: Icon }, i) => <button key={kind} type="button" onClick={() => onPick(kind)} className={`media-card media-${kind}`}>
      <span className="media-art" style={{ backgroundImage: `url(${mediaArt})`, backgroundPosition: `${i * 50}% center` }} aria-hidden="true" />
      {kind === 'video' && <span className="media-play" aria-hidden="true"><Play size={25} fill="currentColor" /></span>}
      <span className="media-caption"><span className="media-icon"><Icon size={30} /></span><span><strong>{label}{counts[kind] ? <small>{counts[kind]}</small> : null}</strong><span className="media-detail">{detail}</span></span></span>
    </button>)}
  </div>
}
