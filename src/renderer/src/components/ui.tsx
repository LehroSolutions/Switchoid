import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'

/* ---------------------------------------------------------------- Button */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary:
    'text-white bg-[linear-gradient(120deg,var(--color-cyan-brand),var(--color-violet-brand)_52%,var(--color-pink-brand))] shadow-[0_14px_34px_-14px_color-mix(in_oklab,var(--color-violet-brand)_85%,transparent)] hover:brightness-110 active:brightness-95',
  secondary:
    'bg-[var(--glass)] text-[var(--text-strong)] border border-[var(--glass-border)] hover:bg-[var(--glass-hover)] hover:border-[var(--glass-border-strong)]',
  ghost:
    'text-[var(--text-muted)] hover:text-[var(--text-strong)] hover:bg-[var(--glass-hover)]',
  danger: 'text-[var(--color-rose-brand)] hover:bg-[color-mix(in_oklab,var(--color-rose-brand)_14%,transparent)]'
}

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-[12.5px] gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-[13.5px] gap-2 rounded-xl',
  lg: 'h-12 px-6 text-[15px] gap-2.5 rounded-xl'
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  children?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', className = '', children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      className={`inline-flex select-none items-center justify-center font-medium transition-[filter,background-color,border-color,color] duration-150 disabled:pointer-events-none disabled:opacity-45 ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
})

/* ----------------------------------------------------------------- Field */

export function Field({
  label,
  hint,
  children,
  htmlFor
}: {
  label: string
  hint?: string
  children: ReactNode
  htmlFor?: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={htmlFor}
          className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[var(--text-faint)]"
        >
          {label}
        </label>
        {hint ? <span className="text-[11px] tabular-nums text-[var(--text-faint)]">{hint}</span> : null}
      </div>
      {children}
    </div>
  )
}

/* ----------------------------------------------------------------- Select */

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string | number; label: string }[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { options, className = '', ...rest },
  ref
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={`h-10 w-full appearance-none rounded-xl border border-[var(--glass-border)] bg-[var(--glass)] px-3 pr-9 text-[13.5px] text-[var(--text-strong)] transition-colors hover:border-[var(--glass-border-strong)] focus:border-[var(--color-cyan-brand)] ${className}`}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[var(--surface-raised)]">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={15}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-faint)]"
      />
    </div>
  )
})

/* ------------------------------------------------------------------ Range */

export function Range({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  hint,
  disabled
}: {
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  label: string
  /** Optional live readout rendered at the right of the label row. */
  hint?: string
  disabled?: boolean
}) {
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[var(--text-faint)]">
          {label}
        </span>
        {hint ? (
          <span className="text-[11px] font-semibold tabular-nums text-[var(--text-strong)]">{hint}</span>
        ) : null}
      </div>
      <input
        type="range"
        aria-label={label}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-transparent disabled:cursor-not-allowed disabled:opacity-40 [&::-webkit-slider-runnable-track]:h-1.5 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-thumb]:mt-[-6px] [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-[var(--color-violet-brand)] [&::-webkit-slider-thumb]:shadow-[0_2px_8px_rgba(0,0,0,0.4)] [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-[var(--color-violet-brand)] hover:[&::-webkit-slider-thumb]:scale-110"
        style={{
          background: `linear-gradient(to right, var(--color-violet-brand) 0%, var(--color-pink-brand) ${pct}%, var(--glass-inset) ${pct}%, var(--glass-inset) 100%)`
        }}
      />
    </div>
  )
}

/* ----------------------------------------------------------------- Toggle */

export function Toggle({
  checked,
  onChange,
  label
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-[22px] w-[38px] shrink-0 rounded-full border transition-colors duration-200 ${
        checked
          ? 'border-transparent bg-[linear-gradient(120deg,var(--color-violet-brand),var(--color-pink-brand))]'
          : 'border-[var(--glass-border)] bg-[var(--glass-inset)]'
      }`}
    >
      <span
        className={`absolute top-1/2 h-[16px] w-[16px] -translate-y-1/2 rounded-full bg-white shadow transition-[left] duration-200 ${
          checked ? 'left-[19px]' : 'left-[2px]'
        }`}
      />
    </button>
  )
}

/* ----------------------------------------------------------------- Number */

export function NumberInput({
  value,
  onChange,
  placeholder,
  suffix,
  min,
  max
}: {
  value: number | undefined
  onChange: (v: number | undefined) => void
  placeholder?: string
  suffix?: string
  min?: number
  max?: number
}) {
  return (
    <div className="relative">
      <input
        type="number"
        value={value ?? ''}
        min={min}
        max={max}
        placeholder={placeholder}
        onChange={(e) => {
          const raw = e.target.value
          onChange(raw === '' ? undefined : Number(raw))
        }}
        className={`h-10 w-full rounded-xl border border-[var(--glass-border)] bg-[var(--glass)] px-3 text-[13.5px] tabular-nums text-[var(--text-strong)] placeholder:text-[var(--text-faint)] hover:border-[var(--glass-border-strong)] focus:border-[var(--color-cyan-brand)]`}
      />
      {suffix ? (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-[var(--text-faint)]">
          {suffix}
        </span>
      ) : null}
    </div>
  )
}

/* -------------------------------------------------------------------- Chip */

export function Chip({
  active,
  onClick,
  children,
  ariaLabel
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
  ariaLabel?: string
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={ariaLabel}
      onClick={onClick}
      className={`chip h-8 rounded-lg px-3 text-[12.5px] ${active ? 'chip-active' : ''}`}
    >
      {children}
    </button>
  )
}

/* ------------------------------------------------------------- Empty state */

export function EmptyState({
  icon,
  title,
  body,
  action
}: {
  icon: ReactNode
  title: string
  body: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--surface-sunken)] text-[var(--text-faint)]">
        {icon}
      </div>
      <div className="space-y-1">
        <p className="text-[14px] font-semibold text-[var(--text-strong)]">{title}</p>
        <p className="mx-auto max-w-[34ch] text-[12.5px] leading-relaxed text-[var(--text-faint)]">{body}</p>
      </div>
      {action}
    </div>
  )
}

/* ------------------------------------------------------------- Text input */

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function TextInput({ className = '', ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={`h-10 w-full rounded-xl border border-[var(--glass-border)] bg-[var(--glass)] px-3 text-[13.5px] text-[var(--text-strong)] placeholder:text-[var(--text-faint)] hover:border-[var(--glass-border-strong)] focus:border-[var(--color-cyan-brand)] ${className}`}
        {...rest}
      />
    )
  }
)