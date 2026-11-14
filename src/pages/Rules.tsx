import { useMemo, useState } from 'react'
import { useApp } from '../state/AppContext'
import { OVERRIDES, PAYEES, RULE_ENTRIES, STEP_DOWN_PLANS, TEMPLATES, payeeById, payeeName, userName } from '../data/mock'
import { Badge, Button, Card, Field, Mono, money, Note, Num, PageHeader, SearchInput, Select, Status, Table, Tabs } from '../components/ui'

type Tab = 'entries' | 'changes' | 'plans' | 'overrides' | 'new'

export default function Rules() {
  const { db, can } = useApp()
  const pending = db.ruleChanges.filter(c => c.status === 'Pending').length
  const [tab, setTab] = useState<Tab>(can.approveRule({ author: '' } as never) ? 'changes' : 'entries')
  return (
    <>
      <PageHeader title="Rules register" subtitle="One effective-dated entry per payee per period. Every change goes through maker/checker with Compensation and Legal as approvers." req="REG-1 … REG-9"
        actions={<><Button>Export CSV</Button><Button disabled={!can.proposeRule}>Import CSV</Button></>} />
      <Tabs value={tab} onChange={setTab} tabs={[
        { id: 'entries', label: 'Register entries' },
        { id: 'changes', label: <>Changes {pending > 0 && <span className="ml-1 rounded-full bg-warn-bg px-1.5 text-[11px] text-warn">{pending}</span>}</> },
        { id: 'plans', label: 'Step-down plans' },
        { id: 'overrides', label: 'Overrides' },
        { id: 'new', label: 'New payee from template' },
      ]} />
      {tab === 'entries' && <Entries />}
      {tab === 'changes' && <Changes />}
      {tab === 'plans' && <Plans />}
      {tab === 'overrides' && <Overrides />}
      {tab === 'new' && <NewPayee onDone={() => setTab('changes')} />}
    </>
  )
}

function Entries() {
  const [q, setQ] = useState('')
  const [pop, setPop] = useState('all')
  const [hist, setHist] = useState(false)
  const rows = useMemo(() => RULE_ENTRIES.filter(r => {
    const p = payeeById(r.payeeId)!
    const isCurrent = !RULE_ENTRIES.some(o => o.payeeId === r.payeeId && o.version > r.version)
    return (hist || isCurrent) && (pop === 'all' || p.population === pop) && (!q || p.name.toLowerCase().includes(q.toLowerCase()))
  }), [q, pop, hist])
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput value={q} onChange={setQ} placeholder="Find payee…" />
        <Select value={pop} onChange={setPop} options={[{ value: 'all', label: 'All populations' }, ...['Advisor', 'Referrer', 'Partner', 'Non-advisor'].map(v => ({ value: v, label: v }))]} />
        <label className="flex items-center gap-2 text-sm text-ink-2"><input type="checkbox" checked={hist} onChange={e => setHist(e.target.checked)} /> Show superseded versions</label>
      </div>
      <Card pad={false}>
        <Table head={['Payee', 'Entry', 'Archetype', 'Basis', 'Rate / plan', 'Caps · floors', 'Effective', 'Channel', 'Approved', 'Provenance']}>
          {rows.map(r => {
            const plan = STEP_DOWN_PLANS.find(p => p.id === r.stepDownPlanId)
            const superseded = RULE_ENTRIES.some(o => o.payeeId === r.payeeId && o.version > r.version)
            return (
              <tr key={r.id} className={superseded ? 'opacity-60' : ''}>
                <td className="whitespace-nowrap font-medium">{payeeName(r.payeeId)}</td>
                <td className="whitespace-nowrap"><Mono>{r.id}</Mono> {superseded && <Status s="Superseded" />}</td>
                <td><Mono>{r.archetype}</Mono></td>
                <td className="text-ink-2">{r.basis}</td>
                <td className="whitespace-nowrap">{plan ? `${plan.id} v${plan.version}` : `${r.pct}%`}</td>
                <td className="whitespace-nowrap text-ink-2">{r.cap ? `cap ${money(r.cap, 0)}` : ''}{r.floor ? `floor ${money(r.floor, 0)}` : ''}{!r.cap && !r.floor ? '—' : ''}</td>
                <td className="whitespace-nowrap text-ink-2">{r.effectiveFrom} → {r.effectiveTo ?? 'open'}</td>
                <td>{r.channel}</td>
                <td className="whitespace-nowrap text-ink-2">{userName(r.approvedBy)}</td>
                <td className="max-w-[220px] truncate text-xs text-ink-3" title={r.provenance}>{r.provenance ?? '—'}</td>
              </tr>
            )
          })}
        </Table>
      </Card>
    </>
  )
}

function Changes() {
  const { db, can, actions, user } = useApp()
  return (
    <div className="space-y-4">
      {user.role !== 'rules' && <Note>Only Compensation or Legal can approve rule changes, and never their own. Switch to Priya Raman or Jordan Alvarez to approve.</Note>}
      {db.ruleChanges.map(c => (
        <Card key={c.id} title={<span className="flex flex-wrap items-center gap-2"><Mono>{c.id}</Mono> {c.summary} <span className="font-normal text-ink-2">· {payeeName(c.payeeId)}</span></span>} actions={<Status s={c.status} />}>
          <div className="grid gap-4 md:grid-cols-[1fr_auto]">
            <div>
              <div className="mb-3 overflow-hidden rounded-lg border border-line font-mono text-xs">
                <div className="bg-bad-bg px-3 py-1.5 text-bad">− {c.field}: {c.before}</div>
                <div className="bg-good-bg px-3 py-1.5 text-good">+ {c.field}: {c.after}</div>
              </div>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Field label="Effective from">{c.effectiveFrom}</Field>
                <Field label="Proposed by (maker)">{userName(c.author)} · {c.createdAt}</Field>
                <Field label="Reason / support">{c.reason}</Field>
                <Field label="Checker">{c.approver ? `${userName(c.approver)} · ${c.decidedAt}` : '—'}</Field>
              </dl>
            </div>
            {c.status === 'Pending' && (
              <div className="flex items-start gap-2">
                <Button variant="danger" disabled={!can.approveRule(c)} onClick={() => actions.decideRule(c.id, false)}>Reject</Button>
                <Button variant="primary" disabled={!can.approveRule(c)} title={c.author === user.id ? 'You proposed this change — another approver must decide' : !can.approveRule(c) ? 'Compensation or Legal approves' : ''} onClick={() => actions.decideRule(c.id, true)}>Approve</Button>
              </div>
            )}
          </div>
          {c.status === 'Pending' && c.author === user.id && <p className="mt-2 text-xs text-warn">You are the maker of this change; segregation of duties prevents you approving it.</p>}
        </Card>
      ))}
    </div>
  )
}

function Plans() {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {STEP_DOWN_PLANS.map(p => (
        <Card key={p.id} title={<span>{p.name} <span className="font-normal text-ink-3">· {p.id} v{p.version}</span></span>}>
          <p className="mb-3 text-xs text-ink-2">Effective from {p.effectiveFrom} · attached to {p.attachedTo} rep codes / payees</p>
          <Table head={['Tenure', 'Rate']} dense>
            {p.steps.map((s, i) => <tr key={i}><td>{s.fromYear}–{s.toYear ?? '∞'} years</td><Num>{s.pct}%</Num></tr>)}
          </Table>
          <div className="mt-3 flex h-16 items-end gap-1">
            {p.steps.map((s, i) => <div key={i} title={`${s.fromYear}–${s.toYear ?? '∞'} y: ${s.pct}%`} className="flex-1 rounded-t bg-series-1" style={{ height: `${s.pct / Math.max(...p.steps.map(x => x.pct)) * 100}%` }} />)}
          </div>
        </Card>
      ))}
    </div>
  )
}

function Overrides() {
  return (
    <Card pad={false}>
      <Table head={['Override', 'Payee', 'Description', 'Reason', 'Supporting document', 'Approver', 'Expires']}>
        {OVERRIDES.map(o => (
          <tr key={o.id}>
            <td><Mono>{o.id}</Mono></td>
            <td className="whitespace-nowrap">{payeeName(o.payeeId)}</td>
            <td>{o.description}</td>
            <td className="text-ink-2">{o.reason}</td>
            <td><a href="#" onClick={e => e.preventDefault()} className="text-accent hover:underline">{o.document}</a></td>
            <td>{userName(o.approver)}</td>
            <td className="whitespace-nowrap">{o.expires} {o.expires < '2027-12-01' && <Badge tone="warn">soon</Badge>}</td>
          </tr>
        ))}
      </Table>
    </Card>
  )
}

function NewPayee({ onDone }: { onDone: () => void }) {
  const { can, actions } = useApp()
  const [tpl, setTpl] = useState(TEMPLATES[0].id)
  const t = TEMPLATES.find(x => x.id === tpl)!
  const [name, setName] = useState('')
  const [vals, setVals] = useState<Record<string, string>>({})
  const ready = name.trim() && t.params.every(p => vals[p]?.trim())
  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <Card title="1 · Choose an archetype template">
        <div className="space-y-2">
          {TEMPLATES.map(x => (
            <button key={x.id} onClick={() => { setTpl(x.id); setVals({}) }} className={`w-full rounded-lg border p-3 text-left text-sm ${x.id === tpl ? 'border-accent bg-accent-bg' : 'border-line hover:bg-muted'}`}>
              <div className="font-medium text-ink">{x.name}</div>
              <div className="text-xs text-ink-2">Archetype {x.archetype} · {x.params.length} parameters</div>
            </button>
          ))}
        </div>
      </Card>
      <Card title={`2 · Enter parameters · ${t.name}`}>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={e => {
          e.preventDefault()
          if (!ready) return
          actions.proposeRule({ payeeId: PAYEES[0].id, summary: `New payee ${name} from ${t.name}`, field: 'Entry', before: '—', after: t.params.map(p => `${p}: ${vals[p]}`).join(' · '), effectiveFrom: vals['Start date'] || vals['Referral start date'] || '2027-10-01', reason: 'Onboarding via template (REG-6)' })
          onDone()
        }}>
          <label className="text-sm sm:col-span-2"><span className="text-xs text-ink-2">Payee (Salesforce contact)</span>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Noor Hassan" className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 outline-none focus:border-accent" /></label>
          {t.params.map(p => (
            <label key={p} className="text-sm"><span className="text-xs text-ink-2">{p}</span>
              <input value={vals[p] ?? ''} onChange={e => setVals(v => ({ ...v, [p]: e.target.value }))} placeholder={/date/i.test(p) ? 'YYYY-MM-DD' : ''} className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 outline-none focus:border-accent" /></label>
          ))}
          <div className="flex items-center justify-between gap-3 sm:col-span-2">
            <p className="text-xs text-ink-3">Target: new payee set-up under 15 minutes. Submitting creates a pending change for Compensation/Legal approval.</p>
            <Button type="submit" variant="primary" disabled={!ready || !can.proposeRule}>Submit for approval</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
