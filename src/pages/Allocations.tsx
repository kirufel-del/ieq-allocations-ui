import { useMemo, useState } from 'react'
import { GitBranch } from 'lucide-react'
import { LINES, PAYEES, PERIOD_TOTALS, REVENUE, RULE_ENTRIES, SPLITS, STEP_DOWN_PLANS, clientName, payeeById, payeeTotal } from '../data/mock'
import type { AllocationLine } from '../data/types'
import { Badge, Card, Drawer, Field, Mono, money, Num, PageHeader, SearchInput, Select, Status, Table } from '../components/ui'

const archLabel: Record<string, string> = { A: 'A · Revenue split', B: 'B · Referral step-down', C: 'C · Flat/tiered share', D: 'D · Stub period', E: 'E · Adjustment' }

export default function Allocations() {
  const [q, setQ] = useState('')
  const [pop, setPop] = useState('all')
  const [payeeId, setPayeeId] = useState(PAYEES[0].id)
  const [line, setLine] = useState<AllocationLine | null>(null)

  const payees = useMemo(() => PAYEES.filter(p => (pop === 'all' || p.population === pop) && (!q || p.name.toLowerCase().includes(q.toLowerCase())))
    .map(p => ({ p, total: payeeTotal(p.id), prev: PERIOD_TOTALS[p.id]['2027-Q2'], n: LINES.filter(l => l.payeeId === p.id).length })), [q, pop])
  const payee = payeeById(payeeId)!
  const lines = LINES.filter(l => l.payeeId === payeeId)

  return (
    <>
      <PageHeader title="Allocations · Q3 2027" subtitle="Every line traces to Salesforce revenue rows, a split assignment, a rule-entry version and a step-down step. Click a line for lineage." req="CALC-2 · CALC-3 · CALC-4 · ING-5" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        <Card title="Payees" pad={false}>
          <div className="flex flex-wrap gap-2 border-b border-line p-3">
            <SearchInput value={q} onChange={setQ} placeholder="Find payee…" />
            <Select value={pop} onChange={setPop} options={[{ value: 'all', label: 'All populations' }, ...['Advisor', 'Referrer', 'Partner', 'Non-advisor'].map(v => ({ value: v, label: v }))]} />
          </div>
          <div className="max-h-[640px] overflow-y-auto">
            <Table head={['Payee', 'Lines', 'Q3 total', 'vs Q2']} dense>
              {payees.map(({ p, total, prev, n }) => {
                const delta = prev ? (total / prev - 1) * 100 : null
                return (
                  <tr key={p.id} className={p.id === payeeId ? 'bg-accent-bg/60' : 'cursor-pointer'} onClick={() => setPayeeId(p.id)}>
                    <td><div className="font-medium">{p.name}</div><div className="text-[11px] text-ink-3">{p.population}{p.status === 'Terminated' ? ' · terminated' : ''}</div></td>
                    <Num>{n}</Num>
                    <Num>{money(total, 0)}</Num>
                    <Num className={delta === null ? 'text-ink-3' : Math.abs(delta) > 25 ? 'font-semibold text-warn' : 'text-ink-2'}>{delta === null ? 'new' : `${delta > 0 ? '+' : ''}${delta.toFixed(0)}%`}</Num>
                  </tr>
                )
              })}
            </Table>
          </div>
        </Card>

        <div className="min-w-0 space-y-6">
          <Card title={<span>{payee.name} <span className="font-normal text-ink-2">· {payee.population} · {payee.repCodes.join(', ') || 'no rep code'} · {payee.channel}</span></span>}>
            <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Field label="Q3 2027 total">{money(payeeTotal(payee.id))}</Field>
              <Field label="Q2 2027 total">{PERIOD_TOTALS[payee.id]['2027-Q2'] ? money(PERIOD_TOTALS[payee.id]['2027-Q2']) : '—'}</Field>
              <Field label="Start / end">{payee.startDate}{payee.endDate ? ` → ${payee.endDate}` : ''}</Field>
              <Field label="Status"><Status s={payee.status} /></Field>
            </div>
            <Table head={['Line', 'Client / basis', 'Piece', 'Basis amount', 'Rate', 'Amount', 'Archetype', '']} dense>
              {lines.map(l => (
                <tr key={l.id} className="cursor-pointer" onClick={() => setLine(l)}>
                  <td><Mono>{l.id}</Mono></td>
                  <td className="max-w-[260px]"><div className="truncate">{l.clientId ? clientName(l.clientId) : l.basis}</div>{l.clientId && <div className="truncate text-[11px] text-ink-3">{l.basis}</div>}</td>
                  <td className="whitespace-nowrap text-xs">{l.piece === 'Full quarter' ? <span className="text-ink-3">Full quarter</span> : <Badge tone={l.archetype === 'E' ? 'accent' : 'info'} icon={false}>{l.piece}</Badge>}</td>
                  <Num>{money(l.basisAmount)}</Num>
                  <Num>{l.rate}%</Num>
                  <Num className="font-medium">{money(l.amount)}</Num>
                  <td><Mono>{l.archetype}</Mono></td>
                  <td><GitBranch size={14} className="text-ink-3" /></td>
                </tr>
              ))}
              <tr className="font-semibold"><td colSpan={5} className="text-right">Total (sum of rounded lines)</td><Num>{money(payeeTotal(payee.id))}</Num><td colSpan={2} /></tr>
            </Table>
          </Card>
        </div>
      </div>

      <Drawer open={!!line} onClose={() => setLine(null)} title={line ? `Lineage · ${line.id}` : ''}>
        {line && <Lineage l={line} />}
      </Drawer>
    </>
  )
}

function Lineage({ l }: { l: AllocationLine }) {
  const rev = REVENUE.filter(r => l.lineage.revenueIds.includes(r.id))
  const split = SPLITS.find(s => s.id === l.lineage.splitId)
  const rule = RULE_ENTRIES.find(r => r.id === l.lineage.ruleEntryId)
  const plan = STEP_DOWN_PLANS.find(p => p.id === rule?.stepDownPlanId)
  const Step = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
    <li className="relative border-l-2 border-line pb-5 pl-5 last:border-transparent">
      <span className="absolute -left-[11px] top-0 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-white">{n}</span>
      <h3 className="mb-1.5 text-sm font-semibold text-ink">{title}</h3>
      <div className="text-sm text-ink-2">{children}</div>
    </li>
  )
  return (
    <ol className="mt-1">
      <Step n={1} title="Source revenue (Salesforce snapshot SNP-2027Q3-2)">
        {rev.length ? rev.map(r => <div key={r.id}><Mono>{r.id}</Mono> · {clientName(r.clientId)} · {money(r.amount)} · {r.source}</div>)
          : l.lineage.revenueIds.length ? <div><Mono>{l.lineage.revenueIds[0]}</Mono> — pool derived from snapshot revenue</div> : <div>No revenue (adjustment or empty set)</div>}
      </Step>
      {split && <Step n={2} title="Split assignment">
        <Mono>{split.id}</Mono> · {split.pct}% · rep code {split.repCode} · effective {split.from}{split.to ? ` → ${split.to}` : ' → open'}
      </Step>}
      <Step n={split ? 3 : 2} title={`Rule entry ${rule?.id} (version ${rule?.version})`}>
        <div>{archLabel[l.archetype]} · {rule?.basis}</div>
        <div>Rate {rule?.archetype === 'B' ? 'from step-down plan' : `${rule?.pct}%`} · pro-ration {rule?.proration}{rule?.cap ? ` · cap ${money(rule.cap, 0)}` : ''}</div>
        <div>Effective {rule?.effectiveFrom} → {rule?.effectiveTo ?? 'open'} · approved by {rule?.approvedBy === 'u3' ? 'Priya Raman' : 'Jordan Alvarez'} on {rule?.approvedAt}</div>
        {rule?.provenance && <div className="mt-1 text-xs text-ink-3">Provenance: {rule.provenance}</div>}
      </Step>
      {l.lineage.stepDownStep && <Step n={4} title={`Step-down: ${plan?.name}`}>{l.lineage.stepDownStep}</Step>}
      <Step n={l.lineage.stepDownStep ? 5 : split ? 4 : 3} title="Calculation">
        <div className="rounded-lg bg-muted p-3 font-mono text-xs leading-relaxed text-ink">
          piece = {l.piece}<br />
          basis = {money(l.basisAmount)}<br />
          amount = basis × {l.rate}% = <b>{money(l.amount)}</b><br />
          <span className="text-ink-3">full precision internally; rounded to cents per line (CALC-4)</span>
        </div>
      </Step>
    </ol>
  )
}
