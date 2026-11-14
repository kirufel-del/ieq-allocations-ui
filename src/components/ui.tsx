import { useState, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, CircleDot, Info, X, XCircle } from 'lucide-react'
import { RUN_STATES, type RunState } from '../data/types'

export const money = (n: number, dp = 2) => (n < 0 ? '−' : '') + '$' + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })
export const pct = (n: number, dp = 1) => `${n.toFixed(dp)}%`
export const cx = (...c: (string | false | undefined | null)[]) => c.filter(Boolean).join(' ')

export function PageHeader({ title, subtitle, req, actions }: { title: string; subtitle?: string; req?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-2">{subtitle}</p>}
        {req && <p className="mt-1 font-mono text-[11px] text-ink-3">{req}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Card({ title, actions, children, className, pad = true }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={cx('rounded-xl border border-line bg-surface', className)}>
      {title && (
        <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          {actions}
        </header>
      )}
      <div className={pad ? 'p-4' : ''}>{children}</div>
    </section>
  )
}

export function Kpi({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'good' | 'warn' | 'bad' }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="text-xs font-medium text-ink-2">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-ink">{value}</div>
      {sub && <div className={cx('mt-1 text-xs', tone === 'good' ? 'text-good' : tone === 'warn' ? 'text-warn' : tone === 'bad' ? 'text-bad' : 'text-ink-3')}>{sub}</div>}
    </div>
  )
}

type Tone = 'good' | 'warn' | 'bad' | 'info' | 'neutral' | 'accent'
const toneCls: Record<Tone, string> = {
  good: 'bg-good-bg text-good',
  warn: 'bg-warn-bg text-warn',
  bad: 'bg-bad-bg text-bad',
  info: 'bg-info-bg text-info',
  neutral: 'bg-muted text-ink-2',
  accent: 'bg-accent-bg text-accent',
}
const toneIcon: Record<Tone, ReactNode> = {
  good: <CheckCircle2 size={12} />, warn: <AlertTriangle size={12} />, bad: <XCircle size={12} />,
  info: <Info size={12} />, neutral: <CircleDot size={12} />, accent: <CircleDot size={12} />,
}
export function Badge({ tone = 'neutral', children, icon = true }: { tone?: Tone; children: ReactNode; icon?: boolean }) {
  return <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium', toneCls[tone])}>{icon && toneIcon[tone]}{children}</span>
}

const statusTone: Record<string, Tone> = {
  Open: 'warn', 'In progress': 'info', Resolved: 'good', Routed: 'accent', Blocking: 'bad', Warning: 'warn',
  Pending: 'warn', Approved: 'good', Rejected: 'bad', Draft: 'neutral',
  Pass: 'good', Fail: 'bad', Warn: 'warn', Mismatch: 'bad',
  Answered: 'info', Acknowledged: 'good', 'Deemed accepted': 'info', Awaiting: 'warn',
  Healthy: 'good', Degraded: 'warn', Down: 'bad',
  Parsed: 'neutral', Validated: 'info', Discrepancy: 'bad', Loaded: 'accent', 'Signed off': 'good',
  Match: 'good', 'Explained diff': 'info', Unexplained: 'bad', 'Not run': 'neutral', Suggested: 'warn',
  Calculated: 'info', 'In review': 'warn', Published: 'accent', Paid: 'good', Closed: 'neutral', Snapshotted: 'info',
  Active: 'good', Terminated: 'neutral', Superseded: 'neutral', Imported: 'neutral',
}
export const Status = ({ s }: { s: string }) => <Badge tone={statusTone[s] ?? 'neutral'}>{s}</Badge>

export function Button({ children, onClick, variant = 'secondary', disabled, title, size = 'md', type = 'button' }: { children: ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; disabled?: boolean; title?: string; size?: 'sm' | 'md'; type?: 'button' | 'submit' }) {
  return (
    <button type={type} title={title} disabled={disabled} onClick={onClick}
      className={cx('inline-flex items-center gap-1.5 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-45',
        size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-2 text-sm',
        variant === 'primary' && 'bg-accent text-white hover:bg-accent-2',
        variant === 'secondary' && 'border border-line bg-surface text-ink hover:bg-muted',
        variant === 'ghost' && 'text-ink-2 hover:bg-muted',
        variant === 'danger' && 'border border-bad/30 bg-bad-bg text-bad hover:bg-bad/10')}>
      {children}
    </button>
  )
}

export function Table({ head, children, dense }: { head: ReactNode[]; children: ReactNode; dense?: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-ink-2">
            {head.map((h, i) => <th key={i} className={cx('whitespace-nowrap px-3 font-medium', dense ? 'py-1.5' : 'py-2')}>{h}</th>)}
          </tr>
        </thead>
        <tbody className="[&>tr]:border-b [&>tr]:border-line/60 [&>tr:last-child]:border-0 [&_td]:px-3 [&_td]:py-2 [&>tr:hover]:bg-muted/50">{children}</tbody>
      </table>
    </div>
  )
}
export const Num = ({ children, className }: { children: ReactNode; className?: string }) => <td className={cx('text-right tabular-nums whitespace-nowrap', className)}>{children}</td>

export function Drawer({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; wide?: boolean }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/30" onClick={onClose}>
      <aside className={cx('h-full w-full overflow-y-auto bg-surface shadow-2xl', wide ? 'max-w-3xl' : 'max-w-xl')} onClick={e => e.stopPropagation()}>
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-5 py-4">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <button onClick={onClose} className="rounded p-1 text-ink-2 hover:bg-muted" aria-label="Close"><X size={18} /></button>
        </header>
        <div className="p-5">{children}</div>
      </aside>
    </div>
  )
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-surface shadow-2xl" onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="text-sm font-semibold text-ink">{title}</h2>
          <button onClick={onClose} className="rounded p-1 text-ink-2 hover:bg-muted" aria-label="Close"><X size={16} /></button>
        </header>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

/** Small prompt modal hook: returns [element, ask(title, label, onSubmit)] */
export function usePrompt(): [ReactNode, (title: string, label: string, onSubmit: (v: string) => void, initial?: string) => void] {
  const [state, setState] = useState<{ title: string; label: string; onSubmit: (v: string) => void } | null>(null)
  const [val, setVal] = useState('')
  const el = (
    <Modal open={!!state} onClose={() => setState(null)} title={state?.title ?? ''}>
      <form onSubmit={e => { e.preventDefault(); if (!val.trim()) return; state?.onSubmit(val.trim()); setState(null) }}>
        <label className="text-xs font-medium text-ink-2">{state?.label}</label>
        <textarea autoFocus value={val} onChange={e => setVal(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-line bg-surface p-2 text-sm text-ink outline-none focus:border-accent" />
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setState(null)}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={!val.trim()}>Confirm</Button>
        </div>
      </form>
    </Modal>
  )
  return [el, (title, label, onSubmit, initial = '') => { setVal(initial); setState({ title, label, onSubmit }) }]
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: ReactNode }[]; value: T; onChange: (t: T) => void }) {
  return (
    <div className="mb-4 flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className={cx('-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium', value === t.id ? 'border-accent text-accent' : 'border-transparent text-ink-2 hover:text-ink')}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function RunStepper({ state }: { state: RunState }) {
  const idx = RUN_STATES.indexOf(state)
  return (
    <ol className="flex flex-wrap items-center gap-y-2">
      {RUN_STATES.map((s, i) => (
        <li key={s} className="flex items-center">
          <span className={cx('flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
            i < idx && 'bg-good-bg text-good', i === idx && 'bg-accent text-white', i > idx && 'bg-muted text-ink-3')}>
            {i < idx ? <CheckCircle2 size={12} /> : <span className="font-mono text-[10px]">{i + 1}</span>}{s}
          </span>
          {i < RUN_STATES.length - 1 && <span className={cx('mx-1 h-px w-4', i < idx ? 'bg-good' : 'bg-line')} />}
        </li>
      ))}
    </ol>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-ink-2">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink">{children}</dd>
    </div>
  )
}

export const Mono = ({ children }: { children: ReactNode }) => <span className="whitespace-nowrap font-mono text-xs text-ink-2">{children}</span>

export function Select({ value, onChange, options, label }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; label?: string }) {
  return (
    <label className="inline-flex items-center gap-2 text-xs text-ink-2">
      {label}
      <select value={value} onChange={e => onChange(e.target.value)} className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink outline-none focus:border-accent">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  )
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder ?? 'Search…'} className="w-56 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-accent" />
}

export function Note({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warn' | 'bad' | 'good' }) {
  return <div className={cx('flex items-start gap-2 rounded-lg px-3 py-2 text-sm', toneCls[tone])}>{toneIcon[tone]}<div>{children}</div></div>
}
