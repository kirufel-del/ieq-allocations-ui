import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, CheckCircle2, Lightbulb, Search } from 'lucide-react'
import { useApp } from '../state/AppContext'
import type { RoleKey } from '../data/types'
import { Badge, Card, cx, PageHeader } from '../components/ui'

type Step = { text: string; to?: string; who?: string }
interface Article {
  id: string
  title: string
  category: 'Getting started' | 'Quarter-close workflow' | 'How-to' | 'Role guides' | 'Reference'
  roles: RoleKey[] | 'all'
  summary: string
  steps?: Step[]
  body?: { h: string; items: string[] }[]
  tips?: string[]
}

const ROLE_LABEL: Record<RoleKey, string> = {
  preparer: 'Preparer', reviewer: 'Approver', rules: 'Rules approver', dataowner: 'Data owner',
  payroll: 'Payroll', auditor: 'Auditor', admin: 'Admin', payee: 'Payee',
}

const ARTICLES: Article[] = [
  {
    id: 'welcome', title: 'Welcome to IEQ Allocations', category: 'Getting started', roles: 'all',
    summary: 'What the platform does and how the prototype works.',
    body: [
      { h: 'What it does', items: [
        'Replaces the quarterly Excel workbooks with one controlled pipeline: snapshot → rules → calculation → validation → approval → schedules → distribution → payroll.',
        'Every number on a schedule can be traced back to the revenue rows, split, rule entry and step-down step that produced it (lineage).',
        'Every action is recorded in an immutable audit log, and segregation of duties is enforced: the person who prepares a run cannot approve it.',
      ] },
      { h: 'About this prototype', items: [
        'All data is mock and deterministic. The simulated date is 7 Oct 2027 and the current period is Q3 2027.',
        'Changes you make (approvals, resolutions, acknowledgments) live in your browser session only. Refresh the page to reset.',
        'Download buttons are illustrative and do not produce real files.',
      ] },
    ],
  },
  {
    id: 'switch-roles', title: 'Switching roles ("Viewing as")', category: 'Getting started', roles: 'all',
    summary: 'Use the selector in the top bar to see the app as any of the eight roles, or as a payee.',
    steps: [
      { text: 'Open the “Viewing as” menu in the top-right of the header.' },
      { text: 'Pick a person. The sidebar changes to show only the screens that role can use, and you land on that role’s home page.' },
      { text: 'Choose “Payee portal (impersonate a payee)” and then pick a payee to see the external payee experience.' },
    ],
    body: [{ h: 'Who is who', items: [
      'Maya Chen: Finance preparer. Builds the run, resolves exceptions and submits it.',
      'Daniel Okafor: Finance controller. Approves or rejects runs and publishes schedules.',
      'Priya Raman / Jordan Alvarez: Compensation and Legal rules approvers (maker/checker on rule changes).',
      'Tom Becker: Sales Ops data owner. Fixes source-data exceptions such as missing rep codes and bad splits.',
      'Lena Ford: Payroll operator. Signs the payroll tie-out and confirms payment.',
      'Rosa Singh: Internal audit. Read-only access to everything, plus evidence export.',
      'Sam Ito: Platform admin. Settings, calendar, templates, integrations and access.',
    ] }],
    tips: ['Buttons you are not allowed to use are greyed out. Hover over one to see why (usually a segregation-of-duties rule).'],
  },
  {
    id: 'navigation', title: 'Finding your way around', category: 'Getting started', roles: 'all',
    summary: 'How the sidebar is organised and what each group is for.',
    body: [{ h: 'Sidebar groups', items: [
      'Quarter close: Close dashboard, Runs, Snapshots, Exception queue, Allocations, Reconciliation and Adjustments. This is where the quarter’s numbers are built and checked.',
      'Distribution: Schedules, Payee questions and Payroll hand-off. This is everything that happens after approval.',
      'Configuration: Rules register and Migration. Payee rules, step-down plans and the import of historical workbooks.',
      'Governance: Audit & evidence and Administration.',
      'Help: this Knowledge Base.',
    ] }],
    tips: ['Badges beside “Exception queue” and “Payee questions” show how many items are still open.', 'Click any table row to open its detail drawer.'],
  },

  {
    id: 'close-overview', title: 'The quarter-close lifecycle', category: 'Quarter-close workflow', roles: 'all',
    summary: 'A run moves through fixed states. Each transition is gated and audited.',
    steps: [
      { text: 'Open: the period opens on the date set in the admin calendar.', who: 'System' },
      { text: 'Snapshotted: source data (Salesforce revenue, splits, payees) is frozen into a locked, hashed snapshot.', to: '/snapshots', who: 'Preparer' },
      { text: 'Calculated: rules are applied to the snapshot to produce allocation lines, and validation checks run.', to: '/allocations', who: 'System' },
      { text: 'In review: all blocking exceptions are resolved and the preparer submits the run.', to: '/exceptions', who: 'Preparer' },
      { text: 'Approved: a different person (the controller) reviews the totals and reconciliations and approves.', to: '/runs', who: 'Approver' },
      { text: 'Published: schedules are generated per payee and delivered to the portal or SharePoint folder.', to: '/schedules', who: 'Approver' },
      { text: 'Paid: the payroll file is generated, the tie-out is signed and payment is confirmed.', to: '/payroll', who: 'Payroll' },
      { text: 'Closed: the review window ends. Acknowledgments and deemed acceptances are recorded and the period is locked.', to: '/runs', who: 'Approver' },
    ],
    tips: ['The run stepper at the top of each run’s detail page shows exactly where the quarter is.'],
  },
  {
    id: 'demo-script', title: 'End-to-end walkthrough (5 minutes)', category: 'Quarter-close workflow', roles: 'all',
    summary: 'A guided path through a full close using the mock Q3 2027 run.',
    steps: [
      { text: 'As Maya Chen, open the Exception queue and resolve the 4 blocking exceptions (select them and click Resolve).', to: '/exceptions', who: 'Maya' },
      { text: 'Open Runs → RUN-2027Q3-01 and click Submit for review. Notice that Approve is disabled for Maya.', to: '/runs/RUN-2027Q3-01', who: 'Maya' },
      { text: 'Switch to Daniel Okafor. Check Reconciliation, then Approve the run and click Publish schedules.', to: '/reconciliation', who: 'Daniel' },
      { text: 'Open Schedules to see the Q3 schedules. Click “Simulate payee acknowledgments”.', to: '/schedules', who: 'Daniel' },
      { text: 'Back on the run, click Generate payroll file.', to: '/runs/RUN-2027Q3-01', who: 'Daniel' },
      { text: 'Switch to Lena Ford. On Payroll hand-off, sign the tie-out and confirm payment.', to: '/payroll', who: 'Lena' },
      { text: 'Switch to Rosa Singh and open Audit & evidence. Every step above is in the log.', to: '/audit', who: 'Rosa' },
    ],
  },

  {
    id: 'exceptions', title: 'Resolving exceptions', category: 'How-to', roles: ['preparer', 'reviewer', 'dataowner', 'rules', 'admin'],
    summary: 'Blocking exceptions stop a run from being submitted. Warnings need review but do not block.',
    steps: [
      { text: 'Open the Exception queue. Filter by severity, type, owner or status.', to: '/exceptions' },
      { text: 'Click an exception to open its drawer. It shows the payee, the affected record, a link to the Salesforce record and the comment history.' },
      { text: 'Fix the cause in the source system, or record a justification, then click Resolve. You can also Assign the exception or Route it to its data owner.' },
      { text: 'For many similar items, tick the checkboxes and use Bulk resolve.' },
    ],
    body: [{ h: 'Common exception types', items: [
      'Missing rep code: the payee has revenue but no rep code to attribute it to. Owner: Sales Ops.',
      'Split ≠ 100%: a client’s split assignments do not add up to 100%. Owner: Sales Ops.',
      'Terminated payee with activity: revenue arrived for someone who has left. Confirm the policy.',
      'Variance above threshold: the quarter-on-quarter change exceeds the tolerance set in Admin.',
      'Overlapping effective dates: two rule entries cover the same period for the same payee.',
    ] }],
    tips: ['Only the role that owns an exception type can resolve it. For example, data-quality items belong to the data owner.'],
  },
  {
    id: 'lineage', title: 'Tracing a number (lineage)', category: 'How-to', roles: ['preparer', 'reviewer', 'auditor'],
    summary: 'Explain any allocation line down to its source rows.',
    steps: [
      { text: 'Open Allocations and search for a payee or client.', to: '/allocations' },
      { text: 'Click a line. The lineage drawer shows the snapshot revenue rows, the split percentage, the rule entry (with its version) and the step-down step that applied.' },
      { text: 'Lines for mid-quarter starters and leavers are split into stub pieces by calendar days (out of 92 days in Q3).' },
    ],
    body: [{ h: 'Calculation archetypes', items: [
      'A: Revenue split. Payee’s share % × client revenue.',
      'B: Referral step-down. The rate declines by relationship year (e.g. 30 → 25 → 20 → 10 → 5%).',
      'C: Pool share. A fixed pool divided by weights.',
      'D: Stub period. Prorated by calendar days for starters and leavers.',
      'E: Adjustment. Approved one-off corrections carried on the next schedule.',
    ] }],
  },
  {
    id: 'reconcile', title: 'Reviewing reconciliations', category: 'How-to', roles: ['preparer', 'reviewer', 'auditor'],
    summary: 'Validation checks (VAL-1 to VAL-7) must pass before approval.',
    steps: [
      { text: 'Open Reconciliation.', to: '/reconciliation' },
      { text: 'Check that the run total ties to CRM Analytics and to the GL accrual within tolerance.' },
      { text: 'Review any failing check. A failure usually links to an exception in the queue.' },
      { text: 'Use Export to attach the reconciliation to the approval evidence pack.' },
    ],
  },
  {
    id: 'approve', title: 'Submitting and approving a run', category: 'How-to', roles: ['preparer', 'reviewer'],
    summary: 'Maker/checker: one person submits and a different person approves.',
    steps: [
      { text: 'Preparer: once no blocking exceptions remain, open the run and click Submit for review.', to: '/runs' },
      { text: 'Approver: review the totals, the shadow comparison to Excel and the reconciliation, then click Approve or Reject (with a reason).' },
      { text: 'A rejection sends the run back to Calculated with your comment. An approval enables Publish.' },
    ],
    tips: ['The approver can never be the person who submitted the run, even if they hold both roles.'],
  },
  {
    id: 'schedules', title: 'Publishing and reissuing schedules', category: 'How-to', roles: ['preparer', 'reviewer', 'auditor'],
    summary: 'Schedules are rendered from run data and never edited by hand.',
    steps: [
      { text: 'After approval, click Publish schedules on the run. One schedule is created per payee.', to: '/schedules' },
      { text: 'Delivery goes to the payee’s SharePoint folder only if the folder owner matches the payee ID. Otherwise it is refused and goes to the portal only.' },
      { text: 'If a correction is needed, approve an adjustment. The schedule is reissued as v2 with a change summary, and v1 is marked Superseded.' },
    ],
    body: [{ h: 'Acknowledgment', items: [
      'Payees acknowledge in the portal.',
      'If they take no action within the review window (set in Admin), the schedule is “Deemed accepted”.',
    ] }],
  },
  {
    id: 'questions', title: 'Answering payee questions', category: 'How-to', roles: ['preparer', 'reviewer'],
    summary: 'Payees can ask about a specific line. Each thread has an SLA.',
    steps: [
      { text: 'Open Payee questions. Overdue threads are flagged.', to: '/questions' },
      { text: 'Open a thread to see the schedule line it refers to, then reply.' },
      { text: 'If the question reveals an error, raise an adjustment from the thread. It is then linked for audit.' },
    ],
  },
  {
    id: 'adjustments', title: 'Raising an adjustment', category: 'How-to', roles: ['preparer', 'reviewer', 'auditor'],
    summary: 'Corrections are made by approved adjustments, never by editing a closed period.',
    steps: [
      { text: 'Open Adjustments. Pending items show who raised them and why.', to: '/adjustments' },
      { text: 'An approver (not the person who raised it) approves the adjustment.' },
      { text: 'Approved adjustments appear as archetype E lines on the next run, or trigger a v2 schedule reissue.' },
    ],
  },
  {
    id: 'payroll', title: 'Payroll hand-off', category: 'How-to', roles: ['payroll', 'preparer', 'reviewer', 'auditor'],
    summary: 'Generate the file, tie it out, sign off and confirm payment.',
    steps: [
      { text: 'After publishing, Finance clicks Generate payroll file. Payroll and AP payees are split into separate batches.', to: '/payroll' },
      { text: 'The payroll operator checks the tie-out: the file total must equal the approved run total, line count and hash.' },
      { text: 'Sign off the tie-out, submit the file to the payroll provider, then click Confirm paid.' },
    ],
    tips: ['The file hash is recorded so auditors can prove the file sent is the file approved.'],
  },
  {
    id: 'rules', title: 'Changing a rule (maker/checker)', category: 'How-to', roles: ['rules', 'preparer', 'reviewer', 'dataowner', 'auditor'],
    summary: 'Rule changes are proposed, reviewed as a diff and approved by someone else.',
    steps: [
      { text: 'Open Rules register → Entries to see each payee’s effective-dated rules.', to: '/rules' },
      { text: 'Propose a change: the new rate or plan, its effective date and a reason. It appears under Changes as Pending.' },
      { text: 'A second rules approver opens the change, reviews the before/after diff and approves or rejects it.' },
      { text: 'Approved changes take effect from their effective date. Runs that already used a snapshot keep the old version.' },
    ],
    body: [{ h: 'Other tabs', items: [
      'Step-down plans: versioned plans for referral payees.',
      'Overrides: temporary exceptions to a rule, each with an expiry date.',
      'New payee: create a payee from an archetype template so that setup is consistent.',
    ] }],
    tips: ['You cannot approve a change you authored. The Approve button is disabled on your own changes.'],
  },
  {
    id: 'snapshots', title: 'Snapshots and re-snapshots', category: 'How-to', roles: ['preparer', 'reviewer', 'dataowner', 'auditor', 'admin'],
    summary: 'A snapshot freezes source data so that a run is reproducible.',
    steps: [
      { text: 'Open Snapshots to see each period’s snapshots, their sequence number, record counts and hashes.', to: '/snapshots' },
      { text: 'Review the data-quality checks run at ingestion.' },
      { text: 'If source data is corrected, take a partial re-snapshot. It creates a new sequence and the run recalculates against it.' },
    ],
  },
  {
    id: 'migration', title: 'Migrating historical workbooks', category: 'How-to', roles: ['preparer', 'reviewer', 'admin', 'auditor'],
    summary: 'Import 2019–2026 Excel history so that payees see one continuous record.',
    steps: [
      { text: 'Inventory: each workbook is listed by year and template generation (G1–G4) with its parse status.', to: '/migration' },
      { text: 'Name mapping: approve or reject suggested matches between workbook names and payee/client IDs.' },
      { text: 'Discrepancies: compare imported totals to payroll registers, then investigate and sign off each workbook.' },
      { text: 'Regression: recalculate recent quarters on the platform and confirm they match Excel.' },
    ],
  },
  {
    id: 'audit', title: 'Exporting audit evidence', category: 'How-to', roles: ['auditor', 'reviewer', 'admin', 'rules'],
    summary: 'Everything needed to evidence a period, in one pack.',
    steps: [
      { text: 'Open Audit & evidence → Log. Filter by actor, action or object.', to: '/audit' },
      { text: 'The Approvals tab lists every maker/checker pair. Check that the maker and checker are always different people.' },
      { text: 'On the Evidence tab, choose a period and export: the snapshot hash, rules version, reconciliations, approvals, schedule checksums and payroll file hash.' },
    ],
  },
  {
    id: 'admin', title: 'Administration settings', category: 'How-to', roles: ['admin'],
    summary: 'Thresholds, calendar, templates, integrations and access.',
    steps: [
      { text: 'Health: last sync times, API usage against limits, failed deliveries and queue depth.', to: '/admin' },
      { text: 'Settings: variance threshold, GL tolerance and the review window (business days before “deemed accepted”).' },
      { text: 'Calendar: open, snapshot and close dates for each period.' },
      { text: 'Templates and Access: payee archetype templates, the payroll format mapping and user role assignments.' },
    ],
  },
  {
    id: 'payee-portal', title: 'Using the payee portal', category: 'Role guides', roles: ['payee', 'preparer', 'reviewer'],
    summary: 'What a payee sees and can do.',
    steps: [
      { text: 'Your current schedule appears at the top, with its version and status.', to: '/portal' },
      { text: 'Click Acknowledge if it is correct. If you take no action within the review window, it is deemed accepted.' },
      { text: 'Click Ask beside any line to send a question to Finance. Replies appear under “Your questions”.' },
      { text: 'History lists every quarter, including quarters imported from the old Excel workbooks (marked Imported).' },
    ],
  },
  {
    id: 'guide-preparer', title: 'Guide for preparers', category: 'Role guides', roles: ['preparer'],
    summary: 'Your quarter at a glance.',
    steps: [
      { text: 'Start on the Close dashboard to see the run state, open exceptions and days to close.', to: '/dashboard' },
      { text: 'Work the Exception queue down to zero blocking items.', to: '/exceptions' },
      { text: 'Spot-check Allocations and Reconciliation.', to: '/reconciliation' },
      { text: 'Submit the run, then answer payee questions after publication.', to: '/runs' },
    ],
  },
  {
    id: 'guide-reviewer', title: 'Guide for approvers', category: 'Role guides', roles: ['reviewer'],
    summary: 'What to check before you approve.',
    steps: [
      { text: 'Reconciliation: all VAL checks pass, or each exception is justified.', to: '/reconciliation' },
      { text: 'Run detail: the totals against the prior quarter and the shadow comparison.', to: '/runs' },
      { text: 'Approve, then publish the schedules and generate the payroll file.' },
      { text: 'Close the run after the review window ends.' },
    ],
  },
  {
    id: 'guide-dataowner', title: 'Guide for data owners', category: 'Role guides', roles: ['dataowner'],
    summary: 'Keep source data clean so the close runs on time.',
    steps: [
      { text: 'Exceptions routed to you appear in the Exception queue. Filter by Owner = me.', to: '/exceptions' },
      { text: 'Fix the record in Salesforce, then resolve the exception with a note.' },
      { text: 'Check Snapshots for data-quality results after each ingestion.', to: '/snapshots' },
    ],
  },
  {
    id: 'guide-payroll', title: 'Guide for payroll', category: 'Role guides', roles: ['payroll'],
    summary: 'Your only queue is the payroll hand-off.',
    steps: [
      { text: 'Wait for Finance to generate the file. The batch appears on Payroll hand-off.', to: '/payroll' },
      { text: 'Check the tie-out and hash, sign off, and confirm paid once the provider has processed the file.' },
    ],
  },
  {
    id: 'glossary', title: 'Glossary', category: 'Reference', roles: 'all',
    summary: 'Terms used across the platform.',
    body: [{ h: 'Terms', items: [
      'Run: one calculation of a period against a specific snapshot and rules version.',
      'Snapshot: a locked, hashed copy of source data for a period. A sequence number increases with each re-snapshot.',
      'Allocation line: one computed amount for one payee, one client or basis, and one period piece.',
      'Lineage: the chain from an allocation line back to its source rows and rules.',
      'Exception: a data or validation problem. Blocking exceptions stop submission; warnings do not.',
      'Maker/checker (SoD): the author of a change cannot approve it.',
      'Stub period: part of a quarter, prorated by calendar days.',
      'Superseded: an earlier schedule version replaced by a reissue.',
      'Deemed accepted: no response from the payee by the end of the review window.',
      'Shadow compare: the platform result compared side by side with the legacy Excel result.',
      'Template generation (G1–G4): the layout version of a legacy Excel workbook.',
    ] }],
  },
  {
    id: 'faq', title: 'FAQ', category: 'Reference', roles: 'all',
    summary: 'Quick answers.',
    body: [{ h: 'Questions', items: [
      'Why is a button greyed out? Your role is not allowed to take that action, or the run is not in the right state. Hover over the button to see why.',
      'Can I edit a published schedule? No. Raise an adjustment, and the schedule is reissued as a new version.',
      'Where did my changes go? This prototype keeps state in memory, so a page refresh resets it.',
      'Why can’t I approve my own rule change? Maker/checker: a second approver is required.',
      'How do I see earlier quarters? On Schedules, change the period selector. Payees use History in the portal.',
    ] }],
  },
]

const CATS: Article['category'][] = ['Getting started', 'Quarter-close workflow', 'How-to', 'Role guides', 'Reference']
const forRole = (a: Article, r: RoleKey) => a.roles === 'all' || a.roles.includes(r)
const text = (a: Article) => [a.title, a.summary, ...(a.steps ?? []).map(s => s.text), ...(a.body ?? []).flatMap(b => [b.h, ...b.items]), ...(a.tips ?? [])].join(' ').toLowerCase()

export default function KnowledgeBase() {
  const { user } = useApp()
  const [q, setQ] = useState('')
  const [mineOnly, setMineOnly] = useState(true)
  const [sel, setSel] = useState('welcome')
  const isPayee = user.role === 'payee'

  const list = useMemo(() => ARTICLES
    .filter(a => !mineOnly || forRole(a, user.role))
    .filter(a => !q || text(a).includes(q.toLowerCase())), [q, mineOnly, user.role])
  const art = ARTICLES.find(a => a.id === sel) ?? ARTICLES[0]
  const idx = list.findIndex(a => a.id === art.id)
  const next = idx >= 0 ? list[idx + 1] : undefined

  return (
    <>
      <PageHeader title="Knowledge base" subtitle="Workflows, how-to guides and reference for every role. Articles relevant to your current role are shown by default." />
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-3">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search articles…"
              className="w-full rounded-lg border border-line bg-surface py-2 pl-8 pr-3 text-sm text-ink outline-none focus:border-accent" />
          </div>
          {!isPayee && <label className="flex items-center gap-2 px-1 text-xs text-ink-2">
            <input type="checkbox" checked={mineOnly} onChange={e => setMineOnly(e.target.checked)} />
            Only articles for {ROLE_LABEL[user.role]}
          </label>}
          <Card pad={false}>
            <div className="max-h-[calc(100vh-260px)] overflow-y-auto p-2">
              {CATS.map(c => {
                const items = list.filter(a => a.category === c)
                if (!items.length) return null
                return (
                  <div key={c} className="mb-3">
                    <div className="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-ink-3">{c}</div>
                    {items.map(a => (
                      <button key={a.id} onClick={() => setSel(a.id)}
                        className={cx('block w-full rounded-md px-2 py-1.5 text-left text-sm', a.id === art.id ? 'bg-accent-bg font-medium text-accent' : 'text-ink-2 hover:bg-muted hover:text-ink')}>
                        {a.title}
                      </button>
                    ))}
                  </div>
                )
              })}
              {!list.length && <div className="p-3 text-sm text-ink-3">No articles match “{q}”.</div>}
            </div>
          </Card>
        </aside>

        <article className="min-w-0">
          <Card>
            <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-ink-3">
              <BookOpen size={13} /> {art.category}
              <span className="flex-1" />
              {art.roles === 'all' ? <Badge icon={false}>All roles</Badge> : art.roles.map(r => <Badge key={r} icon={false} tone={r === user.role ? 'info' : 'neutral'}>{ROLE_LABEL[r]}</Badge>)}
            </div>
            <h2 className="text-xl font-semibold text-ink">{art.title}</h2>
            <p className="mt-1 text-sm text-ink-2">{art.summary}</p>

            {art.steps && (
              <ol className="mt-5 space-y-3">
                {art.steps.map((s, i) => {
                  const canGo = s.to && (!isPayee || s.to === '/portal')
                  return (
                    <li key={i} className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-bg text-xs font-semibold text-accent">{i + 1}</span>
                      <div className="min-w-0 flex-1 pt-0.5 text-sm text-ink">
                        {s.who && <span className="mr-1.5 rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-ink-2">{s.who}</span>}
                        {s.text}
                        {canGo && <Link to={s.to!} className="ml-2 inline-flex items-center gap-0.5 whitespace-nowrap text-xs font-medium text-accent hover:underline">Open <ArrowRight size={12} /></Link>}
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}

            {art.body?.map(b => (
              <section key={b.h} className="mt-6">
                <h3 className="mb-2 text-sm font-semibold text-ink">{b.h}</h3>
                <ul className="space-y-1.5">
                  {b.items.map((it, i) => {
                    const m = it.match(/^([^:?]+[:?])\s(.*)$/)
                    return (
                      <li key={i} className="flex gap-2 text-sm text-ink-2">
                        <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-ink-3" />
                        <span>{m && m[1].length < 60 ? <><b className="font-medium text-ink">{m[1]}</b> {m[2]}</> : it}</span>
                      </li>
                    )
                  })}
                </ul>
              </section>
            ))}

            {art.tips && (
              <div className="mt-6 rounded-lg bg-info-bg p-3">
                {art.tips.map((t, i) => <div key={i} className="flex gap-2 text-sm text-ink"><Lightbulb size={14} className="mt-0.5 shrink-0 text-info" />{t}</div>)}
              </div>
            )}

            {next && (
              <div className="mt-6 flex justify-end border-t border-line pt-4">
                <button onClick={() => setSel(next.id)} className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">Next: {next.title} <ArrowRight size={14} /></button>
              </div>
            )}
          </Card>
        </article>
      </div>
    </>
  )
}
