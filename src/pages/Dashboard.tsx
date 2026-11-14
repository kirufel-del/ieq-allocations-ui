import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useApp } from '../state/AppContext'
import { ALL_PERIODS, LINES, PAYEES, payeeById, periodLabel, periodRunTotal } from '../data/mock'
import { Badge, Card, Kpi, money, Note, PageHeader, RunStepper, Status } from '../components/ui'

const axis = { fontSize: 11, fill: 'var(--color-ink-3)' }
const tip = { contentStyle: { background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 8, fontSize: 12, color: 'var(--color-ink)' }, cursor: { fill: 'var(--color-muted)' } }

export default function Dashboard() {
  const { db, currentRun } = useApp()
  const ex = db.exceptions.filter(e => e.runId === currentRun.id)
  const open = ex.filter(e => e.status !== 'Resolved')
  const blocking = open.filter(e => e.severity === 'Blocking')
  const curSchedules = db.schedules.filter(s => s.period === currentRun.period && !s.supersededBy)
  const acked = curSchedules.filter(s => s.ack).length
  const openQ = db.questions.filter(q => q.status === 'Open')
  const pendingRules = db.ruleChanges.filter(c => c.status === 'Pending')

  const byType = Object.entries(open.reduce<Record<string, number>>((a, e) => ({ ...a, [e.type]: (a[e.type] ?? 0) + 1 }), {}))
    .map(([type, n]) => ({ type, n })).sort((a, b) => b.n - a.n)
  const byPop = ['Advisor', 'Referrer', 'Partner', 'Non-advisor'].map(pop => ({
    pop, amount: Math.round(LINES.filter(l => payeeById(l.payeeId)?.population === pop).reduce((a, l) => a + l.amount, 0)),
  }))
  const trend = ALL_PERIODS.map(p => ({ period: periodLabel(p), total: Math.round(p === currentRun.period ? currentRun.total : periodRunTotal(p)) }))
  const firstPass = Math.round((1 - new Set(ex.filter(e => e.payeeId).map(e => e.payeeId)).size / PAYEES.length) * 100)

  return (
    <>
      <PageHeader title={`${periodLabel(currentRun.period)} close`} subtitle="Finance works only the exceptions; everything else flows from Salesforce through the rules register." req="WF-6 · Finance dashboard" />

      <Card className="mb-6" title={<span className="flex items-center gap-2">Run <Link className="text-accent hover:underline" to={`/runs/${currentRun.id}`}>{currentRun.id}</Link> <Status s={currentRun.state} /></span>}>
        <RunStepper state={currentRun.state} />
        <div className="mt-4">
          {blocking.length > 0
            ? <Note tone="bad">{blocking.length} blocking exception{blocking.length > 1 ? 's' : ''} must be resolved before the run can be submitted. <Link to="/exceptions" className="font-medium underline">Open the queue</Link></Note>
            : currentRun.state === 'Calculated' ? <Note tone="good">No blocking exceptions. The preparer can <Link to={`/runs/${currentRun.id}`} className="font-medium underline">submit the run</Link> for review.</Note>
              : <Note>Run is <b>{currentRun.state}</b>. Next step on the <Link to={`/runs/${currentRun.id}`} className="font-medium underline">run page</Link>.</Note>}
        </div>
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Kpi label="Run total" value={money(currentRun.total, 0)} sub={`${currentRun.payeeCount} payees · ${LINES.length} lines`} />
        <Kpi label="Open exceptions" value={open.length} sub={`${blocking.length} blocking · ${open.length - blocking.length} warnings`} tone={blocking.length ? 'bad' : 'good'} />
        <Kpi label="Schedules clean on first run" value={`${firstPass}%`} sub="Target ≥ 95% from Q3 2027" tone={firstPass >= 95 ? 'good' : 'warn'} />
        <Kpi label="Acknowledged" value={curSchedules.length ? `${Math.round(acked / curSchedules.length * 100)}%` : '—'} sub={curSchedules.length ? `${acked} of ${curSchedules.length} schedules` : 'Not yet published'} />
        <Kpi label="Open payee questions" value={openQ.length} sub={`${pendingRules.length} rule changes awaiting approval`} tone={openQ.length ? 'warn' : 'good'} />
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Card title="Open exceptions by type">
          {byType.length ? (
            <div style={{ height: Math.max(160, byType.length * 34) }}>
              <ResponsiveContainer>
                <BarChart data={byType} layout="vertical" margin={{ left: 10, right: 20 }} barCategoryGap={6}>
                  <CartesianGrid horizontal={false} stroke="var(--color-line)" />
                  <XAxis type="number" allowDecimals={false} tick={axis} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="type" width={190} tick={{ ...axis, fill: 'var(--color-ink-2)' }} axisLine={false} tickLine={false} />
                  <Tooltip {...tip} formatter={(v: number) => [v, 'Open']} />
                  <Bar isAnimationActive={false} dataKey="n" fill="var(--color-series-1)" radius={[0, 4, 4, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-sm text-ink-2">No open exceptions.</p>}
        </Card>
        <Card title="Payout by population · this run">
          <div className="h-[220px]">
            <ResponsiveContainer>
              <BarChart data={byPop} margin={{ left: 10, right: 10 }}>
                <CartesianGrid vertical={false} stroke="var(--color-line)" />
                <XAxis dataKey="pop" tick={{ ...axis, fill: 'var(--color-ink-2)' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `$${Math.round(v / 1000)}k`} tick={axis} axisLine={false} tickLine={false} />
                <Tooltip {...tip} formatter={(v: number) => [money(v, 0), 'Payout']} />
                <Bar isAnimationActive={false} dataKey="amount" fill="var(--color-series-1)" radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Quarterly run total (legacy imports + platform runs)" className="lg:col-span-2">
          <div className="h-[220px]">
            <ResponsiveContainer>
              <LineChart data={trend} margin={{ left: 10, right: 32, top: 8 }}>
                <CartesianGrid vertical={false} stroke="var(--color-line)" />
                <XAxis dataKey="period" tick={axis} axisLine={false} tickLine={false} interval={2} />
                <YAxis tickFormatter={v => `$${(v / 1e6).toFixed(1)}M`} tick={axis} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                <Tooltip {...tip} cursor={{ stroke: 'var(--color-ink-3)' }} formatter={(v: number) => [money(v, 0), 'Run total']} />
                <Line isAnimationActive={false} dataKey="total" stroke="var(--color-series-1)" strokeWidth={2} dot={{ r: 3, fill: 'var(--color-series-1)', stroke: 'var(--color-surface)', strokeWidth: 2 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Close calendar">
          <ol className="space-y-3 text-sm">
            {[
              ['Oct 1', 'Period opened', true], ['Oct 2', 'Snapshot seq 1 locked', true], ['Oct 5', 'Partial re-snapshot seq 2; run calculated', true],
              ['Oct 8', 'Exceptions cleared; submit for review', ['In review', 'Approved', 'Published', 'Paid', 'Closed'].includes(currentRun.state)],
              ['Oct 11', 'Approve & publish schedules', ['Published', 'Paid', 'Closed'].includes(currentRun.state)],
              ['Oct 18', 'Review window ends (5 business days)', false], ['Oct 29', 'Payroll run', ['Paid', 'Closed'].includes(currentRun.state)],
            ].map(([d, label, done]) => (
              <li key={label as string} className="flex items-start gap-3">
                <span className="w-12 shrink-0 font-mono text-xs text-ink-3">{d}</span>
                <span className={done ? 'text-ink-3 line-through' : 'text-ink'}>{label}</span>
                {done ? <Badge tone="good">done</Badge> : null}
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </>
  )
}
