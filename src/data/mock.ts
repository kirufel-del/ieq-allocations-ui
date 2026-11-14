import type {
  AllocationLine, Adjustment, AuditEvent, Client, ExceptionItem, LegacyWorkbook, NameMapping,
  Override, Payee, PayrollBatch, Population, QuestionThread, RevenueRecord, RuleChange, RuleEntry,
  Run, ScheduleVersion, Snapshot, SplitAssignment, StepDownPlan, User,
} from './types'

// ---------- deterministic RNG ----------
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rnd = mulberry32(20270930)
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)]
const between = (lo: number, hi: number) => lo + rnd() * (hi - lo)
const int = (lo: number, hi: number) => Math.floor(between(lo, hi + 1))
const ALNUM = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz0123456789'
const sfId = (prefix: string) => prefix + Array.from({ length: 15 }, () => ALNUM[Math.floor(rnd() * ALNUM.length)]).join('')
const hex = (n: number) => Array.from({ length: n }, () => '0123456789abcdef'[Math.floor(rnd() * 16)]).join('')
const cents = (n: number) => Math.round(n * 100) / 100

// ---------- calendar ----------
export const TODAY = '2027-10-07'
export const CURRENT_PERIOD = '2027-Q3'
export const PERIOD_START = '2027-07-01'
export const PERIOD_END = '2027-09-30'
const DAY = 86400000
const d = (s: string) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10))
const iso = (t: number) => new Date(t).toISOString().slice(0, 10)
const QUARTER_DAYS = (d(PERIOD_END) - d(PERIOD_START)) / DAY + 1 // 92
export const periodLabel = (p: string) => `${p.slice(5)} ${p.slice(0, 4)}`

export const LEGACY_PERIODS: string[] = []
for (let y = 2023; y <= 2026; y++) for (let q = 1; q <= 4; q++) LEGACY_PERIODS.push(`${y}-Q${q}`)
export const PLATFORM_PERIODS = ['2027-Q1', '2027-Q2', '2027-Q3']
export const ALL_PERIODS = [...LEGACY_PERIODS, ...PLATFORM_PERIODS]
const periodEnd = (p: string) => {
  const y = +p.slice(0, 4), q = +p.slice(6)
  return iso(Date.UTC(y, q * 3, 0))
}

// ---------- users ----------
export const USERS: User[] = [
  { id: 'u1', name: 'Maya Chen', role: 'preparer', title: 'Finance analyst · preparer' },
  { id: 'u2', name: 'Daniel Okafor', role: 'reviewer', title: 'Finance controller · approver' },
  { id: 'u3', name: 'Priya Raman', role: 'rules', title: 'Compensation · rules approver' },
  { id: 'u4', name: 'Jordan Alvarez', role: 'rules', title: 'Legal · rules approver' },
  { id: 'u5', name: 'Tom Becker', role: 'dataowner', title: 'Sales Operations · data owner' },
  { id: 'u6', name: 'Lena Ford', role: 'payroll', title: 'Payroll operator' },
  { id: 'u7', name: 'Rosa Singh', role: 'auditor', title: 'Internal audit · read-only' },
  { id: 'u8', name: 'Sam Ito', role: 'admin', title: 'Platform admin' },
]
export const userName = (id?: string) => USERS.find(u => u.id === id)?.name ?? id ?? '—'

// ---------- payees ----------
const FIRST = ['Avery', 'Jordan', 'Morgan', 'Elena', 'Marcus', 'Hannah', 'Rahul', 'Sofia', 'Grace', 'Omar', 'Lucas', 'Nadia', 'Victor', 'Chloe', 'Ethan', 'Imani', 'Theo', 'Leah', 'Samir', 'Julia', 'Kenji', 'Amara', 'Felix', 'Ruth', 'Diego', 'Mei', 'Owen', 'Zara', 'Henry', 'Ines']
const LAST = ['Whitfield', 'Okonkwo', 'Larsen', 'Moreau', 'Patel', 'Brennan', 'Castillo', 'Nakamura', 'Fischer', 'Adeyemi', 'Holloway', 'Kowalski', 'Mendez', 'Sato', 'Gallagher', 'Haddad', 'Lindqvist', 'Romero', 'Thornton', 'Vasquez', 'Abernathy', 'Duarte', 'Ellison', 'Kaur', 'Novak', 'Osei', 'Pemberton', 'Quinn', 'Reyes', 'Steiner', 'Takahashi', 'Underwood', 'Varga', 'Winslow', 'Yilmaz', 'Zhang']

const popFor = (i: number): Population => (i < 40 ? 'Advisor' : i < 56 ? 'Referrer' : i < 64 ? 'Partner' : 'Non-advisor')
const repPrefix: Record<Population, string> = { Advisor: 'A', Referrer: 'R', Partner: 'P', 'Non-advisor': 'N' }

export const PAYEES: Payee[] = Array.from({ length: 70 }, (_, i) => {
  const name = `${FIRST[i % FIRST.length]} ${LAST[(i * 7 + 3) % LAST.length]}`
  const population = popFor(i)
  const id = sfId('003')
  let startDate = `${int(2012, 2025)}-${String(int(1, 12)).padStart(2, '0')}-01`
  let status: Payee['status'] = 'Active'
  let endDate: string | undefined
  if (i === 38) startDate = '2027-08-01'
  if (i === 39) startDate = '2027-09-01'
  if (i === 55) startDate = '2027-07-20'
  if (i === 12 || i === 45) { status = 'Terminated'; endDate = '2027-08-15' }
  return {
    id, name, population, status, startDate, endDate,
    repCodes: population === 'Partner' || population === 'Non-advisor' ? [] : [`${repPrefix[population]}${100 + i}`],
    channel: population === 'Partner' || i % 11 === 0 ? 'AP' : 'Payroll',
    email: `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@ieq.example`,
    folderOwner: i === 27 ? sfId('003') : id,
  }
})
// payee 17 has no rep code (missing rep code exception)
PAYEES[17].repCodes = []
const P = (i: number) => PAYEES[i]
export const payeeById = (id?: string) => PAYEES.find(p => p.id === id)
export const payeeName = (id?: string) => payeeById(id)?.name ?? '—'

// ---------- clients & revenue ----------
const SUFFIX = ['Family Trust', 'Household', 'Foundation', 'Holdings LLC', 'Revocable Trust', '& Associates', 'Family Office', 'Living Trust']
export const CLIENTS: Client[] = Array.from({ length: 220 }, (_, i) => {
  // unique last-name × suffix combinations (5k mod 8 cycles through all suffixes)
  const name = `${LAST[i % LAST.length]} ${SUFFIX[(i + Math.floor(i / LAST.length)) % SUFFIX.length]}`
  return { id: sfId('001'), name, household: `HH-${1000 + Math.floor(i / 2)}` }
})
export const clientById = (id?: string) => CLIENTS.find(c => c.id === id)
export const clientName = (id?: string) => clientById(id)?.name ?? '—'

export const REVENUE: RevenueRecord[] = CLIENTS.map((c, i) => {
  const amt = cents(Math.exp(between(Math.log(2500), Math.log(90000))))
  const stub = i % 23 === 7
  return { id: `REV-${String(i + 1).padStart(5, '0')}`, clientId: c.id, period: CURRENT_PERIOD, amount: stub ? cents(amt * 0.4) : amt, type: stub ? 'Stub' : 'Fee', source: stub ? 'CRMA stub dataset' : 'CRMA fee dataset' }
})
const revFor = (clientId: string) => REVENUE.find(r => r.clientId === clientId)!

// ---------- splits ----------
export const SPLITS: SplitAssignment[] = []
const advisorsActive = Array.from({ length: 38 }, (_, i) => i).filter(i => i !== 12 && i !== 17)
let splitSeq = 1
const addSplit = (clientId: string, pi: number, pct: number, from = '2024-01-01', to?: string) =>
  SPLITS.push({ id: `SPL-${String(splitSeq++).padStart(5, '0')}`, clientId, payeeId: P(pi).id, pct, repCode: P(pi).repCodes[0] ?? '—', from, to })

export const BROKEN_SPLIT_CLIENTS: string[] = []
CLIENTS.forEach((c, i) => {
  // mid-quarter changes (stub periods)
  if (i < 6) { const prev = advisorsActive[i * 3]; addSplit(c.id, prev, 100, '2021-04-01', '2027-07-31'); addSplit(c.id, 38, 100, '2027-08-01'); return }
  if (i >= 6 && i < 10) { addSplit(c.id, 12, 100, '2019-01-01', '2027-08-15'); addSplit(c.id, 5, 100, '2027-08-16'); return }
  if (i >= 10 && i < 13) { addSplit(c.id, 7, 100, '2020-01-01', '2027-08-31'); addSplit(c.id, 39, 100, '2027-09-01'); return }
  if (i === 13) { addSplit(c.id, 17, 100); return } // payee without rep code
  const pattern = rnd()
  const a = pick(advisorsActive)
  if (i === 40) { addSplit(c.id, a, 60); addSplit(c.id, (a + 3) % 36 + 1, 30); BROKEN_SPLIT_CLIENTS.push(c.id); return } // 90%
  if (i === 91) { addSplit(c.id, a, 70); addSplit(c.id, (a + 5) % 36 + 1, 40); BROKEN_SPLIT_CLIENTS.push(c.id); return } // 110%
  if (pattern < 0.6) addSplit(c.id, a, 100)
  else if (pattern < 0.9) { addSplit(c.id, a, 60); addSplit(c.id, advisorsActive[(advisorsActive.indexOf(a) + 4) % advisorsActive.length], 40) }
  else { addSplit(c.id, a, 50); addSplit(c.id, advisorsActive[(advisorsActive.indexOf(a) + 2) % advisorsActive.length], 30); addSplit(c.id, advisorsActive[(advisorsActive.indexOf(a) + 9) % advisorsActive.length], 20) }
})
export const OVERLAP_CLIENT = CLIENTS[57].id

// ---------- step-down plans ----------
export const STEP_DOWN_PLANS: StepDownPlan[] = [
  { id: 'SD-1', name: 'Referral standard 5-year', version: 2, effectiveFrom: '2025-01-01', attachedTo: 11, steps: [{ fromYear: 0, toYear: 1, pct: 30 }, { fromYear: 1, toYear: 2, pct: 25 }, { fromYear: 2, toYear: 3, pct: 20 }, { fromYear: 3, toYear: 5, pct: 10 }, { fromYear: 5, toYear: null, pct: 5 }] },
  { id: 'SD-2', name: 'Referral legacy 2019', version: 1, effectiveFrom: '2019-01-01', attachedTo: 5, steps: [{ fromYear: 0, toYear: 3, pct: 25 }, { fromYear: 3, toYear: null, pct: 15 }] },
  { id: 'SD-3', name: 'Rep-code book transition', version: 1, effectiveFrom: '2026-07-01', attachedTo: 3, steps: [{ fromYear: 0, toYear: 1, pct: 50 }, { fromYear: 1, toYear: 2, pct: 75 }, { fromYear: 2, toYear: null, pct: 100 }] },
]
const stepFor = (plan: StepDownPlan, years: number) => plan.steps.find(s => years >= s.fromYear && (s.toYear === null || years < s.toYear))!

// ---------- rules register ----------
const RULES_VERSION = 'RV-2027.07'
export const RULE_ENTRIES: RuleEntry[] = []
PAYEES.forEach((p, i) => {
  const pop = p.population
  const base = {
    payeeId: p.id, proration: 'Calendar days' as const, channel: p.channel,
    approvedBy: i % 2 ? 'u3' : 'u4', approvedAt: '2027-06-24',
    provenance: i < 64 && p.startDate < '2026-01-01' ? `Seeded from Q${(i % 4) + 1} 2026 workbook, tab "${p.name.split(' ')[1]}"` : undefined,
  }
  const versions = i % 9 === 0 ? 2 : 1
  for (let v = 1; v <= versions; v++) {
    const isCurrent = v === versions
    const from = v === 1 ? (p.startDate > '2025-01-01' ? p.startDate : '2025-01-01') : '2027-04-01'
    const to = isCurrent ? p.endDate : '2027-03-31'
    const id = `RE-${String(i + 1).padStart(3, '0')}-v${v}`
    if (pop === 'Advisor') RULE_ENTRIES.push({ ...base, id, version: v, effectiveFrom: from, effectiveTo: to, archetype: 'A', basis: 'Client revenue × split %', pct: cents(30 + (i % 7) * 2.5 + (isCurrent ? 0 : -2.5)), })
    else if (pop === 'Referrer') RULE_ENTRIES.push({ ...base, id, version: v, effectiveFrom: from, effectiveTo: to, archetype: 'B', basis: 'Referred client revenue × step %', pct: 0, stepDownPlanId: i % 3 === 0 ? 'SD-2' : 'SD-1' })
    else if (pop === 'Partner') RULE_ENTRIES.push({ ...base, id, version: v, effectiveFrom: from, effectiveTo: to, archetype: 'C', basis: 'Firm net revenue pool', pct: cents(0.6 + (i - 56) * 0.25), cap: i === 58 ? 30000 : undefined })
    else RULE_ENTRIES.push({ ...base, id, version: v, effectiveFrom: from, effectiveTo: to, archetype: 'C', basis: i === 69 ? 'Named client set (0 clients in period)' : 'Operations bonus pool', pct: cents(3 + (i - 64) * 1.1), floor: i === 66 ? 5000 : undefined })
  }
})
export const currentRule = (payeeId: string) => RULE_ENTRIES.filter(r => r.payeeId === payeeId).sort((a, b) => b.version - a.version)[0]

export const RULE_CHANGES: RuleChange[] = [
  { id: 'RC-118', payeeId: P(3).id, summary: 'Payout rate increase after book review', field: 'Rate', before: `${currentRule(P(3).id).pct}%`, after: `${currentRule(P(3).id).pct + 2.5}%`, effectiveFrom: '2027-10-01', author: 'u3', createdAt: '2027-10-03', status: 'Pending', reason: 'Annual comp review; memo CR-2027-14' },
  { id: 'RC-119', payeeId: P(44).id, summary: 'Move to standard 5-year step-down', field: 'Step-down plan', before: 'SD-2 Referral legacy 2019 v1', after: 'SD-1 Referral standard 5-year v2', effectiveFrom: '2027-10-01', author: 'u1', createdAt: '2027-10-04', status: 'Pending', reason: 'Referral agreement renewed 2027-09-12' },
  { id: 'RC-120', payeeId: P(60).id, summary: 'Add annual cap', field: 'Cap', before: 'none', after: '$120,000 / quarter', effectiveFrom: '2027-10-01', author: 'u4', createdAt: '2027-10-05', status: 'Pending', reason: 'Partner agreement amendment #3' },
  { id: 'RC-121', payeeId: P(66).id, summary: 'Switch payment channel', field: 'Channel', before: 'Payroll', after: 'AP', effectiveFrom: '2027-10-01', author: 'u1', createdAt: '2027-10-06', status: 'Pending', reason: 'Converted to contractor 2027-09-30' },
  { id: 'RC-112', payeeId: P(38).id, summary: 'New advisor from Advisor template', field: 'Entry', before: '—', after: 'Archetype A · 30% · A138', effectiveFrom: '2027-08-01', author: 'u1', createdAt: '2027-07-28', status: 'Approved', approver: 'u3', decidedAt: '2027-07-29', reason: 'New hire offer letter' },
  { id: 'RC-109', payeeId: P(12).id, summary: 'End-date terms on termination', field: 'Effective to', before: 'open', after: '2027-08-15', effectiveFrom: '2027-08-15', author: 'u1', createdAt: '2027-08-16', status: 'Approved', approver: 'u4', decidedAt: '2027-08-17', reason: 'HR termination notice' },
  { id: 'RC-104', payeeId: P(22).id, summary: 'Floor of $8,000', field: 'Floor', before: 'none', after: '$8,000', effectiveFrom: '2027-07-01', author: 'u3', createdAt: '2027-06-20', status: 'Rejected', approver: 'u4', decidedAt: '2027-06-22', reason: 'Not supported by agreement' },
]

export const OVERRIDES: Override[] = [
  { id: 'OV-07', payeeId: P(8).id, description: 'Guaranteed minimum $12,500 for Q3–Q4 2027', reason: 'Transition guarantee', document: 'Offer-letter-2027-05.pdf', approver: 'u3', expires: '2027-12-31' },
  { id: 'OV-09', payeeId: P(21).id, description: 'Exclude client HH-1044 from split', reason: 'Client disputes advisor of record', document: 'Legal-hold-note.pdf', approver: 'u4', expires: '2027-11-30' },
  { id: 'OV-11', payeeId: P(58).id, description: 'Quarterly cap $30,000', reason: 'Partner agreement §4.2', document: 'Partner-agmt-v3.pdf', approver: 'u4', expires: '2028-06-30' },
  { id: 'OV-12', payeeId: P(47).id, description: 'Referral tenure reset to 2026-01-01', reason: 'Re-referral of returning client', document: 'Comp-memo-2026-02.pdf', approver: 'u3', expires: '2028-12-31' },
]

// ---------- calculation ----------
const overlapDays = (from: string, to: string | undefined) => {
  const s = Math.max(d(from), d(PERIOD_START)), e = Math.min(d(to ?? '2999-12-31'), d(PERIOD_END))
  return e < s ? 0 : (e - s) / DAY + 1
}
const pieceLabel = (from: string, to: string | undefined, days: number) => {
  if (days === QUARTER_DAYS) return 'Full quarter'
  const s = iso(Math.max(d(from), d(PERIOD_START))), e = iso(Math.min(d(to ?? '2999-12-31'), d(PERIOD_END)))
  const fmt = (x: string) => new Date(d(x)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  return `${fmt(s)}–${fmt(e)} (${days}/${QUARTER_DAYS} d)`
}

const CURRENT_RUN_ID = 'RUN-2027Q3-01'
let lineSeq = 1
const lineId = () => `AL-${String(lineSeq++).padStart(5, '0')}`
export const LINES: AllocationLine[] = []

// A + D: advisors on client revenue × split, with stub pieces
SPLITS.forEach(s => {
  const days = overlapDays(s.from, s.to)
  if (!days) return
  const rev = revFor(s.clientId)
  const rule = currentRule(s.payeeId)
  const basisAmount = cents(rev.amount * (days / QUARTER_DAYS) * (s.pct / 100))
  LINES.push({ id: lineId(), runId: CURRENT_RUN_ID, payeeId: s.payeeId, clientId: s.clientId, piece: pieceLabel(s.from, s.to, days), basis: `Revenue × ${s.pct}% split`, basisAmount, rate: rule.pct, amount: cents(basisAmount * rule.pct / 100), archetype: days < QUARTER_DAYS ? 'D' : 'A', lineage: { revenueIds: [rev.id], splitId: s.id, ruleEntryId: rule.id } })
})
// B: referrers with step-down
export const REFERRALS: { clientId: string; payeeId: string; start: string }[] = []
for (let k = 0; k < 44; k++) {
  const ci = 14 + k * 4
  const ri = 40 + (k % 16)
  const start = ri === 55 ? '2027-07-20' : `${int(2019, 2027) === 2027 ? 2026 : int(2019, 2026)}-${String(int(1, 12)).padStart(2, '0')}-01`
  REFERRALS.push({ clientId: CLIENTS[ci].id, payeeId: P(ri).id, start })
}
REFERRALS.forEach(r => {
  const rev = revFor(r.clientId)
  const rule = currentRule(r.payeeId)
  const plan = STEP_DOWN_PLANS.find(p => p.id === rule.stepDownPlanId)!
  const years = Math.max(0, (d(PERIOD_START) - d(r.start)) / (365.25 * DAY))
  const step = stepFor(plan, years)
  const days = overlapDays(r.start, undefined)
  const basisAmount = cents(rev.amount * days / QUARTER_DAYS)
  LINES.push({ id: lineId(), runId: CURRENT_RUN_ID, payeeId: r.payeeId, clientId: r.clientId, piece: pieceLabel(r.start, undefined, days), basis: `Referred revenue · tenure ${years.toFixed(1)} y`, basisAmount, rate: step.pct, amount: cents(basisAmount * step.pct / 100), archetype: days < QUARTER_DAYS ? 'D' : 'B', lineage: { revenueIds: [rev.id], ruleEntryId: rule.id, stepDownStep: `${plan.id} v${plan.version} · ${step.fromYear}–${step.toYear ?? '∞'} y → ${step.pct}%` } })
})
// C: partners & non-advisors
export const TOTAL_REVENUE = cents(REVENUE.reduce((a, r) => a + r.amount, 0))
export const PARTNER_POOL = cents(TOTAL_REVENUE * 0.22)
export const OPS_POOL = 180000
PAYEES.slice(56).forEach((p, k) => {
  const rule = currentRule(p.id)
  const isPartner = p.population === 'Partner'
  const basisAmount = isPartner ? PARTNER_POOL : rule.basis.startsWith('Named') ? 0 : OPS_POOL
  let amount = cents(basisAmount * rule.pct / 100)
  if (rule.cap) amount = Math.min(amount, rule.cap)
  LINES.push({ id: lineId(), runId: CURRENT_RUN_ID, payeeId: p.id, piece: 'Full quarter', basis: rule.basis + (rule.cap ? ` · capped $${rule.cap.toLocaleString()}` : ''), basisAmount, rate: rule.pct, amount, archetype: 'C', lineage: { revenueIds: isPartner ? ['POOL-NETREV-2027Q3'] : basisAmount ? ['POOL-OPS-2027Q3'] : [], ruleEntryId: rule.id } })
})

// E: adjustments / true-ups
export const ADJUSTMENTS: Adjustment[] = [
  { id: 'ADJ-031', runId: CURRENT_RUN_ID, payeeId: P(21).id, originalRunId: 'RUN-2027Q2-01', amount: 1240.55, reason: 'Q2 split for Holloway Family Trust missed (Q-2207)', status: 'Approved', createdBy: 'u1' },
  { id: 'ADJ-032', runId: CURRENT_RUN_ID, payeeId: P(9).id, originalRunId: 'RUN-2027Q2-01', amount: -310.0, reason: 'Fee reversal on terminated client account', status: 'Approved', createdBy: 'u1' },
  { id: 'ADJ-033', runId: CURRENT_RUN_ID, payeeId: P(47).id, originalRunId: 'RUN-2027Q1-01', amount: 562.4, reason: 'Referral tenure reset (OV-12) applied retroactively', status: 'Draft', createdBy: 'u1' },
]
ADJUSTMENTS.forEach(a => LINES.push({ id: lineId(), runId: CURRENT_RUN_ID, payeeId: a.payeeId, piece: 'Adjustment', basis: `True-up vs ${a.originalRunId}: ${a.reason}`, basisAmount: a.amount, rate: 100, amount: a.amount, archetype: 'E', lineage: { revenueIds: [], ruleEntryId: currentRule(a.payeeId).id } }))

export const payeeTotal = (payeeId: string) => cents(LINES.filter(l => l.payeeId === payeeId).reduce((a, l) => a + l.amount, 0))

// ---------- period history ----------
export const PERIOD_TOTALS: Record<string, Record<string, number>> = {}
PAYEES.forEach((p, i) => {
  const cur = payeeTotal(p.id)
  const t: Record<string, number> = { [CURRENT_PERIOD]: cur }
  const base = i === 12 ? cur * 1.9 : i === 45 ? cur : cur || 4200
  let v = base
  for (let k = ALL_PERIODS.length - 2; k >= 0; k--) {
    const per = ALL_PERIODS[k]
    if (periodEnd(per) < p.startDate) break
    let val = v * between(0.9, 1.08)
    if (per === '2027-Q2' && i === 3) val = cur / 1.42
    if (per === '2027-Q2' && i === 50) val = cur / 0.64
    t[per] = cents(val)
    v = val / between(0.98, 1.05)
  }
  PERIOD_TOTALS[p.id] = t
})
export const periodRunTotal = (per: string) => cents(PAYEES.reduce((a, p) => a + (PERIOD_TOTALS[p.id][per] ?? 0), 0))

// ---------- snapshots ----------
export const SNAPSHOTS: Snapshot[] = [
  { id: 'SNP-2027Q3-2', period: '2027-Q3', seq: 2, lockedAt: '2027-10-05 09:42', lockedBy: 'u1', counts: { clients: 14, revenue: 14, splits: 19, payees: 6 }, sourceHash: hex(12), durationSec: 41, partialOf: 'SNP-2027Q3-1', note: 'Partial re-snapshot after Sales Ops fixed revenue-without-client and duplicate rep code' },
  { id: 'SNP-2027Q3-1', period: '2027-Q3', seq: 1, lockedAt: '2027-10-02 07:15', lockedBy: 'u1', counts: { clients: CLIENTS.length, revenue: REVENUE.length, splits: SPLITS.length, payees: PAYEES.length }, sourceHash: hex(12), durationSec: 212 },
  { id: 'SNP-2027Q2-1', period: '2027-Q2', seq: 1, lockedAt: '2027-07-02 07:08', lockedBy: 'u1', counts: { clients: 214, revenue: 214, splits: 331, payees: 67 }, sourceHash: hex(12), durationSec: 198 },
  { id: 'SNP-2027Q1-2', period: '2027-Q1', seq: 2, lockedAt: '2027-04-06 14:20', lockedBy: 'u1', counts: { clients: 3, revenue: 3, splits: 5, payees: 2 }, sourceHash: hex(12), durationSec: 22, partialOf: 'SNP-2027Q1-1', note: 'Re-pull after split correction on 3 clients' },
  { id: 'SNP-2027Q1-1', period: '2027-Q1', seq: 1, lockedAt: '2027-04-02 07:30', lockedBy: 'u1', counts: { clients: 209, revenue: 209, splits: 322, payees: 66 }, sourceHash: hex(12), durationSec: 231 },
]

export const DQ_CHECKS = [
  { check: 'Missing rep code', count: 1, severity: 'Blocking' },
  { check: 'Splits not summing to 100%', count: BROKEN_SPLIT_CLIENTS.length, severity: 'Blocking' },
  { check: 'Overlapping effective dates', count: 1, severity: 'Blocking' },
  { check: 'Payee without population', count: 0, severity: 'Blocking' },
  { check: 'Revenue without client', count: 0, severity: 'Blocking' },
  { check: 'Negative or null amounts', count: 0, severity: 'Blocking' },
  { check: 'Stub-period client-periods marked (ING-5)', count: 13 + 2, severity: 'Info' },
]

// ---------- runs ----------
const runTotal = cents(LINES.reduce((a, l) => a + l.amount, 0))
export const RUNS: Run[] = [
  { id: CURRENT_RUN_ID, period: '2027-Q3', snapshotId: 'SNP-2027Q3-2', rulesVersion: RULES_VERSION, state: 'Calculated', preparer: 'u1', total: runTotal, payeeCount: PAYEES.length, legacy: false, history: [{ state: 'Open', at: '2027-10-01 08:00', by: 'u1' }, { state: 'Snapshotted', at: '2027-10-02 07:15', by: 'u1' }, { state: 'Calculated', at: '2027-10-05 09:51', by: 'system' }] },
  { id: 'RUN-2027Q2-01', period: '2027-Q2', snapshotId: 'SNP-2027Q2-1', rulesVersion: 'RV-2027.04', state: 'Closed', preparer: 'u1', approver: 'u2', submittedAt: '2027-07-12', approvedAt: '2027-07-14', total: periodRunTotal('2027-Q2'), payeeCount: 67, legacy: false, history: [{ state: 'Open', at: '2027-07-01 08:00', by: 'u1' }, { state: 'Snapshotted', at: '2027-07-02 07:08', by: 'u1' }, { state: 'Calculated', at: '2027-07-02 07:19', by: 'system' }, { state: 'In review', at: '2027-07-12 16:40', by: 'u1' }, { state: 'Approved', at: '2027-07-14 10:05', by: 'u2' }, { state: 'Published', at: '2027-07-14 11:30', by: 'u1' }, { state: 'Paid', at: '2027-07-30 09:00', by: 'u6' }, { state: 'Closed', at: '2027-08-06 17:00', by: 'u2' }] },
  { id: 'RUN-2027Q1-01', period: '2027-Q1', snapshotId: 'SNP-2027Q1-2', rulesVersion: 'RV-2027.01', state: 'Closed', preparer: 'u1', approver: 'u2', submittedAt: '2027-04-15', approvedAt: '2027-04-16', total: periodRunTotal('2027-Q1'), payeeCount: 66, legacy: false,
    shadow: { excelTotal: cents(periodRunTotal('2027-Q1') + 412.37), matchedLines: 401, totalLines: 407, diffs: [
      { payee: P(4).name, engine: 18422.1, excel: 18422.13, cause: 'Rounding: Excel rounds total, engine rounds lines (CALC-4)' },
      { payee: P(21).name, engine: 9310.55, excel: 9720.0, cause: 'Workbook formula referenced stale split (Excel error)' },
      { payee: P(44).name, engine: 2210.0, excel: 2212.24, cause: 'Step-down boundary: Excel used quarter end, register uses start' },
    ] },
    history: [{ state: 'Open', at: '2027-04-01 08:00', by: 'u1' }, { state: 'Closed', at: '2027-05-09 17:00', by: 'u2' }] },
  ...LEGACY_PERIODS.slice().reverse().map(per => ({ id: `LEG-${per.replace('-', '')}`, period: per, snapshotId: '—', rulesVersion: 'Imported', state: 'Closed' as const, preparer: 'import', total: periodRunTotal(per), payeeCount: PAYEES.filter(p => PERIOD_TOTALS[p.id][per] !== undefined).length, legacy: true, history: [] })),
]

// ---------- exceptions ----------
const ex = (n: number, e: Omit<ExceptionItem, 'id' | 'runId' | 'comments' | 'createdAt'> & { comments?: ExceptionItem['comments']; createdAt?: string }): ExceptionItem =>
  ({ id: `EX-${3000 + n}`, runId: CURRENT_RUN_ID, comments: [], createdAt: '2027-10-05 09:51', ...e })
const variance = (i: number) => {
  const cur = PERIOD_TOTALS[P(i).id]['2027-Q3'], prev = PERIOD_TOTALS[P(i).id]['2027-Q2']
  return `${P(i).name}: ${((cur / prev - 1) * 100).toFixed(1)}% vs Q2 2027 ($${Math.round(prev).toLocaleString()} → $${Math.round(cur).toLocaleString()})`
}
export const EXCEPTIONS: ExceptionItem[] = [
  ex(1, { type: 'Splits ≠ 100%', check: 'VAL-1', severity: 'Blocking', clientId: BROKEN_SPLIT_CLIENTS[0], sfRecord: BROKEN_SPLIT_CLIENTS[0], detail: `${clientName(BROKEN_SPLIT_CLIENTS[0])}: splits sum to 90%`, owner: 'u5', status: 'Open' }),
  ex(2, { type: 'Splits ≠ 100%', check: 'VAL-1', severity: 'Blocking', clientId: BROKEN_SPLIT_CLIENTS[1], sfRecord: BROKEN_SPLIT_CLIENTS[1], detail: `${clientName(BROKEN_SPLIT_CLIENTS[1])}: splits sum to 110%`, owner: 'u5', status: 'In progress', comments: [{ by: 'u5', at: '2027-10-06 11:02', text: 'Confirming with advisor team which split is current.' }] }),
  ex(3, { type: 'Missing rep code', check: 'ING-4', severity: 'Blocking', payeeId: P(17).id, sfRecord: P(17).id, detail: `${P(17).name} has split assignments but no rep code`, owner: 'u5', status: 'Routed' }),
  ex(4, { type: 'Overlapping effective dates', check: 'ING-4', severity: 'Blocking', clientId: OVERLAP_CLIENT, sfRecord: OVERLAP_CLIENT, detail: `${clientName(OVERLAP_CLIENT)}: two split records overlap 2027-08-01 → 2027-08-09`, owner: 'u1', status: 'Open' }),
  ex(5, { type: 'Variance > 25%', check: 'VAL-5', severity: 'Warning', payeeId: P(3).id, detail: variance(3), owner: 'u1', status: 'Open' }),
  ex(6, { type: 'Variance > 25%', check: 'VAL-5', severity: 'Warning', payeeId: P(50).id, detail: variance(50), owner: 'u1', status: 'Open' }),
  ex(7, { type: 'Variance > 25%', check: 'VAL-5', severity: 'Warning', payeeId: P(12).id, detail: variance(12) + ' — terminated 2027-08-15 (stub)', owner: 'u1', status: 'Resolved', comments: [{ by: 'u1', at: '2027-10-06 09:30', text: 'Expected: partial quarter after termination.' }] }),
  ex(8, { type: 'New payee', check: 'VAL-5', severity: 'Warning', payeeId: P(38).id, detail: `${P(38).name} started 2027-08-01 (stub, 61/92 days)`, owner: 'u1', status: 'Open' }),
  ex(9, { type: 'New payee', check: 'VAL-5', severity: 'Warning', payeeId: P(39).id, detail: `${P(39).name} started 2027-09-01 (stub, 30/92 days)`, owner: 'u1', status: 'Open' }),
  ex(10, { type: 'New payee', check: 'VAL-5', severity: 'Warning', payeeId: P(55).id, detail: `${P(55).name} referral started 2027-07-20 (stub, 73/92 days)`, owner: 'u1', status: 'Resolved', comments: [{ by: 'u1', at: '2027-10-06 09:34', text: 'Matches referral agreement.' }] }),
  ex(11, { type: 'Terminated payee with activity', check: 'VAL-5', severity: 'Warning', payeeId: P(45).id, detail: `${P(45).name} terminated 2027-08-15 but has full-quarter referral lines`, owner: 'u3', status: 'Open' }),
  ex(12, { type: 'Zero-amount schedule', check: 'VAL-5', severity: 'Warning', payeeId: P(69).id, detail: `${P(69).name}: named client set has no revenue this period`, owner: 'u1', status: 'Open' }),
  ex(13, { type: 'Folder owner mismatch', check: 'DIST-1', severity: 'Warning', payeeId: P(27).id, detail: `SharePoint folder for ${P(27).name} is owned by a different identity; delivery will be refused`, owner: 'u8', status: 'Open' }),
  ex(14, { type: 'Revenue without client', check: 'ING-4', severity: 'Blocking', detail: 'REV-00231 referenced deleted Account 001… (merged)', owner: 'u5', status: 'Resolved', createdAt: '2027-10-02 07:16', comments: [{ by: 'u5', at: '2027-10-04 15:10', text: 'Re-parented to surviving account; re-snapshot seq 2.' }] }),
  ex(15, { type: 'Missing rep code', check: 'ING-4', severity: 'Blocking', payeeId: P(30).id, detail: `${P(30).name} duplicate rep code A130 / A131`, owner: 'u5', status: 'Resolved', createdAt: '2027-10-02 07:16', comments: [{ by: 'u5', at: '2027-10-04 16:00', text: 'Retired A131 in Salesforce.' }] }),
  ex(16, { type: 'Override expiring', check: 'REG-4', severity: 'Warning', payeeId: P(21).id, detail: 'OV-09 expires 2027-11-30 — confirm renewal with Legal', owner: 'u4', status: 'Open' }),
]

// ---------- validation inputs ----------
export const CRMA_FEE_TOTAL = cents(REVENUE.filter(r => r.type === 'Fee').reduce((a, r) => a + r.amount, 0))
export const CRMA_STUB_TOTAL = cents(REVENUE.filter(r => r.type === 'Stub').reduce((a, r) => a + r.amount, 0))
export const GL_ACCRUAL = cents(runTotal * 1.00041)
export const GL_TOLERANCE = 2500

// ---------- schedules (Q2 published, plus reissues) ----------
export const SCHEDULES: ScheduleVersion[] = []
PAYEES.forEach((p, i) => {
  const total = PERIOD_TOTALS[p.id]['2027-Q2']
  if (total === undefined) return
  const id = `SCH-2027Q2-${String(i + 1).padStart(3, '0')}-v1`
  const delivery = i % 4 === 0 ? 'Portal' : 'Portal + folder'
  const reissued = i === 21 || i === 4 || i === 33
  const ack: ScheduleVersion['ack'] = i % 7 === 3 ? { at: '2027-07-21 17:00', kind: 'Deemed accepted' } : { at: `2027-07-${String(15 + (i % 5)).padStart(2, '0')} ${10 + (i % 8)}:${String(i % 60).padStart(2, '0')}`, kind: 'Acknowledged' }
  SCHEDULES.push({ id, runId: 'RUN-2027Q2-01', period: '2027-Q2', payeeId: p.id, version: 1, total: reissued ? cents(total - 412.1) : total, checksum: 'sha256:' + hex(16), publishedAt: '2027-07-14 11:30', delivery, ownerCheck: 'Pass', ack: reissued ? undefined : ack, supersededBy: reissued ? id.replace('v1', 'v2') : undefined })
  if (reissued) SCHEDULES.push({ id: id.replace('v1', 'v2'), runId: 'RUN-2027Q2-01', period: '2027-Q2', payeeId: p.id, version: 2, total, checksum: 'sha256:' + hex(16), publishedAt: '2027-07-24 15:10', delivery, ownerCheck: 'Pass', changeSummary: i === 21 ? '+$412.10: split on Holloway Family Trust corrected 40% → 50% (ADJ-024)' : '+$412.10: stub piece for client onboarded 2027-05-12 added', ack: { at: '2027-07-26 09:12', kind: 'Acknowledged' } })
})

export const QUESTIONS: QuestionThread[] = [
  { id: 'Q-2207', scheduleId: `SCH-2027Q2-022-v2`, payeeId: P(21).id, lineRef: 'Holloway Family Trust', subject: 'Holloway split looks like 50%, expected 60%', status: 'Resolved', slaDue: '2027-07-31', adjustmentId: 'ADJ-031', messages: [
    { by: P(21).id, at: '2027-07-27 10:20', text: 'The Holloway Family Trust line shows 50%. My agreement with the co-advisor is 60/40 from June.' },
    { by: 'u1', at: '2027-07-28 14:05', text: 'Confirmed with Sales Ops — the split change was entered with the wrong effective date. We will true up in the Q3 run (ADJ-031).' },
    { by: P(21).id, at: '2027-07-28 15:00', text: 'Thanks, that works.' } ] },
  { id: 'Q-2215', scheduleId: 'SCH-2027Q2-005-v1', payeeId: P(4).id, subject: 'Missing new client from May', status: 'Resolved', slaDue: '2027-07-22', messages: [
    { by: P(4).id, at: '2027-07-16 09:00', text: 'I onboarded a client on 12 May; it is not on my schedule.' },
    { by: 'u1', at: '2027-07-17 11:40', text: 'Stub piece added; reissued as v2 with the change summary.' } ] },
  { id: 'Q-2231', scheduleId: 'SCH-2027Q2-045-v1', payeeId: P(44).id, lineRef: 'Referral step', subject: 'Why did my referral rate drop to 10%?', status: 'Answered', slaDue: '2027-10-08', messages: [
    { by: P(44).id, at: '2027-10-01 13:22', text: 'The referral rate on the Larsen account went from 20% to 10%.' },
    { by: 'u1', at: '2027-10-04 10:15', text: 'Your referral passed its 3-year anniversary on 1 April, which moves it to the 10% step of the legacy plan. A renewal proposal (RC-119) is with Compensation.' } ] },
  { id: 'Q-2236', scheduleId: 'SCH-2027Q2-010-v1', payeeId: P(9).id, subject: 'Fee reversal on closed account', status: 'Open', slaDue: '2027-10-11', messages: [
    { by: P(9).id, at: '2027-10-05 16:48', text: 'I see a negative adjustment coming for a closed account — can you share the detail?' } ] },
  { id: 'Q-2238', scheduleId: 'SCH-2027Q2-002-v1', payeeId: P(1).id, subject: 'Can I get the Excel version?', status: 'Open', slaDue: '2027-10-12', messages: [
    { by: P(1).id, at: '2027-10-06 08:30', text: 'Is there a values-only Excel of my Q2 schedule for my accountant?' } ] },
]

// ---------- payroll ----------
export const PAYROLL_BATCHES: PayrollBatch[] = [
  { id: 'PAY-2027Q2', runId: 'RUN-2027Q2-01', format: 'ADP Workforce Now · earnings import v3', fileHash: 'sha256:' + hex(24), generatedAt: '2027-07-15 09:00', approvedBy: 'u2', signedOffBy: 'u6', rows: 67, total: periodRunTotal('2027-Q2') },
]

// ---------- audit log ----------
const AUDIT: AuditEvent[] = []
let auditSeq = 1
const au = (at: string, actor: string, action: string, entity: string, detail: string) => AUDIT.push({ id: `AE-${String(auditSeq++).padStart(6, '0')}`, at, actor, action, entity, detail })
au('2027-07-14 10:05', 'u2', 'Run approved', 'RUN-2027Q2-01', 'Approved total $' + Math.round(periodRunTotal('2027-Q2')).toLocaleString())
au('2027-07-14 11:30', 'u1', 'Schedules published', 'RUN-2027Q2-01', '67 schedules v1 → portal + folders')
au('2027-07-15 09:00', 'u1', 'Payroll file generated', 'PAY-2027Q2', 'ADP import, 67 rows')
au('2027-07-15 14:12', 'u6', 'Tie-out signed', 'PAY-2027Q2', 'Second-person sign-off')
au('2027-07-24 15:10', 'u2', 'Reissue approved', 'SCH-2027Q2-022-v2', 'v2 supersedes v1')
au('2027-07-29 10:01', 'u3', 'Rule change approved', 'RC-112', 'New advisor from template')
au('2027-08-17 12:20', 'u4', 'Rule change approved', 'RC-109', 'End-date on termination')
au('2027-10-01 08:00', 'u1', 'Period opened', '2027-Q3', 'Review window 5 business days')
au('2027-10-02 07:15', 'u1', 'Snapshot locked', 'SNP-2027Q3-1', `${CLIENTS.length} clients, ${SPLITS.length} splits`)
au('2027-10-02 07:16', 'system', 'Data-quality checks', 'SNP-2027Q3-1', '6 exceptions raised')
au('2027-10-03 11:00', 'u3', 'Rule change proposed', 'RC-118', 'Payout rate increase')
au('2027-10-04 09:10', 'u1', 'Rule change proposed', 'RC-119', 'Step-down plan change')
au('2027-10-04 15:10', 'u5', 'Exception resolved', 'EX-3014', 'Re-parented revenue record')
au('2027-10-04 16:00', 'u5', 'Exception resolved', 'EX-3015', 'Retired duplicate rep code')
au('2027-10-05 09:42', 'u1', 'Snapshot locked', 'SNP-2027Q3-2', 'Partial re-snapshot (14 clients)')
au('2027-10-05 09:51', 'system', 'Run calculated', CURRENT_RUN_ID, `${LINES.length} lines, total $${Math.round(runTotal).toLocaleString()}`)
au('2027-10-05 10:30', 'u4', 'Rule change proposed', 'RC-120', 'Add cap')
au('2027-10-06 09:30', 'u1', 'Exception resolved', 'EX-3007', 'Warning acknowledged with comment')
au('2027-10-06 11:02', 'u5', 'Comment added', 'EX-3002', 'Confirming split')
au('2027-10-06 14:00', 'u1', 'Rule change proposed', 'RC-121', 'Channel change')
for (let k = 0; k < 40; k++) {
  const p = P(int(0, 69))
  au(`2027-10-0${int(2, 6)} ${String(int(8, 18)).padStart(2, '0')}:${String(int(0, 59)).padStart(2, '0')}`, p.id, 'Document viewed', `SCH-2027Q2-${String(PAYEES.indexOf(p) + 1).padStart(3, '0')}-v1`, 'Portal download (PDF)')
}
export const AUDIT_EVENTS = AUDIT.sort((a, b) => (a.at < b.at ? 1 : -1))

// ---------- migration ----------
export const LEGACY_WORKBOOKS: LegacyWorkbook[] = []
for (let y = 2019; y <= 2026; y++) for (let q = 1; q <= 4; q++) {
  const per = `${y}-Q${q}`
  const gen = y <= 2020 ? 'G1' : y <= 2022 ? 'G2' : y <= 2024 ? 'G3' : 'G4'
  const total = PAYEES.length && periodRunTotal(per) ? periodRunTotal(per) : cents(1_100_000 + (y - 2019) * 95_000 + q * 8_000 + between(-20000, 20000))
  const disc = (y === 2020 && q === 3) || (y === 2021 && q === 1) || (y === 2022 && q === 4)
  const signed = y === 2026
  const status: LegacyWorkbook['status'] = signed ? 'Signed off' : y >= 2023 ? 'Loaded' : disc ? 'Discrepancy' : y >= 2021 ? 'Validated' : 'Parsed'
  LEGACY_WORKBOOKS.push({ id: `WB-${y}Q${q}`, period: per, file: `Profit Share ${y} Q${q}${gen === 'G1' ? ' FINAL v3' : gen === 'G2' ? ' - Master' : ''}.xlsx`, generation: gen, payees: 38 + (y - 2019) * 4 + Math.floor(q / 2), lines: 210 + (y - 2019) * 28 + q * 3, total, payrollRegister: disc ? cents(total + between(800, 6000)) : total, status, regression: signed ? (q === 2 ? 'Explained diff' : 'Match') : y >= 2023 ? (y === 2024 && q === 1 ? 'Unexplained' : 'Match') : 'Not run' })
}
const LEGACY_VARIANTS = (n: string) => [n.toUpperCase(), n.split(' ').reverse().join(', '), n.replace(/^(\w)\w+/, '$1.'), n + ' (old)']
export const NAME_MAPPINGS: NameMapping[] = [
  ...[2, 6, 11, 19, 24, 31, 42, 47, 52, 59, 61, 65].map((i, k) => ({ id: `MAP-P${k}`, kind: 'Payee' as const, legacyName: LEGACY_VARIANTS(P(i).name)[k % 4], suggestedId: P(i).id, suggestedName: P(i).name, confidence: [0.99, 0.94, 0.87, 0.72][k % 4], status: (k < 5 ? 'Approved' : 'Suggested') as NameMapping['status'] })),
  ...[3, 18, 44, 77, 102, 130, 151, 188, 203].map((i, k) => ({ id: `MAP-C${k}`, kind: 'Client' as const, legacyName: CLIENTS[i].name.replace('Family Trust', 'Fam Tr').replace('Household', 'HH').toUpperCase(), suggestedId: CLIENTS[i].id, suggestedName: CLIENTS[i].name, confidence: [0.97, 0.9, 0.81, 0.66][k % 4], status: (k < 3 ? 'Approved' : 'Suggested') as NameMapping['status'] })),
  { id: 'MAP-X1', kind: 'Payee', legacyName: 'J. Smith (referral)', suggestedId: '—', suggestedName: 'No match found', confidence: 0, status: 'Suggested' },
]

// ---------- admin ----------
export const INTEGRATIONS = [
  { name: 'Salesforce Bulk API 2.0', status: 'Healthy', lastSync: '2027-10-05 09:42', metric: 'API usage 18,420 / 100,000 daily (18%)' },
  { name: 'CRM Analytics (SAQL)', status: 'Healthy', lastSync: '2027-10-05 09:44', metric: 'Fee + stub datasets queried' },
  { name: 'CRM Analytics write-back', status: 'Healthy', lastSync: '2027-08-06 17:05', metric: 'Dataset ieq_allocations_2027Q2' },
  { name: 'Microsoft Graph (SharePoint)', status: 'Degraded', lastSync: '2027-07-14 11:42', metric: '1 folder-owner mismatch; 0 failed uploads' },
  { name: 'Email notifications', status: 'Healthy', lastSync: '2027-10-06 08:00', metric: '0 bounces in 7 days' },
  { name: 'Payroll SFTP (ADP)', status: 'Healthy', lastSync: '2027-07-15 09:01', metric: 'Last file PAY-2027Q2 acknowledged' },
  { name: 'Identity provider (OIDC)', status: 'Healthy', lastSync: 'live', metric: '9 groups mapped to roles' },
  { name: 'Job queue', status: 'Healthy', lastSync: 'live', metric: 'Depth 0 · 4 workers idle' },
]

export const TEMPLATES = [
  { id: 'TPL-A', name: 'Advisor · revenue split', archetype: 'A', params: ['Rep code', 'Payout rate %', 'Start date', 'Payment channel'] },
  { id: 'TPL-B', name: 'Referrer · step-down', archetype: 'B', params: ['Rep code', 'Step-down plan', 'Referral start date', 'Referred clients'] },
  { id: 'TPL-C1', name: 'Partner · pool share', archetype: 'C', params: ['Pool', 'Share %', 'Quarterly cap', 'Start date'] },
  { id: 'TPL-C2', name: 'Non-advisor · flat bonus', archetype: 'C', params: ['Bonus pool', 'Share %', 'Floor', 'Start date'] },
]
