import type { ReactNode } from 'react'
import { RotateCw, FlipHorizontal2, FlipVertical2, Sparkles } from 'lucide-react'
import { Chip, Field, NumberInput, Range, Select, Toggle } from './ui'
import type { AspectMode, AudioOptions, ConversionOptions, ImageOptions, TrimOptions, VideoOptions } from '@shared/types'
import { AUDIO_FORMATS, IMAGE_FORMATS, VIDEO_FORMATS } from '@shared/utils'

const ASPECTS: { value: AspectMode; label: string }[] = [
  { value: 'original', label: 'Original' },
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '4:3', label: '4:3' },
  { value: '1:1', label: '1:1' }
]

interface PanelProps {
  options: ConversionOptions
  patch: (p: Record<string, unknown>) => void
}

export function Row({
  label,
  hint,
  children
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[12.5px] font-medium text-[var(--text-strong)]">{label}</p>
        {hint ? <p className="truncate text-[11px] text-[var(--text-faint)]">{hint}</p> : null}
      </div>
      {children}
    </div>
  )
}

function AspectChips({
  aspect,
  onChange,
  scaleW,
  scaleH,
  onScale
}: {
  aspect: AspectMode
  onChange: (a: AspectMode) => void
  scaleW?: number
  scaleH?: number
  onScale: (w: number | undefined, h: number | undefined) => void
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        {ASPECTS.map((a) => (
          <Chip key={a.value} active={aspect === a.value} onClick={() => onChange(a.value)}>
            {a.label}
          </Chip>
        ))}
      </div>
      {aspect !== 'original' ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Width">
            <NumberInput value={scaleW} onChange={(v) => onScale(v, scaleH)} placeholder="auto" suffix="px" min={16} />
          </Field>
          <Field label="Height">
            <NumberInput value={scaleH} onChange={(v) => onScale(scaleW, v)} placeholder="auto" suffix="px" min={16} />
          </Field>
        </div>
      ) : null}
    </div>
  )
}

function TrimFields({ options, patch }: { options: TrimOptions; patch: PanelProps['patch'] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Trim start" hint="sec">
        <NumberInput value={options.trimStart} min={0} onChange={(v) => patch({ trimStart: v })} placeholder="0" />
      </Field>
      <Field label="Trim end" hint="sec">
        <NumberInput value={options.trimEnd} min={0} onChange={(v) => patch({ trimEnd: v })} placeholder="full" />
      </Field>
    </div>
  )
}

/* ------------------------------------------------------------------ Image */

export function ImagePanel({ options, patch }: PanelProps) {
  const o = options as ConversionOptions & ImageOptions
  const isLossless = o.format === 'png'

  return (
    <div className="flex flex-col gap-5">
      <Field label="Output format">
        <Select
          value={o.format}
          onChange={(e) => patch({ format: e.target.value })}
          options={IMAGE_FORMATS.map((f) => ({ value: f, label: f.toUpperCase() }))}
        />
      </Field>

      {!isLossless ? (
        <Field label="Quality" hint={`${o.quality}%`}>
          <Range value={o.quality} min={10} max={100} onChange={(v) => patch({ quality: v })} label="Image quality" />
        </Field>
      ) : (
        <p className="rounded-lg bg-[var(--surface-sunken)] px-3 py-2 text-[11.5px] leading-relaxed text-[var(--text-faint)]">
          PNG is lossless — quality does not apply.
        </p>
      )}

      <Field label="Dimensions">
        <AspectChips
          aspect={o.aspect}
          onChange={(a) => patch({ aspect: a })}
          scaleW={o.width}
          scaleH={o.height}
          onScale={(w, h) => patch({ width: w, height: h })}
        />
      </Field>

      {o.aspect !== 'original' ? (
        <Field label="Fit mode">
          <Select
            value={o.fit}
            onChange={(e) => patch({ fit: e.target.value })}
            options={[
              { value: 'cover', label: 'Cover — fill, may crop' },
              { value: 'contain', label: 'Contain — fit inside, letterbox' },
              { value: 'inside', label: 'Inside — shrink to fit' },
              { value: 'fill', label: 'Fill — stretch to edges' }
            ]}
          />
        </Field>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        <Chip active={o.rotate !== 0} onClick={() => patch({ rotate: o.rotate === 90 ? 180 : o.rotate + 90 })}>
          <span className="inline-flex items-center gap-1.5">
            <RotateCw size={13} /> Rotate {o.rotate}°
          </span>
        </Chip>
        <Chip active={o.flipH} onClick={() => patch({ flipH: !o.flipH })}>
          <span className="inline-flex items-center gap-1.5">
            <FlipHorizontal2 size={13} /> Flip H
          </span>
        </Chip>
        <Chip active={o.flipV} onClick={() => patch({ flipV: !o.flipV })}>
          <span className="inline-flex items-center gap-1.5">
            <FlipVertical2 size={13} /> Flip V
          </span>
        </Chip>
      </div>

      <div className="flex flex-col gap-3 rounded-xl bg-[var(--surface-sunken)] p-3">
        <Row label="Sharpen" hint="Crisp edges after heavy downscale">
          <Toggle checked={o.sharpen} onChange={(v) => patch({ sharpen: v })} label="Sharpen" />
        </Row>
        <Row label="Strip metadata" hint="Removes EXIF, GPS and camera data">
          <Toggle checked={o.stripMetadata} onChange={(v) => patch({ stripMetadata: v })} label="Strip metadata" />
        </Row>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ Video */

export function VideoPanel({ options, patch }: PanelProps) {
  const o = options as ConversionOptions & VideoOptions
  return (
    <div className="flex flex-col gap-5">
      <Field label="Container">
        <Select
          value={o.format}
          onChange={(e) => patch({ format: e.target.value })}
          options={VIDEO_FORMATS.filter((f) => f !== 'gif').map((f) => ({ value: f, label: f.toUpperCase() }))}
        />
      </Field>

      <Field label="Quality" hint={`CRF ${51 - Math.round((o.quality / 100) * 51)}`}>
        <Range value={o.quality} min={10} max={100} onChange={(v) => patch({ quality: v })} label="Video quality" />
      </Field>

      <Field label="Dimensions">
        <AspectChips
          aspect={o.aspect}
          onChange={(a) => patch({ aspect: a })}
          scaleW={o.width}
          scaleH={o.height}
          onScale={(w, h) => patch({ width: w, height: h })}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Frame rate" hint={o.fps === 0 ? 'Source' : undefined}>
          <Select
            value={o.fps}
            onChange={(e) => patch({ fps: Number(e.target.value) })}
            options={[
              { value: 0, label: 'Source' },
              { value: 24, label: '24 fps' },
              { value: 30, label: '30 fps' },
              { value: 60, label: '60 fps' }
            ]}
          />
        </Field>
        <Field label="Speed" hint={`${o.speed}×`}>
          <Range value={o.speed} min={0.25} max={4} step={0.25} onChange={(v) => patch({ speed: v })} label="Speed" />
        </Field>
      </div>

      <div className="flex flex-col gap-3 rounded-xl bg-[var(--surface-sunken)] p-3">
        <Row label="Mute audio">
          <Toggle checked={o.mute} onChange={(v) => patch({ mute: v })} label="Mute audio" />
        </Row>
      </div>

      {!o.mute ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Audio codec">
            <Select
              value={o.audioCodec}
              onChange={(e) => patch({ audioCodec: e.target.value })}
              options={[
                { value: 'aac', label: 'AAC' },
                { value: 'opus', label: 'Opus' },
                { value: 'mp3', label: 'MP3' },
                { value: 'none', label: 'None' }
              ]}
            />
          </Field>
          <Field label="Audio bitrate">
            <Select
              value={o.audioBitrateKbps}
              onChange={(e) => patch({ audioBitrateKbps: Number(e.target.value) })}
              options={[96, 128, 160, 192, 256, 320].map((v) => ({ value: v, label: `${v} kbps` }))}
            />
          </Field>
        </div>
      ) : null}

      <TrimFields options={o} patch={patch} />
    </div>
  )
}

/* -------------------------------------------------------------------- GIF */

export function GifPanel({ options, patch }: PanelProps) {
  const o = options as ConversionOptions & VideoOptions
  return (
    <div className="flex flex-col gap-5">
      <p className="flex items-start gap-2 rounded-xl bg-[color-mix(in_oklab,var(--color-teal-brand)_10%,transparent)] p-3 text-[11.5px] leading-relaxed text-[var(--text-muted)]">
        <Sparkles size={14} className="mt-px shrink-0 text-[var(--color-teal-brand)]" />
        GIF is palette-quantised. Width and frame rate dominate file size far more than quality.
      </p>

      <Field label="Width" hint="px">
        <Range value={o.gifWidth} min={160} max={960} step={20} onChange={(v) => patch({ gifWidth: v })} label="GIF width" />
      </Field>

      <Field label="Frame rate" hint={`${o.gifFps} fps`}>
        <Range value={o.gifFps} min={5} max={30} onChange={(v) => patch({ gifFps: v })} label="GIF frame rate" />
      </Field>

      <Field label="Speed" hint={`${o.speed}×`}>
        <Range value={o.speed} min={0.25} max={4} step={0.25} onChange={(v) => patch({ speed: v })} label="Speed" />
      </Field>

      <TrimFields options={o} patch={patch} />
    </div>
  )
}

/* ------------------------------------------------------------------ Audio */

export function AudioPanel({ options, patch }: PanelProps) {
  const o = options as ConversionOptions & AudioOptions
  const lossless = o.format === 'wav' || o.format === 'flac'
  return (
    <div className="flex flex-col gap-5">
      <Field label="Format">
        <Select
          value={o.format}
          onChange={(e) => patch({ format: e.target.value })}
          options={AUDIO_FORMATS.map((f) => ({ value: f, label: f.toUpperCase() }))}
        />
      </Field>

      {!lossless ? (
        <Field label="Bitrate" hint={`${o.bitrateKbps} kbps`}>
          <Range
            value={o.bitrateKbps}
            min={64}
            max={320}
            step={32}
            onChange={(v) => patch({ bitrateKbps: v })}
            label="Audio bitrate"
          />
        </Field>
      ) : (
        <p className="rounded-lg bg-[var(--surface-sunken)] px-3 py-2 text-[11.5px] leading-relaxed text-[var(--text-faint)]">
          {o.format.toUpperCase()} is lossless — bitrate does not apply.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Channels">
          <Select
            value={o.channels}
            onChange={(e) => patch({ channels: Number(e.target.value) })}
            options={[
              { value: 1, label: 'Mono' },
              { value: 2, label: 'Stereo' }
            ]}
          />
        </Field>
        <Field label="Sample rate">
          <Select
            value={o.sampleRate}
            onChange={(e) => patch({ sampleRate: Number(e.target.value) })}
            options={[
              { value: 44100, label: '44.1 kHz' },
              { value: 48000, label: '48 kHz' }
            ]}
          />
        </Field>
      </div>

      <div className="flex flex-col gap-3 rounded-xl bg-[var(--surface-sunken)] p-3">
        <Row label="Normalize loudness" hint="Targets −14 LUFS">
          <Toggle checked={o.normalize} onChange={(v) => patch({ normalize: v })} label="Normalize loudness" />
        </Row>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Fade in" hint="sec">
          <NumberInput value={o.fadeIn || undefined} min={0} onChange={(v) => patch({ fadeIn: v ?? 0 })} placeholder="0" />
        </Field>
        <Field label="Fade out" hint="sec">
          <NumberInput value={o.fadeOut || undefined} min={0} onChange={(v) => patch({ fadeOut: v ?? 0 })} placeholder="0" />
        </Field>
      </div>

      <TrimFields options={o} patch={patch} />
    </div>
  )
}
