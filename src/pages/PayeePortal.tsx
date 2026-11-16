import { useState } from 'react'
import { Bell, Download, MessageSquare } from 'lucide-react'
import { useApp } from '../state/AppContext'
import { ALL_PERIODS, LEGACY_PERIODS, PERIOD_TOTALS, payeeById, periodLabel } from '../data/mock'
import type { ScheduleVersion } from '../data/types'
import { Badge, Button, Card, Modal, money, Note, Num, Status, Table } from '../components/ui'
import ScheduleDoc from '../components/ScheduleDoc'
import { who } from './Questions'

export default function PayeePortal() {
  const { db, user, actions } = useApp()
  const settingsWindow = db.settings.reviewWindowDays
  const payee = payeeById(user.payeeId)!
  const mine = db.schedules.filter(s => s.payeeId === payee.id)
  const latestPeriod = [...new Set(mine.map(s => s.period))].sort().reverse()[0]
  const current = mine.filter(s => s.period === latestPeriod && !s.supersededBy)[0]
  const [viewId, setViewId] = useState<string | null>(null)
  const [askLine, setAskLine] = useState<string | null>(null)
  const [text, setText] = useState('')
  const viewing: ScheduleVersion | undefined = viewId ? (mine.find(s => s.id === viewId) ?? legacySchedule(viewId, payee.id)) : current
  const questions = db.questions.filter(q => q.payeeId === payee.id)

  const history = ALL_PERIODS.slice().reverse().filter(p => PERIOD_TOTALS[payee.id][p] !== undefined && p !== '2027-Q3' || mine.some(s => s.period === p))

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">Hello, {payee.name.split(' ')[0]}</h1>
        <p className="text-sm text-ink-2">Your profit-share schedules, history and questions. Only you can see this information.</p>
      </div>

      {current && current.version > 1 && !current.ack && (
        <div className="mb-3"><Note tone="info"><b>Version {current.version} replaces version {current.version - 1}.</b> {current.changeSummary ?? 'See the note on the schedule for what changed.'} Earlier versions stay in your history.</Note></div>
      )}
      {current && !current.ack && (
        <div className="mb-6"><Note tone="warn"><b className="inline-flex items-center gap-1"><Bell size={13} /> Your {periodLabel(current.period)} schedule is ready.</b> Please review and acknowledge within {settingsWindow} business days. If you do nothing it is deemed accepted, without waiving later corrections.</Note></div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-4">
          {viewing ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-ink">{periodLabel(viewing.period)} · v{viewing.version}</h2>
                {viewing.legacy && <Badge>Imported from legacy workbook</Badge>}
                {viewing.supersededBy && <Status s="Superseded" />}
                {viewing.ack ? <Status s={viewing.ack.kind} /> : !viewing.legacy && <Status s="Awaiting" />}
                <span className="flex-1" />
                <Button size="sm"><Download size={13} /> PDF</Button>
                <Button size="sm"><Download size={13} /> Excel</Button>
                {!viewing.ack && !viewing.legacy && !viewing.supersededBy && <Button size="sm" variant="primary" onClick={() => actions.ackSchedule(viewing.id)}>Acknowledge</Button>}
                {!viewing.legacy && <Button size="sm" onClick={() => setAskLine('')}><MessageSquare size={13} /> Ask a question</Button>}
              </div>
              <ScheduleDoc s={viewing} onAskLine={viewing.legacy ? undefined : l => setAskLine(l)} />
            </>
          ) : <Card><p className="text-sm text-ink-2">No schedules yet.</p></Card>}
        </div>

        <div className="space-y-6">
          <Card title="History" pad={false}>
            <div className="max-h-[420px] overflow-y-auto">
              <Table head={['Period', 'Total', '']} dense>
                {history.map(p => {
                  const vs = mine.filter(s => s.period === p).sort((a, b) => b.version - a.version)
                  const id = vs[0]?.id ?? `LEGACY-${p}`
                  return (
                    <tr key={p} className={`cursor-pointer ${viewing?.id === id ? 'bg-accent-bg/60' : ''}`} onClick={() => setViewId(id)}>
                      <td>{periodLabel(p)}{vs.length > 1 && <span className="ml-1 text-[11px] text-ink-3">v{vs[0].version}</span>}</td>
                      <Num>{money(vs[0]?.total ?? PERIOD_TOTALS[payee.id][p], 0)}</Num>
                      <td>{LEGACY_PERIODS.includes(p) ? <Badge icon={false}>Imported</Badge> : vs[0]?.ack ? <Badge tone="good" icon={false}>✓</Badge> : null}</td>
                    </tr>
                  )
                })}
              </Table>
            </div>
          </Card>
          <Card title="My questions">
            {questions.length ? (
              <ul className="space-y-3">
                {questions.map(q => (
                  <li key={q.id} className="rounded-lg border border-line p-3 text-sm">
                    <div className="flex items-start justify-between gap-2"><span className="font-medium">{q.subject}</span><Status s={q.status} /></div>
                    <div className="mt-1 text-xs text-ink-3">{q.id}{q.lineRef ? ` · ${q.lineRef}` : ''}</div>
                    {q.messages.length > 1 && <div className="mt-2 rounded bg-muted p-2 text-xs text-ink-2"><b>{who(q.messages[q.messages.length - 1].by)}:</b> {q.messages[q.messages.length - 1].text}</div>}
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-ink-2">No questions. Use “Ask” on any line of a schedule.</p>}
          </Card>
        </div>
      </div>

      <Modal open={askLine !== null} onClose={() => setAskLine(null)} title={askLine ? `Question about: ${askLine}` : 'Ask Finance a question'}>
        <form onSubmit={e => { e.preventDefault(); if (!viewing || !text.trim()) return; actions.askQuestion(viewing.id, payee.id, askLine ? `Question on ${askLine}` : text.trim().slice(0, 60), text.trim(), askLine || undefined); setText(''); setAskLine(null) }}>
          <textarea autoFocus rows={4} value={text} onChange={e => setText(e.target.value)} placeholder="What looks wrong or unclear?" className="w-full rounded-lg border border-line bg-surface p-2 text-sm outline-none focus:border-accent" />
          <p className="mt-2 text-xs text-ink-3">Finance answers within 3 business days. If a correction is needed, a second person approves it and you receive a new version with a note of what changed. Your earlier version stays viewable.</p>
          <div className="mt-3 flex justify-end"><Button type="submit" variant="primary" disabled={!text.trim()}>Send</Button></div>
        </form>
      </Modal>
    </>
  )
}

function legacySchedule(id: string, payeeId: string): ScheduleVersion | undefined {
  if (!id.startsWith('LEGACY-')) return undefined
  const period = id.slice(7)
  return { id: `IMP-${period}-${payeeId.slice(-4)}`, runId: `LEG-${period.replace('-', '')}`, period, payeeId, version: 1, total: PERIOD_TOTALS[payeeId][period], checksum: 'sha256:imported-original-attached', publishedAt: 'imported', delivery: 'Portal', ownerCheck: 'Pass', legacy: true }
}
