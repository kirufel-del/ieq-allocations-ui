import { useState } from 'react'
import { useApp } from '../state/AppContext'
import { PAYEES, PERIOD_TOTALS, payeeTotal, periodLabel, userName } from '../data/mock'
import { Button, Card, Field, Mono, money, Note, Num, PageHeader, Select, Status, Table } from '../components/ui'

export default function Payroll() {
  const { db, can, actions, user } = useApp()
  const runs = db.runs.filter(r => !r.legacy)
  const [runId, setRunId] = useState(runs[0].id)
  const run = runs.find(r => r.id === runId)!
  const batch = db.payroll.find(b => b.runId === run.id)
  const approved = ['Approved', 'Published', 'Paid', 'Closed'].includes(run.state)
  const isCur = run.period === '2027-Q3'
  const liveSched = (id: string) => db.schedules.find(s => s.runId === run.id && s.payeeId === id && !s.supersededBy)
  const tot = (id: string) => liveSched(id)?.total ?? (isCur ? payeeTotal(id) : PERIOD_TOTALS[id][run.period] ?? 0)
  const byChannel = (['Payroll', 'AP'] as const).map(c => {
    const ps = PAYEES.filter(p => p.channel === c && tot(p.id) !== 0)
    return { c, n: ps.length, sched: ps.reduce((a, p) => a + tot(p.id), 0) }
  })
  const negatives = PAYEES.filter(p => tot(p.id) < 0)

  return (
    <>
      <PageHeader title="Payroll hand-off" subtitle="The payroll file is built from approved totals only. Before payroll runs, a second person confirms payroll amounts equal the approved totals (the payroll match check, also called a tie-out). If they differ, payroll stops until they match." req="PAY-1 · PAY-2 · PAY-4"
        actions={<Select value={runId} onChange={setRunId} options={runs.map(r => ({ value: r.id, label: `${periodLabel(r.period)} · ${r.state}` }))} />} />
      {!approved && <div className="mb-4"><Note tone="warn">Run {run.id} is <b>{run.state}</b>. The payroll file can only be generated after approval.</Note></div>}
      {batch?.mismatch ? <div className="mb-4"><Note tone="bad"><b>Payroll stopped.</b> The payroll register is {money(batch.mismatch)} above the approved totals. Nobody is paid until Payroll and Finance find the cause and the totals match. Corrections are never made by editing the approved run.</Note></div> : null}

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card title="Payroll batch" className="lg:col-span-2">
          {batch ? (
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Field label="Batch"><Mono>{batch.id}</Mono></Field>
              <Field label="Format">{batch.format}</Field>
              <Field label="Generated">{batch.generatedAt}</Field>
              <Field label="Rows">{batch.rows}</Field>
              <Field label="File total">{money(batch.total)}</Field>
              <Field label="Run approved by">{userName(batch.approvedBy)}</Field>
              <Field label="File hash"><Mono>{batch.fileHash?.slice(0, 30)}…</Mono></Field>
              <Field label="Payroll match check">{batch.signedOffBy ? <span className="flex items-center gap-2"><Status s="Approved" />{userName(batch.signedOffBy)}</span> : <Status s="Pending" />}</Field>
            </dl>
          ) : <p className="text-sm text-ink-2">No file generated yet for this run.</p>}
          <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
            <Button variant="primary" disabled={!approved || !!batch || !can.prepare} title={!can.prepare ? 'Finance preparer generates the file' : batch ? 'Already generated; regeneration needs new approval' : ''} onClick={() => actions.generatePayroll(run.id)}>Generate payroll & AP files</Button>
            <Button disabled={!batch || !!batch.signedOffBy || !!batch.mismatch || !can.payroll || batch?.approvedBy === user.id} title={batch?.mismatch ? 'Totals do not match; sign-off is blocked' : 'A second person confirms payroll equals approved totals'} onClick={() => batch && actions.signOffPayroll(batch.id)}>Sign payroll match check</Button>
            {batch && !batch.mismatch && !batch.signedOffBy && <Button variant="ghost" disabled={user.role !== 'payroll'} title={user.role !== 'payroll' ? 'Payroll operator records the payroll register total' : 'Demo: payroll register total differs from approved totals'} onClick={() => actions.simulatePayrollMismatch(batch.id)}>Simulate payroll mismatch</Button>}
            {batch?.mismatch ? <Button variant="primary" disabled={user.role !== 'payroll'} onClick={() => actions.recheckPayroll(batch.id)}>Re-check after payroll fix</Button> : null}
            <Button variant="ghost" disabled={!batch}>Download file</Button>
          </div>
        </Card>
        <Card title="Negative balances (PAY-4)">
          {negatives.length ? negatives.map(p => <div key={p.id}>{p.name}: {money(tot(p.id))}</div>) : <p className="text-sm text-ink-2">No negative balances. Clawbacks would be handled per Compensation/Legal policy, never netted silently.</p>}
        </Card>
      </div>

      <Card title="Payroll match check: approved schedules vs payroll register (PAY-1)" pad={false}>
        <Table head={['Channel', 'Payees', 'Approved schedule total', 'Payroll / AP file total', 'Difference', 'Result']}>
          {byChannel.map(b => (
            <tr key={b.c}>
              <td className="font-medium">{b.c}</td>
              <Num>{b.n}</Num>
              <Num>{money(b.sched)}</Num>
              <Num>{batch ? money(b.sched + (b.c === 'Payroll' ? batch.mismatch ?? 0 : 0)) : '—'}</Num>
              <Num className={batch?.mismatch && b.c === 'Payroll' ? 'text-bad' : ''}>{batch ? money(b.c === 'Payroll' ? batch.mismatch ?? 0 : 0) : '—'}</Num>
              <td>{batch ? <Status s={batch.mismatch && b.c === 'Payroll' ? 'Fail' : 'Pass'} /> : <Status s="Pending" />}</td>
            </tr>
          ))}
          <tr className="font-semibold"><td>Total</td><Num>{byChannel.reduce((a, b) => a + b.n, 0)}</Num><Num>{money(byChannel.reduce((a, b) => a + b.sched, 0))}</Num><Num>{batch ? money(batch.total) : '—'}</Num><td colSpan={2} /></tr>
        </Table>
      </Card>
    </>
  )
}
