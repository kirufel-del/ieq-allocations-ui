import { useApp } from '../state/AppContext'
import { payeeName, userName } from '../data/mock'
import { Button, Card, Mono, money, Note, Num, PageHeader, Status, Table } from '../components/ui'

export default function Adjustments() {
  const { db, can, actions } = useApp()
  return (
    <>
      <PageHeader title="Adjustments & true-ups" subtitle="Explicit lines referencing the original run and a reason — never a silent overwrite of a published schedule." req="CALC-5 · WF-4 · Archetype E" />
      <div className="mb-4"><Note>Correction path: payee question → adjustment drafted by preparer → reviewer approves → included in the next run, or the schedule is reissued as a new version with a change summary.</Note></div>
      <Card pad={false}>
        <Table head={['Adjustment', 'Payee', 'Amount', 'Original run', 'Included in', 'Reason', 'Drafted by', 'Status', '']}>
          {db.adjustments.map(a => (
            <tr key={a.id}>
              <td><Mono>{a.id}</Mono></td>
              <td>{payeeName(a.payeeId)}</td>
              <Num className={a.amount < 0 ? 'text-bad' : ''}>{money(a.amount)}</Num>
              <td><Mono>{a.originalRunId}</Mono></td>
              <td><Mono>{a.runId}</Mono></td>
              <td className="max-w-xs text-ink-2">{a.reason}</td>
              <td>{userName(a.createdBy)}</td>
              <td><Status s={a.status} /></td>
              <td>{a.status === 'Draft' && <Button size="sm" disabled={!can.approve} title={!can.approve ? 'Reviewer approves adjustments' : ''} onClick={() => actions.approveAdjustment(a.id)}>Approve</Button>}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  )
}
