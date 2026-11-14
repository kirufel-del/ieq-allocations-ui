import { useApp } from '../state/AppContext'
import { DQ_CHECKS, REVENUE, SPLITS, clientName, payeeName, periodLabel, userName } from '../data/mock'
import { Badge, Button, Card, Mono, money, Num, PageHeader, Status, Table } from '../components/ui'
import { useState } from 'react'

export default function Snapshots() {
  const { db, can, actions } = useApp()
  const [sel, setSel] = useState(db.snapshots[0].id)
  const snap = db.snapshots.find(s => s.id === sel) ?? db.snapshots[0]
  return (
    <>
      <PageHeader title="Snapshots" subtitle="Quarter-end pull from Salesforce via Bulk API 2.0. Locked snapshots are immutable; corrections create a new sequence." req="ING-1 · ING-2 · ING-3 · ING-4 · ING-7"
        actions={<>
          <Button disabled={!can.prepare} title={!can.prepare ? 'Finance preparer triggers snapshots' : ''} onClick={() => actions.reSnapshot('2027-Q3')}>Partial re-snapshot (fixed clients)</Button>
        </>} />
      <Card className="mb-6" pad={false}>
        <Table head={['Snapshot', 'Period', 'Seq', 'Locked', 'By', 'Clients', 'Revenue rows', 'Splits', 'Payees', 'Duration', 'Source hash', '']}>
          {db.snapshots.map(s => (
            <tr key={s.id} className={s.id === sel ? 'bg-accent-bg/50' : ''}>
              <td><button className="font-medium text-accent hover:underline" onClick={() => setSel(s.id)}>{s.id}</button></td>
              <td>{periodLabel(s.period)}</td>
              <Num>{s.seq}</Num>
              <td className="whitespace-nowrap">{s.lockedAt}</td>
              <td>{userName(s.lockedBy)}</td>
              <Num>{s.counts.clients}</Num><Num>{s.counts.revenue}</Num><Num>{s.counts.splits}</Num><Num>{s.counts.payees}</Num>
              <Num>{s.durationSec}s</Num>
              <td><Mono>{s.sourceHash}</Mono></td>
              <td><Badge tone="neutral">🔒 Locked</Badge>{s.partialOf && <span className="ml-1"><Badge tone="info">Partial</Badge></span>}</td>
            </tr>
          ))}
        </Table>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={`Data-quality checks at ingest · ${snap.id}`}>
          {snap.note && <p className="mb-3 text-sm text-ink-2">{snap.note}</p>}
          <Table head={['Check', 'Failures', 'Severity']} dense>
            {DQ_CHECKS.map(c => (
              <tr key={c.check}>
                <td>{c.check}</td>
                <Num>{c.count}</Num>
                <td>{c.count === 0 ? <Status s="Pass" /> : c.severity === 'Info' ? <Badge tone="info">Marked</Badge> : <Status s="Blocking" />}</td>
              </tr>
            ))}
          </Table>
        </Card>
        <Card title="Sample contents (first 8 revenue rows with splits)">
          <Table head={['Revenue', 'Client', 'Amount', 'Splits']} dense>
            {REVENUE.slice(0, 8).map(r => (
              <tr key={r.id}>
                <td><Mono>{r.id}</Mono></td>
                <td className="max-w-[180px] truncate">{clientName(r.clientId)}</td>
                <Num>{money(r.amount)}</Num>
                <td className="text-xs text-ink-2">{SPLITS.filter(s => s.clientId === r.clientId).map(s => `${payeeName(s.payeeId)} ${s.pct}%${s.to ? ` →${s.to.slice(5)}` : ''}`).join(' · ')}</td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
    </>
  )
}
