import { useState } from 'react'
import { useApp } from '../state/AppContext'
import { PAYEES, payeeName, userName } from '../data/mock'
import { Badge, Button, Card, Modal, Mono, Note, PageHeader, Select, Status } from '../components/ui'
import { TODAY } from '../data/mock'

export const who = (id: string) => (PAYEES.some(p => p.id === id) ? payeeName(id) : userName(id))

export default function Questions() {
  const { db, can, actions } = useApp()
  const [status, setStatus] = useState('all')
  const list = db.questions.filter(q => status === 'all' || q.status === status)
  const [openId, setOpenId] = useState(list[0]?.id)
  const [reply, setReply] = useState('')
  const [adjOpen, setAdjOpen] = useState(false)
  const [amt, setAmt] = useState('')
  const [why, setWhy] = useState('')
  const cur = db.questions.find(q => q.id === openId)

  return (
    <>
      <PageHeader title="Payee questions" subtitle="Line-level questions tied to a schedule version, with a Finance SLA. If a payee is right, draft an adjustment from the thread; a second person approves it and the payee gets a new version." req="DIST-5 · WF-4" />
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
            {cur.adjustmentId && cur.status !== 'Resolved' && <div className="mt-4"><Note tone="warn">Adjustment {cur.adjustmentId} is waiting for second-person approval on the Adjustments page.</Note></div>}
            {can.prepare && cur.status !== 'Resolved' && !cur.adjustmentId && <div className="mt-4 flex justify-end"><Button onClick={() => { setAmt(''); setWhy(''); setAdjOpen(true) }}>Payee is right: draft adjustment</Button></div>}
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
      <Modal open={adjOpen} onClose={() => setAdjOpen(false)} title={`Draft adjustment for ${cur ? payeeName(cur.payeeId) : ''}`}>
        <form onSubmit={e => { e.preventDefault(); const n = parseFloat(amt); if (!cur || isNaN(n) || !why.trim()) return; actions.draftAdjustment(cur.id, n, why.trim()); setAdjOpen(false) }} className="space-y-3">
          <label className="block text-xs font-medium text-ink-2">Amount (USD, negative for a reduction)<input autoFocus value={amt} onChange={e => setAmt(e.target.value)} inputMode="decimal" className="mt-1 w-full rounded-lg border border-line bg-surface p-2 text-sm outline-none focus:border-accent" /></label>
          <label className="block text-xs font-medium text-ink-2">Reason (shown to the payee on the new version)<textarea value={why} onChange={e => setWhy(e.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-line bg-surface p-2 text-sm outline-none focus:border-accent" /></label>
          <p className="text-xs text-ink-3">A different person must approve it. If payroll has not run yet, the schedule is reissued as a new version; otherwise it rolls into next quarter.</p>
          <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setAdjOpen(false)}>Cancel</Button><Button type="submit" variant="primary" disabled={isNaN(parseFloat(amt)) || !why.trim()}>Draft adjustment</Button></div>
        </form>
      </Modal>
    </>
  )
}
