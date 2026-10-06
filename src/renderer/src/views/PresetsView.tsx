import { useState } from 'react'
import { Sparkles, Trash2, Wand2 } from 'lucide-react'
import { useStore } from '../store'
import { Button, EmptyState, TextInput } from '../components/ui'
import type { Preset } from '@shared/types'

/** Presets view: apply, create and remove reusable conversion setups. */
export function PresetsView({ onApply }: { onApply: (p: Preset) => void }) {
  const { presets, setPresets, options } = useStore()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  const saveCurrent = async () => {
    const label = name.trim()
    if (!label) return
    setBusy(true)
    try {
      const next = await window.switchoid.savePreset({
        id: `user-${Date.now().toString(36)}`,
        name: label,
        hint: `${options.kind} → ${options.format.toUpperCase()}`,
        kind: options.kind,
        options
      })
      setPresets(next)
      setName('')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: string) => {
    setPresets(await window.switchoid.deletePreset(id))
  }

  return (
    <div className="mx-auto flex max-w-[980px] flex-col gap-5 px-8 pb-10 pt-24">
      <header>
        <h2 className="text-[20px] font-semibold tracking-[-0.01em] text-[var(--text-strong)]">Presets</h2>
        <p className="mt-1 text-[13px] text-[var(--text-muted)]">
          Save the current settings ({options.kind} → {options.format.toUpperCase()}) as a reusable preset.
        </p>
      </header>

      <section className="panel flex items-end gap-3 p-4">
        <div className="flex-1">
          <label
            htmlFor="preset-name"
            className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[var(--text-faint)]"
          >
            Preset name
          </label>
          <TextInput
            id="preset-name"
            value={name}
            placeholder="e.g. Reels · 1080×1920 H.264"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void saveCurrent()
            }}
            className="mt-2"
          />
        </div>
        <Button variant="primary" onClick={saveCurrent} disabled={!name.trim() || busy}>
          Save preset
        </Button>
      </section>

      {presets.length ? (
        <div className="grid grid-cols-2 gap-3">
          {presets.map((p) => (
            <article key={p.id} className="panel flex flex-col gap-3 p-4">
              <div className="flex items-start gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[color-mix(in_oklab,var(--color-violet-brand)_14%,transparent)] text-[var(--color-violet-brand)]">
                  <Sparkles size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[13px] font-semibold text-[var(--text-strong)]">{p.name}</h3>
                  <p className="truncate text-[11px] text-[var(--text-faint)]">{p.hint}</p>
                </div>
                {!p.builtin ? (
                  <button
                    onClick={() => void remove(p.id)}
                    aria-label={`Delete preset ${p.name}`}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[var(--text-faint)] transition-colors hover:bg-[color-mix(in_oklab,var(--color-rose-brand)_14%,transparent)] hover:text-[var(--color-rose-brand)]"
                  >
                    <Trash2 size={13} />
                  </button>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-md bg-[var(--glass-inset)] px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                  {p.options.format}
                </span>
                <span className="rounded-md bg-[var(--glass-inset)] px-2 py-0.5 text-[10.5px] font-medium text-[var(--text-muted)]">
                  Q{p.options.quality}
                </span>
                {p.builtin ? (
                  <span className="rounded-md bg-[color-mix(in_oklab,var(--color-teal-brand)_12%,transparent)] px-2 py-0.5 text-[10.5px] font-medium text-[var(--color-teal-brand)]">
                    Built-in
                  </span>
                ) : null}
              </div>
              <Button size="sm" onClick={() => onApply(p)}>
                <Wand2 size={13} />
                Use preset
              </Button>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Sparkles size={20} />}
          title="No presets yet"
          body="Save your first preset above, or head back to Convert and tune the settings you use most."
        />
      )}
    </div>
  )
}