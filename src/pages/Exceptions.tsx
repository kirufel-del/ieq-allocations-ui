import { useMemo, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { useApp } from '../state/AppContext'
import { USERS, clientName, payeeName, userName } from '../data/mock'
import type { ExceptionItem } from '../data/types'
import { Button, Card, Drawer, Field, Mono, PageHeader, SearchInput, Select, Status, Table, usePrompt } from '../components/ui'

export default function Exceptions() {
  const { db, can, actions, currentRun, user } = useApp()
  const [prompt, ask] = usePrompt()
  const [status, setStatus] = useState(user.role === 'dataowner' ? 'open' : 'open')
  const [sev, setSev] = useState('all')
  const [owner, setOwner] = useState(user.role === 'dataowner' ? 'u5' : 'all')
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<string[]>([])
  const [openId, setOpenId] = useState<string | null>(null)
  const [comment, setComment] = useState('')

  const list = useMemo(() => db.exceptions.filter(e => e.runId === currentRun.id)
    .filter(e => status === 'all' || (status === 'open' ? e.status !== 'Resolved' : e.status === 'Resolved'))
    .filter(e => sev === 'all' || e.severity === sev)
    .filter(e => owner === 'all' || e.owner === owner)
    .filter(e => !q || (e.detail + e.type + e.id).toLowerCase().includes(q.toLowerCase())), [db.exceptions, status, sev, owner, q, currentRun.id])
  const cur = db.exceptions.find(e => e.id === openId)
  const selectable = (e: ExceptionItem) => e.status !== 'Resolved' && can.resolveException(e)

  return (
    <>
      {prompt}
      <PageHeader title="Exception queue" subtitle="Only failing items reach Finance. Blocking exceptions prevent submission; warnings require a comment." req="WF-3 · VAL-6 · ING-4"
        actions={<Button variant="primary" disabled={!sel.length} onClick={() => ask(`Resolve ${sel.length} exceptions`, 'Resolution comment (applied to each)', c => { actions.bulkResolve(sel, c); setSel([]) })}>Bulk resolve ({sel.length})</Button>} />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput value={q} onChange={setQ} />
        <Select label="Status" value={status} onChange={setStatus} options={[{ value: 'open', label: 'Unresolved' }, { value: 'resolved', label: 'Resolved' }, { value: 'all', label: 'All' }]} />
        <Select label="Severity" value={sev} onChange={setSev} options={[{ value: 'all', label: 'All' }, { value: 'Blocking', label: 'Blocking' }, { value: 'Warning', label: 'Warning' }]} />
        <Select label="Owner" value={owner} onChange={setOwner} options={[{ value: 'all', label: 'Anyone' }, ...USERS.map(u => ({ value: u.id, label: u.name }))]} />
      </div>

      <Card pad={false}>
        <Table head={['', 'ID', 'Severity', 'Type', 'Detail', 'Check', 'Owner', 'Status', '']}>
          {list.map(e => (
            <tr key={e.id}>
              <td><input type="checkbox" disabled={!selectable(e)} checked={sel.includes(e.id)} onChange={ev => setSel(s => ev.target.checked ? [...s, e.id] : s.filter(x => x !== e.id))} aria-label={`Select ${e.id}`} /></td>
              <td><button className="font-medium text-accent hover:underline" onClick={() => setOpenId(e.id)}>{e.id}</button></td>
              <td><Status s={e.severity} /></td>
              <td className="whitespace-nowrap">{e.type}</td>
              <td className="max-w-md text-ink-2">{e.detail}</td>
              <td><Mono>{e.check}</Mono></td>
              <td className="whitespace-nowrap">{userName(e.owner)}</td>
              <td><Status s={e.status} /></td>
              <td><Button size="sm" variant="ghost" onClick={() => setOpenId(e.id)}>Open</Button></td>
            </tr>
          ))}
          {!list.length && <tr><td colSpan={9} className="py-8 text-center text-ink-2">Nothing matches these filters.</td></tr>}
        </Table>
      </Card>

      <Drawer open={!!cur} onClose={() => setOpenId(null)} title={cur ? `${cur.id} · ${cur.type}` : ''}>
        {cur && (
          <div className="space-y-5">
            <div className="flex gap-2"><Status s={cur.severity} /><Status s={cur.status} /></div>
            <p className="text-sm text-ink">{cur.detail}</p>
            <dl className="grid grid-cols-2 gap-4">
              <Field label="Check">{cur.check}</Field>
              <Field label="Owner">{userName(cur.owner)}</Field>
              {cur.payeeId && <Field label="Payee">{payeeName(cur.payeeId)}</Field>}
              {cur.clientId && <Field label="Client">{clientName(cur.clientId)}</Field>}
              {cur.sfRecord && <Field label="Salesforce record"><a className="inline-flex items-center gap-1 text-accent hover:underline" href="#" onClick={e => e.preventDefault()}><Mono>{cur.sfRecord}</Mono><ExternalLink size={12} /></a></Field>}
              <Field label="Raised">{cur.createdAt}</Field>
            </dl>
            <div>
              <h3 className="mb-2 text-xs font-semibold text-ink-2">Comments</h3>
              {cur.comments.length ? <ul className="space-y-2">{cur.comments.map((c, i) => <li key={i} className="rounded-lg bg-muted p-2.5 text-sm"><div className="mb-0.5 text-xs text-ink-3">{userName(c.by)} · {c.at}</div>{c.text}</li>)}</ul> : <p className="text-sm text-ink-3">No comments yet.</p>}
              {!can.readOnly && <form className="mt-2 flex gap-2" onSubmit={e => { e.preventDefault(); if (comment.trim()) { actions.commentException(cur.id, comment.trim()); setComment('') } }}>
                <input value={comment} onChange={e => setComment(e.target.value)} placeholder="Add a comment…" className="flex-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm outline-none focus:border-accent" />
                <Button type="submit" size="sm">Post</Button>
              </form>}
            </div>
            {cur.status !== 'Resolved' && (
              <div className="flex flex-wrap gap-2 border-t border-line pt-4">
                <Button variant="primary" disabled={!can.resolveException(cur)} title={!can.resolveException(cur) ? 'You are not the owner of this exception' : ''} onClick={() => ask(`Resolve ${cur.id}`, cur.severity === 'Warning' ? 'Comment (required for warnings)' : 'How was it resolved?', c => actions.resolveException(cur.id, c))}>Resolve</Button>
                {can.prepare && cur.owner !== 'u5' && <Button onClick={() => actions.routeException(cur.id)}>Route to Sales Ops (fix at source)</Button>}
                {can.prepare && <Select label="Assign" value={cur.owner} onChange={v => actions.assignException(cur.id, v)} options={USERS.map(u => ({ value: u.id, label: u.name }))} />}
              </div>
            )}
          </div>
        )}
      </Drawer>
    </>
  )
}
