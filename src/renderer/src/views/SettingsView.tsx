import { FolderOpen, Terminal, Info } from 'lucide-react'
import { useStore } from '../store'
import { Button, Field, Select, Toggle } from '../components/ui'
import { Row } from '../components/panels'

export function SettingsView() {
  const { settings, setSettings, engine } = useStore()
  if (!settings) return null

  const patch = async (p: Partial<typeof settings>) => setSettings(await window.switchoid.saveSettings(p))
  const ff = engine?.ffmpeg

  const chooseDir = async () => {
    const dir = await window.switchoid.chooseOutputDir()
    if (dir) setSettings(await window.switchoid.saveSettings({ outputDir: dir }))
  }

  return (
    <div className="mx-auto flex max-w-[760px] flex-col gap-5 px-8 pb-10 pt-24">
      <header>
        <h2 className="text-[20px] font-semibold tracking-[-0.01em] text-[var(--text-strong)]">Settings</h2>
        <p className="mt-1 text-[13px] text-[var(--text-muted)]">Stored locally in your user data folder.</p>
      </header>

      <section className="panel flex flex-col gap-5 p-5">
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.09em] text-[var(--text-faint)]">
          Appearance
        </h3>
        <Field label="Theme">
          <Select
            value={settings.theme}
            onChange={(e) => void patch({ theme: e.target.value as 'light' | 'dark' | 'system' })}
            options={[
              { value: 'dark', label: 'Dark' },
              { value: 'light', label: 'Light' },
              { value: 'system', label: 'Match system' }
            ]}
          />
        </Field>
        <div className="flex flex-col gap-3 rounded-xl bg-[var(--glass-inset)] p-3">
          <Row label="Reduce motion" hint="Disables transitions and animated spinners">
            <Toggle
              checked={settings.reduceMotion}
              onChange={(v) => void patch({ reduceMotion: v })}
              label="Reduce motion"
            />
          </Row>
        </div>
      </section>
<section className="panel flex flex-col gap-5 p-5">
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.09em] text-[var(--text-faint)]">
          Conversion
        </h3>
        <Field label="Output folder">
          <div className="flex gap-2">
            <p className="flex-1 truncate rounded-xl bg-[var(--glass-inset)] px-3 py-2.5 text-[12.5px] text-[var(--text-muted)]">
              {settings.outputDir ?? 'Downloads/Switchoid (default)'}
            </p>
            <Button onClick={chooseDir}>
              <FolderOpen size={14} />
              Change
            </Button>
          </div>
        </Field>

        <Field label="Parallel jobs" hint={`${settings.parallelJobs} at a time`}>
          <Select
            value={settings.parallelJobs}
            onChange={(e) => void patch({ parallelJobs: Number(e.target.value) })}
            options={[1, 2, 3, 4, 6, 8].map((v) => ({ value: v, label: `${v} concurrent` }))}
          />
        </Field>

        <div className="flex flex-col gap-3 rounded-xl bg-[var(--glass-inset)] p-3">
          <Row label="Ask before overwrite" hint="Existing files are never replaced silently">
            <Toggle
              checked={settings.askBeforeOverwrite}
              onChange={(v) => void patch({ askBeforeOverwrite: v })}
              label="Ask before overwrite"
            />
          </Row>
          <Row label="Reveal output when done" hint="Opens the folder after each batch">
            <Toggle
              checked={settings.revealAfterConvert}
              onChange={(v) => void patch({ revealAfterConvert: v })}
              label="Reveal output when done"
            />
          </Row>
        </div>
      </section>
<section className="panel flex flex-col gap-4 p-5">
        <h3 className="text-[12px] font-semibold uppercase tracking-[0.09em] text-[var(--text-faint)]">
          Engines
        </h3>
        <EngineRow name="sharp" ok={Boolean(engine?.sharp)} detail="Image encoding — always available." />
        <EngineRow
          name="ffmpeg"
          ok={Boolean(ff?.available)}
          detail={ff?.available ? (ff.version ?? 'detected') : (ff?.error ?? 'Checking…')}
          path={ff?.ffmpegPath}
        />
        <p className="flex items-start gap-2 rounded-xl bg-[var(--glass-inset)] p-3 text-[11.5px] leading-relaxed text-[var(--text-faint)]">
          <Info size={13} className="mt-px shrink-0" />
          Video, audio and GIF need ffmpeg on PATH, or <code>ffmpeg.exe</code> in{' '}
          <code>resources/bin</code>. Image conversion works without it.
        </p>
      </section>
    </div>
  )
}

function EngineRow({
  name,
  ok,
  detail,
  path
}: {
  name: string
  ok: boolean
  detail: string
  path?: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-[var(--glass-inset)] p-3">
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
          ok
            ? 'bg-[color-mix(in_oklab,var(--color-teal-brand)_16%,transparent)] text-[var(--color-teal-brand)]'
            : 'bg-[color-mix(in_oklab,var(--color-amber-brand)_16%,transparent)] text-[var(--color-amber-brand)]'
        }`}
      >
        <Terminal size={14} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-semibold text-[var(--text-strong)]">{name}</p>
        <p className="mt-0.5 break-words text-[11px] text-[var(--text-faint)]">{detail}</p>
        {path ? <p className="mt-0.5 break-all text-[10.5px] text-[var(--text-faint)]">{path}</p> : null}
      </div>
      <span
        className={`shrink-0 rounded-md px-2 py-0.5 text-[10.5px] font-medium ${
          ok
            ? 'bg-[color-mix(in_oklab,var(--color-teal-brand)_14%,transparent)] text-[var(--color-teal-brand)]'
            : 'bg-[color-mix(in_oklab,var(--color-amber-brand)_14%,transparent)] text-[var(--color-amber-brand)]'
        }`}
      >
        {ok ? 'Ready' : 'Missing'}
      </span>
    </div>
  )
}