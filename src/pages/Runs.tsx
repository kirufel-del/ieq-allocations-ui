import { Link, useParams } from 'react-router-dom'
import { useApp } from '../state/AppContext'
import { PAYEES, periodLabel, userName, payeeTotal, PERIOD_TOTALS, LINES } from '../data/mock'
import { Badge, Button, Card, Field, Mono, money, Note, Num, PageHeader, RunStepper, Status, Table, usePrompt } from '../components/ui'

export default function Runs() {
  const { db } = useApp()
  return (
    <>
      <PageHeader title="Runs" subtitle="One run per period: snapshot × rules version → allocation lines. Legacy quarters are imported read-only." req="WF-1 · CALC-1 · MIG-4" />
      <Card pad={false}>
        <Table head={['Run', 'Period', 'State', 'Snapshot', 'Rules version', 'Payees', 'Total', 'Preparer', 'Approver']}>
          {db.runs.map(r => (
            <tr key={r.id}>
              <td><Link className="font-medium text-accent hover:underline" to={`/runs/${r.id}`}>{r.id}</Link></td>
              <td>{periodLabel(r.period)}</td>
              <td className="flex gap-1"><Status s={r.state} />{r.legacy && <Badge>Imported</Badge>}{r.shadow && <Badge tone="info">Shadow-compared</Badge>}</td>
              <td><Mono>{r.snapshotId}</Mono></td>
              <td><Mono>{r.rulesVersion}</Mono></td>
              <Num>{r.payeeCount}</Num>
              <Num>{money(r.total, 0)}</Num>
              <td>{r.legacy ? '—' : userName(r.preparer)}</td>
              <td>{userName(r.approver)}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  )
}

export function RunDetail() {
  const { id } = useParams()
  const { db, can, actions, user } = useApp()
  const [prompt, ask] = usePrompt()
  const run = db.runs.find(r => r.id === id)
  if (!run) return <p>Run not found.</p>
  const ex = db.exceptions.filter(e => e.runId === run.id && e.status !== 'Resolved')
  const blocking = ex.filter(e => e.severity === 'Blocking')
  const warnings = ex.filter(e => e.severity === 'Warning')
  const batch = db.payroll.find(b => b.runId === run.id)
  const isCurrent = !run.legacy && run.period === '2027-Q3'
  const sod = run.preparer === user.id

  const action = (() => {
    if (run.legacy || run.state === 'Closed') return null
    switch (run.state) {
      case 'Calculated': return (
        <Button variant="primary" disabled={!can.prepare || blocking.length > 0} title={!can.prepare ? 'Only the Finance preparer submits runs' : blocking.length ? 'Resolve blocking exceptions first (VAL-6)' : ''}
          onClick={() => ask('Submit run for review', warnings.length ? `${warnings.length} open warnings require a comment before submission (VAL-6)` : 'Submission note', () => actions.submitRun(run.id))}>
          Submit for review
        </Button>)
      case 'In review': return (<>
        <Button variant="danger" disabled={!can.approve} onClick={() => ask('Return to preparer', 'Reason', r => actions.rejectRun(run.id, r))}>Return</Button>
        <Button variant="primary" disabled={!can.approve || sod} title={sod ? 'Segregation of duties: the preparer cannot approve' : !can.approve ? 'Only a Finance reviewer approves' : ''} onClick={() => actions.approveRun(run.id)}>Approve run</Button>
      </>)
      case 'Approved': return <Button variant="primary" disabled={!can.prepare} title={!can.prepare ? 'Preparer publishes after approval' : ''} onClick={() => actions.publishRun(run.id)}>Generate & publish schedules</Button>
      case 'Published': return <Button variant="primary" disabled={!(user.role === 'payroll') || !batch?.signedOffBy} title={!batch?.signedOffBy ? 'Payroll file must be generated and tie-out signed first' : user.role !== 'payroll' ? 'Payroll operator confirms payment' : ''} onClick={() => actions.markPaid(run.id)}>Confirm paid</Button>
      case 'Paid': return <Button variant="primary" disabled={!can.approve} onClick={() => actions.closeRun(run.id)}>Close period</Button>
    }
  })()

  const pops = ['Advisor', 'Referrer', 'Partner', 'Non-advisor']
  const popTotal = (pop: string) => PAYEES.filter(p => p.population === pop).reduce((a, p) => a + (isCurrent ? payeeTotal(p.id) : PERIOD_TOTALS[p.id][run.period] ?? 0), 0)

  return (
    <>
      {prompt}
      <PageHeader title={`${run.id} · ${periodLabel(run.period)}`} subtitle={run.legacy ? 'Imported legacy run — read-only, labelled as imported, original workbook attached.' : 'Deterministic: identical snapshot + rules version + period always produce identical lines.'} req="WF-1 · WF-2 · CALC-1 · CALC-8" actions={action} />
      <Card className="mb-6"><RunStepper state={run.state} /></Card>
      {isCurrent && run.state === 'Calculated' && blocking.length > 0 && <div className="mb-6"><Note tone="bad">{blocking.length} blocking exceptions prevent submission. <Link className="underline" to="/exceptions">Resolve them in the queue.</Link></Note></div>}
      {run.state === 'In review' && sod && <div className="mb-6"><Note tone="warn">You prepared this run. Switch to <b>Daniel Okafor (Finance controller)</b> to approve it.</Note></div>}

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card title="Inputs" className="lg:col-span-2">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="Snapshot"><Mono>{run.snapshotId}</Mono></Field>
            <Field label="Rules version"><Mono>{run.rulesVersion}</Mono></Field>
            <Field label="Payees">{run.payeeCount}</Field>
            <Field label="Lines">{isCurrent ? LINES.length : '—'}</Field>
            <Field label="Total">{money(run.total)}</Field>
            <Field label="Preparer">{userName(run.preparer)}</Field>
            <Field label="Approver">{userName(run.approver)}</Field>
            <Field label="Payroll batch">{batch ? <Mono>{batch.id}</Mono> : '—'}</Field>
          </dl>
        </Card>
        <Card title="By population">
          <Table head={['Population', 'Total']} dense>
            {pops.map(p => <tr key={p}><td>{p}</td><Num>{money(popTotal(p), 0)}</Num></tr>)}
          </Table>
        </Card>
      </div>

      {run.shadow && (
        <Card className="mb-6" title="Shadow comparison to uploaded Excel result (CALC-8)">
          <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="Engine total">{money(run.total)}</Field>
            <Field label="Excel total">{money(run.shadow.excelTotal)}</Field>
            <Field label="Difference">{money(run.shadow.excelTotal - run.total)}</Field>
            <Field label="Lines matched to the cent">{run.shadow.matchedLines} / {run.shadow.totalLines} ({(run.shadow.matchedLines / run.shadow.totalLines * 100).toFixed(1)}%)</Field>
          </div>
          <Table head={['Payee', 'Engine', 'Excel', 'Δ', 'Classified cause']}>
            {run.shadow.diffs.map(d => <tr key={d.payee}><td>{d.payee}</td><Num>{money(d.engine)}</Num><Num>{money(d.excel)}</Num><Num>{money(d.excel - d.engine)}</Num><td className="text-ink-2">{d.cause}</td></tr>)}
          </Table>
        </Card>
      )}

      {run.history.length > 0 && (
        <Card title="State history (logged transitions)">
          <ol className="space-y-2 text-sm">
            {run.history.slice().reverse().map((h, i) => (
              <li key={i} className="flex items-center gap-3"><span className="w-36 font-mono text-xs text-ink-3">{h.at}</span><Status s={h.state} /><span className="text-ink-2">{h.by === 'system' ? 'System' : userName(h.by)}</span></li>
            ))}
          </ol>
        </Card>
      )}
    </>
  )
}
