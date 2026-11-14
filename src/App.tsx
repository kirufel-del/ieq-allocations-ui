import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import {
  ArrowLeftRight, BookOpenCheck, Camera, ClipboardCheck, Database, FileText, Gauge, History, Landmark,
  ListChecks, MessageSquare, PlayCircle, Scale, Settings, ShieldCheck, TriangleAlert, Wallet,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useApp } from './state/AppContext'
import { USERS, PAYEES, periodLabel, CURRENT_PERIOD, TODAY } from './data/mock'
import type { RoleKey } from './data/types'
import { cx } from './components/ui'
import Dashboard from './pages/Dashboard'
import Runs, { RunDetail } from './pages/Runs'
import Snapshots from './pages/Snapshots'
import Exceptions from './pages/Exceptions'
import Allocations from './pages/Allocations'
import Reconciliation from './pages/Reconciliation'
import Schedules from './pages/Schedules'
import Questions from './pages/Questions'
import Adjustments from './pages/Adjustments'
import Payroll from './pages/Payroll'
import Rules from './pages/Rules'
import PayeePortal from './pages/PayeePortal'
import Audit from './pages/Audit'
import Admin from './pages/Admin'
import Migration from './pages/Migration'

const FIN: RoleKey[] = ['preparer', 'reviewer']
interface NavItem { to: string; label: string; icon: ReactNode; roles: RoleKey[]; group: string }
const NAV: NavItem[] = [
  { to: '/dashboard', label: 'Close dashboard', icon: <Gauge size={16} />, roles: [...FIN, 'rules', 'admin'], group: 'Quarter close' },
  { to: '/runs', label: 'Runs', icon: <PlayCircle size={16} />, roles: [...FIN, 'payroll', 'auditor'], group: 'Quarter close' },
  { to: '/snapshots', label: 'Snapshots', icon: <Camera size={16} />, roles: [...FIN, 'dataowner', 'auditor', 'admin'], group: 'Quarter close' },
  { to: '/exceptions', label: 'Exception queue', icon: <TriangleAlert size={16} />, roles: [...FIN, 'dataowner', 'rules', 'admin'], group: 'Quarter close' },
  { to: '/allocations', label: 'Allocations', icon: <ListChecks size={16} />, roles: [...FIN, 'auditor'], group: 'Quarter close' },
  { to: '/reconciliation', label: 'Reconciliation', icon: <Scale size={16} />, roles: [...FIN, 'auditor'], group: 'Quarter close' },
  { to: '/adjustments', label: 'Adjustments', icon: <ArrowLeftRight size={16} />, roles: [...FIN, 'auditor'], group: 'Quarter close' },
  { to: '/schedules', label: 'Schedules', icon: <FileText size={16} />, roles: [...FIN, 'auditor'], group: 'Distribution' },
  { to: '/questions', label: 'Payee questions', icon: <MessageSquare size={16} />, roles: FIN, group: 'Distribution' },
  { to: '/payroll', label: 'Payroll hand-off', icon: <Wallet size={16} />, roles: [...FIN, 'payroll', 'auditor'], group: 'Distribution' },
  { to: '/rules', label: 'Rules register', icon: <BookOpenCheck size={16} />, roles: [...FIN, 'rules', 'dataowner', 'auditor'], group: 'Configuration' },
  { to: '/migration', label: 'Migration', icon: <History size={16} />, roles: [...FIN, 'admin', 'auditor'], group: 'Configuration' },
  { to: '/audit', label: 'Audit & evidence', icon: <ShieldCheck size={16} />, roles: ['auditor', 'reviewer', 'admin', 'rules'], group: 'Governance' },
  { to: '/admin', label: 'Administration', icon: <Settings size={16} />, roles: ['admin'], group: 'Governance' },
]
const HOME: Record<RoleKey, string> = { preparer: '/dashboard', reviewer: '/dashboard', rules: '/rules', dataowner: '/exceptions', payee: '/portal', payroll: '/payroll', auditor: '/audit', admin: '/admin' }

function UserSwitcher() {
  const { userId, setUserId, payeeId, setPayeeId } = useApp()
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="text-xs text-ink-2">Viewing as</label>
      <select value={userId} onChange={e => { setUserId(e.target.value); window.location.hash = HOME[(USERS.find(u => u.id === e.target.value)?.role ?? 'payee') as RoleKey] }}
        className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink outline-none focus:border-accent">
        {USERS.map(u => <option key={u.id} value={u.id}>{u.name} — {u.title}</option>)}
        <option value="payee">Payee portal (impersonate a payee)</option>
      </select>
      {userId === 'payee' && (
        <select value={payeeId} onChange={e => setPayeeId(e.target.value)} className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink outline-none focus:border-accent">
          {PAYEES.map(p => <option key={p.id} value={p.id}>{p.name} · {p.population}</option>)}
        </select>
      )}
    </div>
  )
}

function Guard({ path, children }: { path: string; children: ReactNode }) {
  const { user } = useApp()
  const item = NAV.find(n => n.to === path)
  if (item && !item.roles.includes(user.role)) return <Navigate to={HOME[user.role]} replace />
  return <>{children}</>
}

export default function App() {
  const { user, toast, currentRun, db } = useApp()
  const loc = useLocation()
  const isPayee = user.role === 'payee'
  const items = NAV.filter(n => n.roles.includes(user.role))
  const groups = [...new Set(items.map(i => i.group))]
  const openEx = db.exceptions.filter(e => e.runId === currentRun.id && e.status !== 'Resolved').length
  const openQ = db.questions.filter(q => q.status === 'Open').length

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface/95 px-4 py-2.5 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white"><Landmark size={17} /></div>
          <div>
            <div className="text-sm font-semibold text-ink">IEQ Allocations</div>
            <div className="text-[11px] text-ink-3">Prototype · mock data · simulated date {TODAY}</div>
          </div>
          {!isPayee && <span className="ml-2 hidden rounded-full bg-muted px-2.5 py-1 text-xs text-ink-2 md:inline">Current period <b className="text-ink">{periodLabel(CURRENT_PERIOD)}</b> · {currentRun.state}</span>}
        </div>
        <UserSwitcher />
      </header>

      <div className="flex">
        {!isPayee && (
          <nav className="sticky top-[57px] hidden h-[calc(100vh-57px)] w-60 shrink-0 overflow-y-auto border-r border-line bg-surface px-3 py-4 md:block">
            {groups.map(g => (
              <div key={g} className="mb-4">
                <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">{g}</div>
                {items.filter(i => i.group === g).map(i => (
                  <NavLink key={i.to} to={i.to} className={({ isActive }) => cx('flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm', isActive || loc.pathname.startsWith(i.to + '/') ? 'bg-accent-bg font-medium text-accent' : 'text-ink-2 hover:bg-muted hover:text-ink')}>
                    {i.icon}<span className="flex-1">{i.label}</span>
                    {i.to === '/exceptions' && openEx > 0 && <span className="rounded-full bg-warn-bg px-1.5 text-[11px] font-semibold text-warn">{openEx}</span>}
                    {i.to === '/questions' && openQ > 0 && <span className="rounded-full bg-warn-bg px-1.5 text-[11px] font-semibold text-warn">{openQ}</span>}
                  </NavLink>
                ))}
              </div>
            ))}
            <div className="mt-6 rounded-lg bg-muted p-3 text-[11px] leading-relaxed text-ink-2">
              <Database size={12} className="mb-1" />
              Signed in as <b className="text-ink">{user.name}</b>.<br />{user.title}. Segregation of duties is enforced: actions you can't take are disabled.
            </div>
          </nav>
        )}
        {!isPayee && (
          <div className="fixed bottom-0 left-0 right-0 z-30 flex gap-1 overflow-x-auto border-t border-line bg-surface px-2 py-1.5 md:hidden">
            {items.map(i => <NavLink key={i.to} to={i.to} className={({ isActive }) => cx('flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs', isActive ? 'bg-accent-bg text-accent' : 'text-ink-2')}>{i.icon}{i.label}</NavLink>)}
          </div>
        )}

        <main className={cx('min-w-0 flex-1 px-4 py-6 pb-20 md:px-8', isPayee && 'mx-auto max-w-5xl')}>
          <Routes>
            <Route path="/" element={<Navigate to={HOME[user.role]} replace />} />
            <Route path="/dashboard" element={<Guard path="/dashboard"><Dashboard /></Guard>} />
            <Route path="/runs" element={<Guard path="/runs"><Runs /></Guard>} />
            <Route path="/runs/:id" element={<Guard path="/runs"><RunDetail /></Guard>} />
            <Route path="/snapshots" element={<Guard path="/snapshots"><Snapshots /></Guard>} />
            <Route path="/exceptions" element={<Guard path="/exceptions"><Exceptions /></Guard>} />
            <Route path="/allocations" element={<Guard path="/allocations"><Allocations /></Guard>} />
            <Route path="/reconciliation" element={<Guard path="/reconciliation"><Reconciliation /></Guard>} />
            <Route path="/adjustments" element={<Guard path="/adjustments"><Adjustments /></Guard>} />
            <Route path="/schedules" element={<Guard path="/schedules"><Schedules /></Guard>} />
            <Route path="/questions" element={<Guard path="/questions"><Questions /></Guard>} />
            <Route path="/payroll" element={<Guard path="/payroll"><Payroll /></Guard>} />
            <Route path="/rules" element={<Guard path="/rules"><Rules /></Guard>} />
            <Route path="/migration" element={<Guard path="/migration"><Migration /></Guard>} />
            <Route path="/audit" element={<Guard path="/audit"><Audit /></Guard>} />
            <Route path="/admin" element={<Guard path="/admin"><Admin /></Guard>} />
            <Route path="/portal" element={isPayee ? <PayeePortal /> : <Navigate to={HOME[user.role]} replace />} />
            <Route path="*" element={<Navigate to={HOME[user.role]} replace />} />
          </Routes>
        </main>
      </div>

      {toast && <div className="fixed bottom-6 right-6 z-50 rounded-lg bg-ink px-4 py-2.5 text-sm text-surface shadow-lg">{toast}</div>}
    </div>
  )
}
