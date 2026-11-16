import { useApp } from '../state/AppContext'
import { BROKEN_SPLIT_CLIENTS, CRMA_FEE_TOTAL, CRMA_STUB_TOTAL, GL_ACCRUAL, LINES, REVENUE, clientName } from '../data/mock'
import type { ValidationCheck } from '../data/types'
import { Button, Card, money, Num, PageHeader, Status, Table } from '../components/ui'

export default function Reconciliation() {
  const { db, currentRun, actions } = useApp()
  const ex = db.exceptions.filter(e => e.runId === currentRun.id)
  const splitOpen = ex.filter(e => e.check === 'VAL-1' && e.status !== 'Resolved').length
  const varianceOpen = ex.filter(e => e.check === 'VAL-5' && e.status !== 'Resolved').length
  const fee = REVENUE.filter(r => r.type === 'Fee').reduce((a, r) => a + r.amount, 0)
  const stub = REVENUE.filter(r => r.type === 'Stub').reduce((a, r) => a + r.amount, 0)
  const stubLines = LINES.filter(l => l.archetype === 'D')
  const stubClients = new Set(stubLines.map(l => l.clientId)).size
  const gl = db.settings.glTolerance
  const diffGl = GL_ACCRUAL - currentRun.total

  const checks: ValidationCheck[] = [
    { id: 'VAL-1', name: 'Splits sum to 100% per client-period', description: `${BROKEN_SPLIT_CLIENTS.map(clientName).join('; ')}`, status: splitOpen ? 'Fail' : 'Pass', failures: splitOpen },
    { id: 'VAL-2a', name: 'Snapshot fee revenue ties to CRM Analytics fee dataset', description: 'SAQL query on ieq_fees, period 2027-Q3', status: 'Pass', expected: CRMA_FEE_TOTAL, actual: fee, failures: 0 },
    { id: 'VAL-2b', name: 'Snapshot stub revenue ties to CRM Analytics stub dataset', description: 'SAQL query on ieq_stub_fees', status: 'Pass', expected: CRMA_STUB_TOTAL, actual: stub, failures: 0 },
    { id: 'VAL-3', name: 'Stub-period pieces sum to full-quarter amount', description: `${stubClients} clients with mid-quarter boundaries, ${stubLines.length} stub lines`, status: 'Pass', failures: 0 },
    { id: 'VAL-4', name: 'Run total ties to GL profit-share accrual', description: `Accrual imported from GL; tolerance ±${money(gl, 0)}`, status: Math.abs(diffGl) <= gl ? 'Pass' : 'Fail', expected: GL_ACCRUAL, actual: currentRun.total, tolerance: gl, failures: Math.abs(diffGl) <= gl ? 0 : 1 },
    { id: 'VAL-5', name: `Variance flags (> ${db.settings.variancePct}% or ${money(db.settings.varianceAbs, 0)} vs prior; new; terminated; zero)`, description: 'Warnings need a comment before submission', status: varianceOpen ? 'Warn' : 'Pass', failures: varianceOpen },
  ]

  return (
    <>
      <PageHeader title="Validation & reconciliation · Q3 2027" subtitle="Replaces hand reconciliation: the frozen Salesforce data is compared automatically with the CRM Analytics totals and the GL accrual. Finance sees only the differences." req="VAL-1 … VAL-7"
        actions={<Button onClick={() => actions.exportEvidence('Reconciliation report Q3 2027 (PDF + CSV)')}>Export reconciliation report</Button>} />
      <Card pad={false}>
        <Table head={['Check', 'Description', 'Expected', 'Actual', 'Δ', 'Result']}>
          {checks.map(c => (
            <tr key={c.id}>
              <td><div className="font-medium">{c.name}</div><div className="font-mono text-[11px] text-ink-3">{c.id}</div></td>
              <td className="max-w-sm text-ink-2">{c.description}</td>
              <Num>{c.expected !== undefined ? money(c.expected) : '—'}</Num>
              <Num>{c.actual !== undefined ? money(c.actual) : '—'}</Num>
              <Num>{c.expected !== undefined ? money(c.actual! - c.expected) : c.failures ? `${c.failures} item${c.failures > 1 ? 's' : ''}` : '—'}</Num>
              <td><Status s={c.status} /></td>
            </tr>
          ))}
        </Table>
      </Card>
      <p className="mt-4 text-xs text-ink-3">Each failing check also appears as an exception with an owner (VAL-6). The report is retained with the run as audit evidence (VAL-7).</p>
    </>
  )
}
