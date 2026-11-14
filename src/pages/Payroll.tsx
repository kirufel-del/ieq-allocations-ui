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
  const tot = (id: string) => isCur ? payeeTotal(id) : PERIOD_TOTALS[id][run.period] ?? 0
  const byChannel = (['Payroll', 'AP'] as const).map(c => {
    const ps = PAYEES.filter(p => p.channel === c && tot(p.id) !== 0)
    return { c, n: ps.length, sched: ps.reduce((a, p) => a + tot(p.id), 0) }
  })
  const negatives = PAYEES.filter(p => tot(p.id) < 0)

  return (
    <>
      <PageHeader title="Payroll hand-off" subtitle="The import file is generated from approved totals only. File hash recorded; regeneration requires new approval." req="PAY-1 · PAY-2 · PAY-4"
        actions={<Select value={runId} onChange={setRunId} options={runs.map(r => ({ value: r.id, label: `${periodLabel(r.period)} · ${r.state}` }))} />} />
      {!approved && <div className="mb-4"><Note tone="warn">Run {run.id} is <b>{run.state}</b>. The payroll file can only be generated after approval.</Note></div>}

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
              <Field label="Tie-out sign-off">{batch.signedOffBy ? <span className="flex items-center gap-2"><Status s="Approved" />{userName(batch.signedOffBy)}</span> : <Status s="Pending" />}</Field>
            </dl>
          ) : <p className="text-sm text-ink-2">No file generated yet for this run.</p>}
          <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
            <Button variant="primary" disabled={!approved || !!batch || !can.prepare} title={!can.prepare ? 'Finance preparer generates the file' : batch ? 'Already generated; regeneration needs new approval' : ''} onClick={() => actions.generatePayroll(run.id)}>Generate payroll & AP files</Button>
            <Button disabled={!batch || !!batch.signedOffBy || !can.payroll || batch?.approvedBy === user.id} title="Second person signs the tie-out" onClick={() => batch && actions.signOffPayroll(batch.id)}>Sign tie-out</Button>
            <Button variant="ghost" disabled={!batch}>Download file</Button>
          </div>
        </Card>
        <Card title="Negative balances (PAY-4)">
          {negatives.length ? negatives.map(p => <div key={p.id}>{p.name}: {money(tot(p.id))}</div>) : <p className="text-sm text-ink-2">No negative balances. Clawbacks would be handled per Compensation/Legal policy, never netted silently.</p>}
        </Card>
      </div>

      <Card title="Tie-out: approved schedules vs payroll submission (PAY-1)" pad={false}>
        <Table head={['Channel', 'Payees', 'Approved schedule total', 'Payroll / AP file total', 'Difference', 'Result']}>
          {byChannel.map(b => (
            <tr key={b.c}>
              <td className="font-medium">{b.c}</td>
              <Num>{b.n}</Num>
              <Num>{money(b.sched)}</Num>
              <Num>{batch ? money(b.sched) : '—'}</Num>
              <Num>{batch ? money(0) : '—'}</Num>
              <td>{batch ? <Status s="Pass" /> : <Status s="Pending" />}</td>
            </tr>
          ))}
          <tr className="font-semibold"><td>Total</td><Num>{byChannel.reduce((a, b) => a + b.n, 0)}</Num><Num>{money(byChannel.reduce((a, b) => a + b.sched, 0))}</Num><Num>{batch ? money(batch.total) : '—'}</Num><td colSpan={2} /></tr>
        </Table>
      </Card>
    </>
  )
}
