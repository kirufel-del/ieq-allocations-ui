// Core entities from Requirements & Design v2, section 5.

export type Population = 'Advisor' | 'Referrer' | 'Partner' | 'Non-advisor'
export type Archetype = 'A' | 'B' | 'C' | 'D' | 'E'
export type Channel = 'Payroll' | 'AP'

export type RoleKey =
  | 'preparer' | 'reviewer' | 'rules' | 'dataowner'
  | 'payee' | 'payroll' | 'auditor' | 'admin'

export interface User {
  id: string
  name: string
  role: RoleKey
  title: string
  payeeId?: string
}

export interface Payee {
  id: string // Salesforce ID
  name: string
  population: Population
  status: 'Active' | 'Terminated'
  startDate: string
  endDate?: string
  repCodes: string[]
  channel: Channel
  email: string
  folderOwner: string // SharePoint folder owner id (for DIST-1 check)
}

export interface Client {
  id: string
  name: string
  household: string
}

export interface RevenueRecord {
  id: string
  clientId: string
  period: string
  amount: number
  type: 'Fee' | 'Stub'
  source: 'CRMA fee dataset' | 'CRMA stub dataset'
}

export interface SplitAssignment {
  id: string
  clientId: string
  payeeId: string
  pct: number
  repCode: string
  from: string
  to?: string
}

export interface StepDownStep { fromYear: number; toYear: number | null; pct: number }
export interface StepDownPlan {
  id: string
  name: string
  version: number
  effectiveFrom: string
  steps: StepDownStep[]
  attachedTo: number
}

export interface RuleEntry {
  id: string
  payeeId: string
  version: number
  effectiveFrom: string
  effectiveTo?: string
  archetype: Archetype
  basis: string
  pct: number // payout rate (A), referral (B via plan), share (C)
  stepDownPlanId?: string
  proration: 'Calendar days' | 'Business days' | 'None'
  cap?: number
  floor?: number
  channel: Channel
  approvedBy: string
  approvedAt: string
  provenance?: string
}

export interface RuleChange {
  id: string
  payeeId: string
  summary: string
  field: string
  before: string
  after: string
  effectiveFrom: string
  author: string
  createdAt: string
  status: 'Pending' | 'Approved' | 'Rejected'
  approver?: string
  decidedAt?: string
  reason: string
}

export interface Override {
  id: string
  payeeId: string
  description: string
  reason: string
  document: string
  approver: string
  expires: string
}

export type RunState =
  | 'Open' | 'Snapshotted' | 'Calculated' | 'In review'
  | 'Approved' | 'Published' | 'Paid' | 'Closed'

export const RUN_STATES: RunState[] = [
  'Open', 'Snapshotted', 'Calculated', 'In review', 'Approved', 'Published', 'Paid', 'Closed',
]

export interface Snapshot {
  id: string
  period: string
  seq: number
  lockedAt: string
  lockedBy: string
  counts: { clients: number; revenue: number; splits: number; payees: number }
  sourceHash: string
  durationSec: number
  partialOf?: string
  note?: string
}

export interface Run {
  id: string
  period: string
  snapshotId: string
  rulesVersion: string
  state: RunState
  preparer: string
  approver?: string
  submittedAt?: string
  approvedAt?: string
  total: number
  payeeCount: number
  legacy: boolean
  shadow?: { excelTotal: number; matchedLines: number; totalLines: number; diffs: { payee: string; engine: number; excel: number; cause: string }[] }
  history: { state: RunState; at: string; by: string; note?: string }[]
  returned?: { by: string; at: string; reason: string }
}

export interface AllocationLine {
  id: string
  runId: string
  payeeId: string
  clientId?: string
  piece: string // full quarter or stub piece
  basis: string
  basisAmount: number
  rate: number
  amount: number
  archetype: Archetype
  lineage: {
    revenueIds: string[]
    splitId?: string
    ruleEntryId: string
    stepDownStep?: string
  }
}

export type ExceptionSeverity = 'Blocking' | 'Warning'
export type ExceptionStatus = 'Open' | 'In progress' | 'Resolved' | 'Routed'
export interface ExceptionItem {
  id: string
  runId: string
  type: string
  check: string
  severity: ExceptionSeverity
  payeeId?: string
  clientId?: string
  sfRecord?: string
  detail: string
  owner: string
  status: ExceptionStatus
  comments: { by: string; at: string; text: string }[]
  createdAt: string
}

export interface ValidationCheck {
  id: string
  name: string
  description: string
  status: 'Pass' | 'Fail' | 'Warn'
  expected?: number
  actual?: number
  tolerance?: number
  failures: number
}

export interface ScheduleVersion {
  id: string
  runId: string
  period: string
  payeeId: string
  version: number
  total: number
  checksum: string
  publishedAt: string
  supersededBy?: string
  changeSummary?: string
  delivery: 'Portal' | 'Folder' | 'Portal + folder'
  ownerCheck: 'Pass' | 'Mismatch'
  ack?: { at: string; kind: 'Acknowledged' | 'Deemed accepted' }
  legacy?: boolean
}

export interface QuestionThread {
  id: string
  scheduleId: string
  payeeId: string
  lineRef?: string
  subject: string
  status: 'Open' | 'Answered' | 'Resolved'
  slaDue: string
  adjustmentId?: string
  messages: { by: string; at: string; text: string }[]
}

export interface Adjustment {
  id: string
  runId: string
  payeeId: string
  originalRunId: string
  amount: number
  reason: string
  status: 'Draft' | 'Approved'
  createdBy: string
  approvedBy?: string
  questionId?: string
  scheduleId?: string
  outcome?: string
}

export interface PayrollBatch {
  id: string
  runId: string
  format: string
  fileHash?: string
  generatedAt?: string
  approvedBy?: string
  signedOffBy?: string
  /** payroll register total minus approved total; non-zero blocks sign-off and payment */
  mismatch?: number
  rows: number
  total: number
}

export interface AuditEvent {
  id: string
  at: string
  actor: string
  action: string
  entity: string
  detail: string
}

export interface LegacyWorkbook {
  id: string
  period: string
  file: string
  generation: 'G1' | 'G2' | 'G3' | 'G4'
  payees: number
  lines: number
  total: number
  payrollRegister: number
  status: 'Parsed' | 'Validated' | 'Discrepancy' | 'Loaded' | 'Signed off'
  regression: 'Match' | 'Explained diff' | 'Unexplained' | 'Not run'
}

export interface NameMapping {
  id: string
  kind: 'Payee' | 'Client'
  legacyName: string
  suggestedId: string
  suggestedName: string
  confidence: number
  status: 'Suggested' | 'Approved' | 'Rejected'
}
