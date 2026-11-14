import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { useApp } from '../state/AppContext'
import { payeeById, payeeName, periodLabel } from '../data/mock'
import { Badge, Button, Card, Drawer, Field, Kpi, Mono, money, Note, Num, PageHeader, SearchInput, Select, Status, Table } from '../components/ui'
import ScheduleDoc from '../components/ScheduleDoc'

export default function Schedules() {
  const { db, can, actions, currentRun } = useApp()
  const periods = [...new Set(db.schedules.map(s => s.period))].sort().reverse()
  const [period, setPeriod] = useState(periods[0])
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const per = periods.includes(period) ? period : periods[0]

  const list = useMemo(() => db.schedules.filter(s => s.period === per)
    .filter(s => !q || payeeName(s.payeeId).toLowerCase().includes(q.toLowerCase()))
    .filter(s => filter === 'all' || (filter === 'pending' ? !s.ack && !s.supersededBy : filter === 'reissued' ? s.version > 1 || s.supersededBy : s.ownerCheck === 'Mismatch')), [db.schedules, per, q, filter])
  const live = db.schedules.filter(s => s.period === per && !s.supersededBy)
  const acked = live.filter(s => s.ack?.kind === 'Acknowledged').length
  const deemed = live.filter(s => s.ack?.kind === 'Deemed accepted').length
  const cur = db.schedules.find(s => s.id === openId)
  const versions = cur ? db.schedules.filter(s => s.period === cur.period && s.payeeId === cur.payeeId).sort((a, b) => b.version - a.version) : []

  return (
    <>
      <PageHeader title="Schedules" subtitle="Rendered from run data (PDF + values-only Excel). Reissues create a new version; earlier versions stay viewable, marked superseded." req="GEN-1 … GEN-7 · DIST-1 … DIST-3"
        actions={<>
          <Select value={per} onChange={setPeriod} options={periods.map(p => ({ value: p, label: periodLabel(p) }))} />
          {per === currentRun.period && <Button disabled={!can.prepare} onClick={() => actions.simulateAcks(per)}>Simulate payee acknowledgments</Button>}
        </>} />
      {per !== currentRun.period && currentRun.state !== 'Published' && currentRun.state !== 'Paid' && currentRun.state !== 'Closed' &&
        <div className="mb-4"><Note>Q3 2027 schedules are generated when the run is approved and published. Showing {periodLabel(per)}.</Note></div>}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Schedules (current versions)" value={live.length} sub={`${db.schedules.filter(s => s.period === per && s.version > 1).length} reissued as v2`} />
        <Kpi label="Acknowledged" value={`${live.length ? Math.round(acked / live.length * 100) : 0}%`} sub={`${acked} payees`} tone="good" />
        <Kpi label="Deemed accepted" value={deemed} sub={`after ${db.settings.reviewWindowDays} business days`} />
        <Kpi label="Folder-owner mismatches" value={live.filter(s => s.ownerCheck === 'Mismatch').length} sub={live.some(s => s.ownerCheck === 'Mismatch') ? 'Folder delivery refused; portal only' : 'Payee ID matches folder owner'} tone={live.some(s => s.ownerCheck === 'Mismatch') ? 'bad' : 'good'} />
      </div>
      <div className="mb-4 flex flex-wrap gap-3">
        <SearchInput value={q} onChange={setQ} placeholder="Find payee…" />
        <Select label="Show" value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All' }, { value: 'pending', label: 'Awaiting acknowledgment' }, { value: 'reissued', label: 'Reissued' }, { value: 'mismatch', label: 'Owner mismatch' }]} />
      </div>
      <Card pad={false}>
        <Table head={['Payee', 'Version', 'Total', 'Published', 'Delivery', 'Owner check', 'Acknowledgment', 'Checksum']}>
          {list.map(s => (
            <tr key={s.id} className="cursor-pointer" onClick={() => setOpenId(s.id)}>
              <td className="font-medium">{payeeName(s.payeeId)}</td>
              <td>v{s.version} {s.supersededBy && <Status s="Superseded" />}</td>
              <Num>{money(s.total)}</Num>
              <td className="whitespace-nowrap text-ink-2">{s.publishedAt}</td>
              <td className="text-ink-2">{s.delivery}</td>
              <td><Status s={s.ownerCheck} /></td>
              <td>{s.supersededBy ? '—' : s.ack ? <Status s={s.ack.kind} /> : <Status s="Awaiting" />}</td>
              <td><Mono>{s.checksum.slice(0, 18)}…</Mono></td>
            </tr>
          ))}
        </Table>
      </Card>

      <Drawer wide open={!!cur} onClose={() => setOpenId(null)} title={cur ? `${payeeName(cur.payeeId)} · ${periodLabel(cur.period)}` : ''}>
        {cur && <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {versions.map(v => <button key={v.id} onClick={() => setOpenId(v.id)} className={`rounded-lg border px-3 py-1.5 text-xs ${v.id === cur.id ? 'border-accent bg-accent-bg text-accent' : 'border-line text-ink-2'}`}>v{v.version} {v.supersededBy ? '(superseded)' : '(current)'}</button>)}
            <span className="flex-1" />
            <Button size="sm"><Download size={13} /> PDF</Button>
            <Button size="sm"><Download size={13} /> Excel (values only)</Button>
          </div>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="Delivery">{cur.delivery}</Field>
            <Field label="Folder owner check">{cur.ownerCheck === 'Pass' ? 'Payee ID = folder owner' : <span className="text-bad">Mismatch — refused & alerted</span>}</Field>
            <Field label="Acknowledgment">{cur.ack ? `${cur.ack.kind} · ${cur.ack.at}` : 'Awaiting'}</Field>
            <Field label="Payee email">{payeeById(cur.payeeId)?.email}</Field>
          </dl>
          {cur.ownerCheck === 'Mismatch' && <Note tone="bad">SharePoint folder owner does not match payee ID. Folder delivery was refused (DIST-1); the schedule is available in the portal only. Admin has been alerted.</Note>}
          <ScheduleDoc s={cur} />
          {db.questions.filter(q2 => q2.scheduleId === cur.id).length > 0 && <Badge tone="warn">This version has payee questions — see Payee questions</Badge>}
        </div>}
      </Drawer>
    </>
  )
}
