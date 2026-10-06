import { memo, useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { ImageIcon, FileVideo, Music4, Film } from 'lucide-react'
import { useStore, optionsFor, type ToolTab } from '../store'
import type { AudioOptions, ImageOptions, VideoOptions } from '@shared/types'
import { DropZone, MediaTypeCards } from './DropZone'
import { FileList } from './FileList'
import { RecentStrip } from './RecentStrip'
import { ToolCard, FormatChips, IMAGE_CHIPS, VIDEO_CHIPS, AUDIO_CHIPS } from './ToolCards'
import { ImagePanel, VideoPanel, AudioPanel, GifPanel } from './panels'
import { Range, Select } from './ui'

const RESOLUTIONS = [0, 2160, 1440, 1080, 720, 480].map(value => ({ value, label: value ? `${value}p` : 'Same as source' }))
const BITRATES = [96, 128, 192, 256, 320].map(value => ({ value, label: `${value} kbps${value === 320 ? ' (High Quality)' : ''}` }))

export const ConvertDashboard = memo(function ConvertDashboard({ dragging, onBrowse }: {
  dragging: boolean
  onBrowse: () => void
}) {
  const { tab, files, previews, history, converting, engine, byTab, options, setTab, patchTab, removeFile, clearFiles } = useStore(useShallow(s => ({
    tab: s.tab, files: s.files, previews: s.previews, history: s.history, converting: s.converting,
    engine: s.engine, byTab: s.byTab, options: s.options, setTab: s.setTab, patchTab: s.patchTab,
    removeFile: s.removeFile, clearFiles: s.clearFiles
  })))
  const counts = useMemo(() => {
    const result: Record<string, number> = {}
    for (const file of files) result[file.kind] = (result[file.kind] ?? 0) + 1
    return result
  }, [files])
  const resolve = (t: ToolTab) => byTab[t] ?? (tab === t ? options : optionsFor(t))
  const img = resolve('image') as { kind: 'image' } & ImageOptions
  const vid = resolve('video') as { kind: 'video' } & VideoOptions
  const aud = resolve('audio') as { kind: 'audio' } & AudioOptions
  const gif = resolve('gif') as { kind: 'gif' } & VideoOptions
  const change = (tool: ToolTab, patch: Record<string, unknown>) => { patchTab(tool, patch); setTab(tool) }
  const blocked = !engine?.ffmpeg.available

  return <div className="convert-dashboard">
    <header className="hero">
      <h1>Convert <span>Anything</span></h1>
      <p>Images <b>•</b> Videos <b>•</b> Audio <b>•</b> Fast <b>•</b> Private <b>•</b> Local</p>
    </header>
    <MediaTypeCards counts={counts} onPick={setTab} />
    <div className="conversion-workspace">
      <div className="tools-left">
        <ToolCard tab="image" title="Convert to Image" icon={ImageIcon} active={tab === 'image'} onFocus={setTab}
          primary={<>
            <FormatChips {...IMAGE_CHIPS} value={img.format} onChange={format => change('image', { format })} ariaLabel="Image output format" />
            <Range value={img.quality} min={10} max={100} onChange={quality => change('image', { quality })} label="Image quality" hint={`${img.quality}%`} />
          </>}
          details={<ImagePanel options={img} patch={p => change('image', p)} />} />
        <ToolCard tab="video" title="Convert to Video" icon={FileVideo} active={tab === 'video'} onFocus={setTab} blocked={blocked}
          primary={<>
            <FormatChips {...VIDEO_CHIPS} value={vid.format} onChange={format => change('video', { format })} ariaLabel="Video output format" />
            <label className="compact-field">Resolution<Select aria-label="Video resolution" value={vid.height ?? 0} onChange={e => change('video', { height: Number(e.target.value) || undefined })} options={RESOLUTIONS} /></label>
          </>}
          details={<VideoPanel options={vid} patch={p => change('video', p)} />} />
      </div>
      <div className="drop-center"><DropZone active={dragging} busy={converting} onBrowse={onBrowse} count={files.length} /></div>
      <div className="tools-right">
        <ToolCard tab="audio" title="Convert to Audio" icon={Music4} active={tab === 'audio'} onFocus={setTab} blocked={blocked}
          primary={<>
            <FormatChips {...AUDIO_CHIPS} value={aud.format} onChange={format => change('audio', { format })} ariaLabel="Audio output format" />
            <label className="compact-field stacked">Bitrate<Select aria-label="Audio bitrate" value={aud.bitrateKbps} onChange={e => change('audio', { bitrateKbps: Number(e.target.value) })} options={BITRATES} /></label>
          </>}
          details={<AudioPanel options={aud} patch={p => change('audio', p)} />} />
        <ToolCard tab="gif" title="Convert to GIF" icon={Film} active={tab === 'gif'} onFocus={setTab} blocked={blocked}
          primary={<>
            <Range value={gif.quality} min={10} max={100} onChange={quality => change('gif', { quality })} label="GIF quality" hint={`${gif.quality}%`} />
            <label className="compact-field stacked">Frame Rate<Select aria-label="GIF frame rate" value={gif.gifFps} onChange={e => change('gif', { gifFps: Number(e.target.value) })} options={[10, 15, 20, 30].map(value => ({ value, label: `${value} fps${value === 15 ? ' (Smooth)' : ''}` }))} /></label>
          </>}
          details={<GifPanel options={gif} patch={p => change('gif', p)} />} />
      </div>
    </div>
    <FileList files={files} previews={previews} onRemove={removeFile} onClear={clearFiles} />
    <RecentStrip history={history} previews={previews} />
  </div>
})
