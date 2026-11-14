import { useState } from 'react'
import { useApp } from '../state/AppContext'
import { periodLabel } from '../data/mock'
import { Button, Card, Kpi, Mono, money, Note, Num, PageHeader, Select, Status, Table, Tabs } from '../components/ui'

type Tab = 'inventory' | 'mapping' | 'discrepancies' | 'regression'

export default function Migration() {
  const { db, can, actions } = useApp()
  const [tab, setTab] = useState<Tab>('inventory')
  const [gen, setGen] = useState('all')
  const wb = db.workbooks.filter(w => gen === 'all' || w.generation === gen).slice().reverse()
  const loaded = db.workbooks.filter(w => w.status === 'Loaded' || w.status === 'Signed off').length
  const disc = db.workbooks.filter(w => w.status === 'Discrepancy')
  const mapsPending = db.mappings.filter(m => m.status === 'Suggested').length

  return (
    <>
      <PageHeader title="Historical migration" subtitle="Every historical quarter parsed to line level with the original file attached. Runs on its own track — it does not gate the build." req="MIG-1 … MIG-7" />
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Workbooks inventoried" value={db.workbooks.length} sub="2019 Q1 – 2026 Q4 · 4 template generations" />
        <Kpi label="Loaded as legacy runs" value={loaded} sub="visible in portal history and BI" tone="good" />
        <Kpi label="Open discrepancies vs payroll" value={disc.length} sub="need Finance sign-off" tone={disc.length ? 'bad' : 'good'} />
        <Kpi label="Name mappings to review" value={mapsPending} sub="legacy names → Salesforce IDs" tone={mapsPending ? 'warn' : 'good'} />
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'inventory', label: 'Workbook inventory' }, { id: 'mapping', label: 'Name mapping' }, { id: 'discrepancies', label: 'Discrepancy report' }, { id: 'regression', label: 'Regression suite' }]} />

      {tab === 'inventory' && <>
        <div className="mb-4"><Select label="Template generation" value={gen} onChange={setGen} options={[{ value: 'all', label: 'All' }, { value: 'G1', label: 'G1 (2019–2020)' }, { value: 'G2', label: 'G2 (2021–2022)' }, { value: 'G3', label: 'G3 (2023–2024)' }, { value: 'G4', label: 'G4 (2025–2026)' }]} /></div>
        <Card pad={false}>
          <Table head={['Period', 'Original file', 'Generation', 'Payees', 'Lines parsed', 'Parsed total', 'Status']}>
            {wb.map(w => <tr key={w.id}><td className="font-medium">{periodLabel(w.period)}</td><td className="text-accent">{w.file}</td><td><Mono>{w.generation}</Mono></td><Num>{w.payees}</Num><Num>{w.lines}</Num><Num>{money(w.total, 0)}</Num><td><Status s={w.status} /></td></tr>)}
          </Table>
        </Card>
      </>}

      {tab === 'mapping' && (
        <Card pad={false}>
          <Table head={['Kind', 'Legacy name in workbook', 'Suggested Salesforce match', 'Confidence', 'Status', '']}>
            {db.mappings.map(m => (
              <tr key={m.id}>
                <td>{m.kind}</td>
                <td className="font-mono text-xs">{m.legacyName}</td>
                <td>{m.suggestedName} {m.suggestedId !== '—' && <Mono>{m.suggestedId.slice(0, 10)}…</Mono>}</td>
                <Num className={m.confidence < 0.8 ? 'text-warn' : ''}>{Math.round(m.confidence * 100)}%</Num>
                <td><Status s={m.status} /></td>
                <td className="whitespace-nowrap">{m.status === 'Suggested' && <>
                  <Button size="sm" disabled={!can.migrate || m.suggestedId === '—'} onClick={() => actions.decideMapping(m.id, true)}>Approve</Button>{' '}
                  <Button size="sm" variant="ghost" disabled={!can.migrate} onClick={() => actions.decideMapping(m.id, false)}>Reject</Button></>}</td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      {tab === 'discrepancies' && <>
        <div className="mb-4"><Note>Migrated totals are validated against historical payroll registers (MIG-3). Each discrepancy needs a Finance explanation and sign-off before the quarter is loaded.</Note></div>
        <Card pad={false}>
          <Table head={['Period', 'Parsed workbook total', 'Payroll register', 'Difference', 'Status', '']}>
            {db.workbooks.filter(w => w.total !== w.payrollRegister || w.status === 'Signed off').slice().reverse().map(w => (
              <tr key={w.id}>
                <td className="font-medium">{periodLabel(w.period)}</td>
                <Num>{money(w.total)}</Num><Num>{money(w.payrollRegister)}</Num>
                <Num className={w.total !== w.payrollRegister ? 'text-bad' : ''}>{money(w.payrollRegister - w.total)}</Num>
                <td><Status s={w.status} /></td>
                <td>{w.status === 'Discrepancy' && <Button size="sm" disabled={!can.migrate} onClick={() => actions.signOffWorkbook(w.id)}>Sign off with explanation</Button>}</td>
              </tr>
            ))}
          </Table>
        </Card>
      </>}

      {tab === 'regression' && <>
        <div className="mb-4"><Note>The engine re-computes every migrated quarter from legacy inputs. Differences are classified; the result becomes the permanent regression suite (MIG-7).</Note></div>
        <Card pad={false}>
          <Table head={['Period', 'Generation', 'Lines', 'Result']}>
            {db.workbooks.slice().reverse().map(w => <tr key={w.id}><td>{periodLabel(w.period)}</td><td><Mono>{w.generation}</Mono></td><Num>{w.lines}</Num><td><Status s={w.regression} /></td></tr>)}
          </Table>
        </Card>
      </>}
    </>
  )
}
