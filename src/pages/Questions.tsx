import { useState } from 'react'
import { useApp } from '../state/AppContext'
import { PAYEES, payeeName, userName } from '../data/mock'
import { Badge, Button, Card, Mono, PageHeader, Select, Status } from '../components/ui'
import { TODAY } from '../data/mock'

export const who = (id: string) => (PAYEES.some(p => p.id === id) ? payeeName(id) : userName(id))

export default function Questions() {
  const { db, can, actions } = useApp()
  const [status, setStatus] = useState('all')
  const list = db.questions.filter(q => status === 'all' || q.status === status)
  const [openId, setOpenId] = useState(list[0]?.id)
  const [reply, setReply] = useState('')
  const cur = db.questions.find(q => q.id === openId)

  return (
    <>
      <PageHeader title="Payee questions" subtitle="Line-level questions tied to a schedule version, with a Finance SLA. Resolutions link to any adjustment." req="DIST-5 · WF-4" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_1fr]">
        <Card title="Threads" actions={<Select value={status} onChange={setStatus} options={['all', 'Open', 'Answered', 'Resolved'].map(v => ({ value: v, label: v === 'all' ? 'All' : v }))} />} pad={false}>
          <ul>
            {list.map(q => (
              <li key={q.id}>
                <button onClick={() => setOpenId(q.id)} className={`w-full border-b border-line/60 px-4 py-3 text-left hover:bg-muted ${q.id === openId ? 'bg-accent-bg/60' : ''}`}>
                  <div className="flex items-center justify-between gap-2"><span className="text-sm font-medium text-ink">{q.subject}</span><Status s={q.status} /></div>
                  <div className="mt-1 text-xs text-ink-3">{payeeName(q.payeeId)} · {q.id} · SLA {q.slaDue}{q.status === 'Open' && q.slaDue <= TODAY ? ' · due' : ''}</div>
                </button>
              </li>
            ))}
          </ul>
        </Card>
        {cur && (
          <Card title={<span>{cur.subject} <span className="font-normal text-ink-3">· {cur.id}</span></span>} actions={<Status s={cur.status} />}>
            <div className="mb-4 flex flex-wrap gap-2 text-xs text-ink-2">
              <span>Schedule <Mono>{cur.scheduleId}</Mono></span>
              {cur.lineRef && <Badge tone="info">Line: {cur.lineRef}</Badge>}
              {cur.adjustmentId && <Badge tone="accent">Linked adjustment {cur.adjustmentId}</Badge>}
              <Badge tone={cur.status === 'Open' && cur.slaDue <= TODAY ? 'bad' : 'neutral'}>SLA {cur.slaDue}</Badge>
            </div>
            <ul className="space-y-3">
              {cur.messages.map((m, i) => {
                const fromPayee = m.by === cur.payeeId
                return (
                  <li key={i} className={`max-w-[85%] rounded-xl p-3 text-sm ${fromPayee ? 'bg-muted' : 'ml-auto bg-accent-bg'}`}>
                    <div className="mb-1 text-xs text-ink-3">{who(m.by)} · {m.at}</div>{m.text}
                  </li>
                )
              })}
            </ul>
            {can.prepare && cur.status !== 'Resolved' && (
              <form className="mt-4 space-y-2" onSubmit={e => e.preventDefault()}>
                <textarea value={reply} onChange={e => setReply(e.target.value)} rows={3} placeholder="Reply to payee…" className="w-full rounded-lg border border-line bg-surface p-2 text-sm outline-none focus:border-accent" />
                <div className="flex justify-end gap-2">
                  <Button disabled={!reply.trim()} onClick={() => { actions.replyQuestion(cur.id, reply.trim(), false); setReply('') }}>Send answer</Button>
                  <Button variant="primary" disabled={!reply.trim()} onClick={() => { actions.replyQuestion(cur.id, reply.trim(), true); setReply('') }}>Send & resolve</Button>
                </div>
              </form>
            )}
          </Card>
        )}
      </div>
    </>
  )
}
