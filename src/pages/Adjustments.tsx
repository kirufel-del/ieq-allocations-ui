import { Link } from 'react-router-dom'
import { useApp } from '../state/AppContext'
import { payeeName, userName } from '../data/mock'
import { Button, Card, Mono, money, Note, Num, PageHeader, Status, Table } from '../components/ui'

export default function Adjustments() {
  const { db, can, actions, user } = useApp()
  return (
    <>
      <PageHeader title="Adjustments & true-ups" subtitle="Explicit lines referencing the original run and a reason — never a silent overwrite of a published schedule." req="CALC-5 · WF-4 · Archetype E" />
      <div className="mb-4"><Note>Correction path: a payee asks about a line → Finance drafts an adjustment from the question → a different person approves it → if payroll has not run, the schedule is reissued as a new version with a note of what changed (the old version stays viewable); if payroll has run, it rolls into next quarter as a true-up. Nothing is overwritten.</Note></div>
      <Card pad={false}>
        <Table head={['Adjustment', 'Payee', 'Amount', 'Original run', 'From question', 'Reason', 'Drafted by', 'Approved by', 'Status', 'Outcome', '']}>
          {db.adjustments.map(a => (
            <tr key={a.id}>
              <td><Mono>{a.id}</Mono></td>
              <td>{payeeName(a.payeeId)}</td>
              <Num className={a.amount < 0 ? 'text-bad' : ''}>{money(a.amount)}</Num>
              <td><Mono>{a.originalRunId}</Mono></td>
              <td>{a.questionId ? <Link className="text-accent hover:underline" to="/questions">{a.questionId}</Link> : '—'}</td>
              <td className="max-w-xs text-ink-2">{a.reason}</td>
              <td>{userName(a.createdBy)}</td>
              <td>{a.approvedBy ? userName(a.approvedBy) : '—'}</td>
              <td><Status s={a.status} /></td>
              <td className="text-ink-2">{a.outcome ?? (a.status === 'Approved' ? 'On the current run' : '—')}</td>
              <td>{a.status === 'Draft' && <Button size="sm" disabled={!can.approve || a.createdBy === user.id} title={a.createdBy === user.id ? 'You drafted this; a different person must approve it' : !can.approve ? 'The Finance controller approves adjustments' : ''} onClick={() => actions.approveAdjustment(a.id)}>Approve</Button>}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  )
}
