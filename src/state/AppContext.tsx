import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import * as M from '../data/mock'
import type {
  Adjustment, AuditEvent, ExceptionItem, LegacyWorkbook, NameMapping, PayrollBatch, QuestionThread,
  RuleChange, Run, RunState, ScheduleVersion, Snapshot, User,
} from '../data/types'

export interface Settings {
  variancePct: number
  varianceAbs: number
  glTolerance: number
  reviewWindowDays: number
  deemedAcceptance: boolean
  folderFallback: boolean
  payrollFormat: string
  closeFreeze: boolean
}

interface DB {
  runs: Run[]
  snapshots: Snapshot[]
  exceptions: ExceptionItem[]
  ruleChanges: RuleChange[]
  schedules: ScheduleVersion[]
  questions: QuestionThread[]
  adjustments: Adjustment[]
  payroll: PayrollBatch[]
  audit: AuditEvent[]
  mappings: NameMapping[]
  workbooks: LegacyWorkbook[]
  settings: Settings
}

const initial: DB = {
  runs: M.RUNS, snapshots: M.SNAPSHOTS, exceptions: M.EXCEPTIONS, ruleChanges: M.RULE_CHANGES,
  schedules: M.SCHEDULES, questions: M.QUESTIONS, adjustments: M.ADJUSTMENTS, payroll: M.PAYROLL_BATCHES,
  audit: M.AUDIT_EVENTS, mappings: M.NAME_MAPPINGS, workbooks: M.LEGACY_WORKBOOKS,
  settings: { variancePct: 25, varianceAbs: 10000, glTolerance: M.GL_TOLERANCE, reviewWindowDays: 5, deemedAcceptance: true, folderFallback: true, payrollFormat: 'ADP Workforce Now · earnings import v3', closeFreeze: true },
}

let clock = Date.UTC(2027, 9, 7, 9, 0)
const now = () => { clock += 60000 * 7; return new Date(clock).toISOString().slice(0, 16).replace('T', ' ') }
const hex = (n: number) => Array.from({ length: n }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('')

type Ctx = ReturnType<typeof useProvideApp>
const AppCtx = createContext<Ctx | null>(null)

function useProvideApp() {
  const [db, setDb] = useState<DB>(initial)
  const [userId, setUserId] = useState('u1')
  const [payeeId, setPayeeId] = useState(M.PAYEES[21].id)
  const [toast, setToast] = useState<string | null>(null)

  const user: User = userId === 'payee'
    ? { id: payeeId, name: M.payeeName(payeeId), role: 'payee', title: 'Payee', payeeId }
    : M.USERS.find(u => u.id === userId)!

  const notify = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(t => (t === msg ? null : t)), 3200) }, [])

  const mutate = useCallback((fn: (d: DB) => Partial<DB>, audit?: [string, string, string], msg?: string) => {
    setDb(d => {
      const patch = fn(d)
      const next = { ...d, ...patch }
      if (audit) next.audit = [{ id: `AE-${900000 + d.audit.length}`, at: now(), actor: user.id, action: audit[0], entity: audit[1], detail: audit[2] }, ...next.audit]
      return next
    })
    if (msg) notify(msg)
  }, [user.id, notify])

  const role = user.role
  const can = {
    prepare: role === 'preparer',
    approve: role === 'reviewer',
    resolveException: (e: ExceptionItem) => role === 'preparer' || (role === 'dataowner' && e.owner === 'u5') || (role === 'rules' && e.owner === user.id) || (role === 'admin' && e.owner === 'u8'),
    proposeRule: role === 'preparer' || role === 'rules',
    approveRule: (c: RuleChange) => role === 'rules' && c.author !== user.id,
    payroll: role === 'payroll' || role === 'reviewer',
    admin: role === 'admin',
    migrate: role === 'preparer' || role === 'admin',
    readOnly: role === 'auditor',
  }

  const setRunState = (runId: string, state: RunState, extra: Partial<Run> = {}) => (d: DB) => ({
    runs: d.runs.map(r => r.id === runId ? { ...r, ...extra, state, history: [...r.history, { state, at: now(), by: user.id }] } : r),
  })

  const actions = {
    resolveException: (id: string, comment: string) => mutate(d => ({ exceptions: d.exceptions.map(e => e.id === id ? { ...e, status: 'Resolved', comments: [...e.comments, { by: user.id, at: now(), text: comment }] } : e) }), ['Exception resolved', id, comment], `${id} resolved`),
    bulkResolve: (ids: string[], comment: string) => mutate(d => ({ exceptions: d.exceptions.map(e => ids.includes(e.id) ? { ...e, status: 'Resolved', comments: [...e.comments, { by: user.id, at: now(), text: comment }] } : e) }), ['Exceptions bulk-resolved', ids.join(', '), comment], `${ids.length} exceptions resolved`),
    assignException: (id: string, owner: string) => mutate(d => ({ exceptions: d.exceptions.map(e => e.id === id ? { ...e, owner, status: e.status === 'Open' ? 'In progress' : e.status } : e) }), ['Exception assigned', id, `to ${M.userName(owner)}`]),
    routeException: (id: string) => mutate(d => ({ exceptions: d.exceptions.map(e => e.id === id ? { ...e, owner: 'u5', status: 'Routed' } : e) }), ['Exception routed to Sales Ops', id, 'Fix at source in Salesforce'], `${id} routed to Sales Ops`),
    commentException: (id: string, text: string) => mutate(d => ({ exceptions: d.exceptions.map(e => e.id === id ? { ...e, comments: [...e.comments, { by: user.id, at: now(), text }] } : e) }), ['Comment added', id, text]),

    submitRun: (runId: string) => mutate(setRunState(runId, 'In review', { submittedAt: now() }), ['Run submitted for review', runId, 'Maker step complete'], 'Run submitted for review'),
    approveRun: (runId: string) => mutate(setRunState(runId, 'Approved', { approver: user.id, approvedAt: now() }), ['Run approved', runId, 'Checker approval; run locked'], 'Run approved and locked'),
    rejectRun: (runId: string, reason: string) => mutate(setRunState(runId, 'Calculated'), ['Run returned to preparer', runId, reason], 'Run returned to preparer'),
    publishRun: (runId: string) => mutate(d => {
      const run = d.runs.find(r => r.id === runId)!
      const newSchedules: ScheduleVersion[] = M.PAYEES.map((p, i) => ({
        id: `SCH-${run.period.replace('-', '')}-${String(i + 1).padStart(3, '0')}-v1`, runId, period: run.period, payeeId: p.id, version: 1,
        total: M.payeeTotal(p.id), checksum: 'sha256:' + hex(16), publishedAt: now(),
        delivery: p.folderOwner !== p.id ? 'Portal' : d.settings.folderFallback ? 'Portal + folder' : 'Portal',
        ownerCheck: p.folderOwner !== p.id ? 'Mismatch' : 'Pass',
      }))
      return { ...setRunState(runId, 'Published')(d), schedules: [...newSchedules, ...d.schedules] }
    }, ['Schedules published', runId, `${M.PAYEES.length} schedules v1 (PDF + Excel); notifications sent`], `${M.PAYEES.length} schedules published and payees notified`),
    generatePayroll: (runId: string) => mutate(d => {
      const run = d.runs.find(r => r.id === runId)!
      const b: PayrollBatch = { id: `PAY-${run.period.replace('-', '')}`, runId, format: d.settings.payrollFormat, fileHash: 'sha256:' + hex(24), generatedAt: now(), approvedBy: run.approver, rows: run.payeeCount, total: run.total }
      return { payroll: [b, ...d.payroll.filter(x => x.id !== b.id)] }
    }, ['Payroll file generated', runId, 'From approved totals only'], 'Payroll file generated'),
    signOffPayroll: (batchId: string) => mutate(d => ({ payroll: d.payroll.map(b => b.id === batchId ? { ...b, signedOffBy: user.id } : b) }), ['Tie-out signed', batchId, 'Second-person sign-off'], 'Tie-out signed off'),
    markPaid: (runId: string) => mutate(setRunState(runId, 'Paid'), ['Run marked paid', runId, 'Payroll confirmation received'], 'Run marked paid'),
    closeRun: (runId: string) => mutate(setRunState(runId, 'Closed'), ['Run closed', runId, 'Period closed'], 'Period closed'),

    reSnapshot: (period: string) => mutate(d => {
      const seq = Math.max(...d.snapshots.filter(s => s.period === period).map(s => s.seq)) + 1
      const s: Snapshot = { id: `SNP-${period.replace('-', '')}-${seq}`, period, seq, lockedAt: now(), lockedBy: user.id, counts: { clients: 3, revenue: 3, splits: 6, payees: 4 }, sourceHash: hex(12), durationSec: 18, partialOf: `SNP-${period.replace('-', '')}-${seq - 1}`, note: 'Partial re-snapshot for clients fixed at source' }
      return { snapshots: [s, ...d.snapshots] }
    }, ['Snapshot locked', period, 'Partial re-snapshot'], 'Partial re-snapshot locked'),

    proposeRule: (c: Omit<RuleChange, 'id' | 'author' | 'createdAt' | 'status'>) => mutate(d => ({ ruleChanges: [{ ...c, id: `RC-${130 + d.ruleChanges.length}`, author: user.id, createdAt: now().slice(0, 10), status: 'Pending' }, ...d.ruleChanges] }), ['Rule change proposed', M.payeeName(c.payeeId), c.summary], 'Rule change submitted for approval'),
    decideRule: (id: string, approve: boolean) => mutate(d => ({ ruleChanges: d.ruleChanges.map(c => c.id === id ? { ...c, status: approve ? 'Approved' : 'Rejected', approver: user.id, decidedAt: now().slice(0, 10) } : c) }), [approve ? 'Rule change approved' : 'Rule change rejected', id, ''], approve ? `${id} approved` : `${id} rejected`),
    approveAdjustment: (id: string) => mutate(d => ({ adjustments: d.adjustments.map(a => a.id === id ? { ...a, status: 'Approved' } : a) }), ['Adjustment approved', id, '']),

    ackSchedule: (id: string) => mutate(d => ({ schedules: d.schedules.map(s => s.id === id ? { ...s, ack: { at: now(), kind: 'Acknowledged' } } : s) }), ['Schedule acknowledged', id, ''], 'Schedule acknowledged'),
    simulateAcks: (period: string) => mutate(d => ({ schedules: d.schedules.map((s, i) => s.period === period && !s.ack && !s.supersededBy && i % 5 !== 0 ? { ...s, ack: { at: now(), kind: 'Acknowledged' } } : s) }), ['Simulated payee activity', period, 'Acknowledgments received'], 'Simulated 3 days of payee acknowledgments'),
    askQuestion: (scheduleId: string, payeeId: string, subject: string, text: string, lineRef?: string) => mutate(d => ({ questions: [{ id: `Q-${2240 + d.questions.length}`, scheduleId, payeeId, subject, lineRef, status: 'Open', slaDue: '2027-10-14', messages: [{ by: payeeId, at: now(), text }] }, ...d.questions] }), ['Question raised', scheduleId, subject], 'Question sent to Finance'),
    replyQuestion: (id: string, text: string, resolve: boolean) => mutate(d => ({ questions: d.questions.map(q => q.id === id ? { ...q, status: resolve ? 'Resolved' : q.payeeId === user.id ? 'Open' : 'Answered', messages: [...q.messages, { by: user.id, at: now(), text }] } : q) }), ['Question reply', id, resolve ? 'Resolved' : 'Reply']),

    decideMapping: (id: string, approve: boolean) => mutate(d => ({ mappings: d.mappings.map(m => m.id === id ? { ...m, status: approve ? 'Approved' : 'Rejected' } : m) }), ['Name mapping ' + (approve ? 'approved' : 'rejected'), id, '']),
    signOffWorkbook: (id: string) => mutate(d => ({ workbooks: d.workbooks.map(w => w.id === id ? { ...w, status: 'Signed off' } : w) }), ['Migration discrepancy signed off', id, 'Finance sign-off'], `${id} signed off`),
    updateSettings: (s: Partial<Settings>) => mutate(d => ({ settings: { ...d.settings, ...s } }), ['Settings changed', 'Admin', Object.keys(s).join(', ')], 'Settings saved'),
    exportEvidence: (what: string) => mutate(() => ({}), ['Evidence exported', what, 'Mock export'], `Exported ${what} (mock)`),
  }

  const currentRun = db.runs.find(r => r.id === 'RUN-2027Q3-01')!
  return { db, user, userId, setUserId, payeeId, setPayeeId, can, actions, currentRun, toast, notify }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const v = useProvideApp()
  return <AppCtx.Provider value={v}>{children}</AppCtx.Provider>
}
export const useApp = () => useContext(AppCtx)!
