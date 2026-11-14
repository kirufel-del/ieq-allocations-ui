import { useMemo, useState } from 'react'
import { useApp } from '../state/AppContext'
import { ALL_PERIODS, PAYEES, payeeName, periodLabel, userName } from '../data/mock'
import { Badge, Button, Card, Mono, Note, PageHeader, SearchInput, Select, Status, Table, Tabs } from '../components/ui'

type Tab = 'log' | 'approvals' | 'evidence'
const actorName = (id: string) => (id === 'system' ? 'System' : PAYEES.some(p => p.id === id) ? `${payeeName(id)} (payee)` : userName(id))

export default function Audit() {
  const { db, actions, user } = useApp()
  const [tab, setTab] = useState<Tab>('log')
  const [q, setQ] = useState('')
  const [kind, setKind] = useState('all')
  const actionsList = [...new Set(db.audit.map(a => a.action))].sort()
  const log = useMemo(() => db.audit.filter(a => (kind === 'all' || a.action === kind) && (!q || `${a.entity} ${a.detail} ${actorName(a.actor)}`.toLowerCase().includes(q.toLowerCase()))), [db.audit, q, kind])
  const [period, setPeriod] = useState('2027-Q2')
  const approvals = [
    ...db.runs.filter(r => r.approver).map(r => ({ at: r.approvedAt ?? '', what: `Run ${r.id}`, maker: userName(r.preparer), checker: userName(r.approver), status: 'Approved' })),
    ...db.ruleChanges.filter(c => c.approver).map(c => ({ at: c.decidedAt ?? '', what: `Rule ${c.id} · ${c.summary}`, maker: userName(c.author), checker: userName(c.approver), status: c.status })),
    ...db.payroll.filter(b => b.signedOffBy).map(b => ({ at: b.generatedAt ?? '', what: `Payroll tie-out ${b.id}`, maker: userName(b.approvedBy), checker: userName(b.signedOffBy), status: 'Approved' })),
  ].sort((a, b) => (a.at < b.at ? 1 : -1))

  return (
    <>
      <PageHeader title="Audit & evidence" subtitle="Append-only log of every data change, rule change, approval, publication, delivery and document access. Retained ≥ 7 years." req="AUD-1 · AUD-2 · AUD-3" />
      {user.role === 'auditor' && <div className="mb-4"><Note>Read-only auditor access. You can view runs, rules history, approvals and the audit log, and export evidence per period.</Note></div>}
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'log', label: `Audit log (${db.audit.length})` }, { id: 'approvals', label: 'Maker / checker approvals' }, { id: 'evidence', label: 'Evidence export' }]} />

      {tab === 'log' && <>
        <div className="mb-4 flex flex-wrap gap-3">
          <SearchInput value={q} onChange={setQ} />
          <Select label="Action" value={kind} onChange={setKind} options={[{ value: 'all', label: 'All actions' }, ...actionsList.map(a => ({ value: a, label: a }))]} />
        </div>
        <Card pad={false}>
          <Table head={['Event', 'Time', 'Actor', 'Action', 'Entity', 'Detail']} dense>
            {log.slice(0, 200).map(a => (
              <tr key={a.id}>
                <td><Mono>{a.id}</Mono></td>
                <td className="whitespace-nowrap font-mono text-xs">{a.at}</td>
                <td className="whitespace-nowrap">{actorName(a.actor)}</td>
                <td className="whitespace-nowrap">{a.action}</td>
                <td><Mono>{a.entity}</Mono></td>
                <td className="text-ink-2">{a.detail}</td>
              </tr>
            ))}
          </Table>
        </Card>
      </>}

      {tab === 'approvals' && (
        <Card pad={false}>
          <Table head={['Date', 'What', 'Maker', 'Checker', 'Decision', 'SoD']}>
            {approvals.map((a, i) => <tr key={i}><td className="whitespace-nowrap font-mono text-xs">{a.at}</td><td>{a.what}</td><td>{a.maker}</td><td>{a.checker}</td><td><Status s={a.status} /></td><td>{a.maker !== a.checker ? <Badge tone="good">Different people</Badge> : <Badge tone="bad">Same person</Badge>}</td></tr>)}
          </Table>
        </Card>
      )}

      {tab === 'evidence' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Evidence pack per period">
            <Select label="Period" value={period} onChange={setPeriod} options={ALL_PERIODS.slice().reverse().map(p => ({ value: p, label: periodLabel(p) }))} />
            <ul className="mt-4 space-y-2 text-sm text-ink-2">
              {['Snapshot manifest and source hashes', 'Rules register version and change history', 'Allocation lines with lineage (CSV)', 'Reconciliation report (VAL-7)', 'Exception log with resolutions', 'Approval records (maker/checker)', 'Schedule versions with checksums', 'Delivery and acknowledgment log', 'Payroll file hash and signed tie-out'].map(i => <li key={i} className="flex items-center gap-2">☑ {i}</li>)}
            </ul>
            <div className="mt-4 flex gap-2">
              <Button variant="primary" onClick={() => actions.exportEvidence(`Evidence pack ${periodLabel(period)}`)}>Export evidence pack (ZIP)</Button>
            </div>
          </Card>
          <Card title="Retention & legal hold">
            <Table head={['Item', 'Retention', 'Legal hold']} dense>
              <tr><td>Runs, snapshots, lines</td><td>7 years</td><td>—</td></tr>
              <tr><td>Schedule documents</td><td>7 years</td><td><Badge tone="warn">1 payee (OV-09)</Badge></td></tr>
              <tr><td>Audit log</td><td>7 years, append-only</td><td>—</td></tr>
              <tr><td>Migrated legacy workbooks</td><td>7 years from import</td><td>—</td></tr>
            </Table>
          </Card>
        </div>
      )}
    </>
  )
}
