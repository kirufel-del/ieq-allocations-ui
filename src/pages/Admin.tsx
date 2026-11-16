import { useState } from 'react'
import { useApp, type Settings } from '../state/AppContext'
import { INTEGRATIONS, TEMPLATES, USERS } from '../data/mock'
import { Badge, Button, Card, Mono, PageHeader, Status, Table, Tabs } from '../components/ui'

type Tab = 'health' | 'settings' | 'calendar' | 'templates' | 'access'

export default function Admin() {
  const [tab, setTab] = useState<Tab>('health')
  return (
    <>
      <PageHeader title="Administration" subtitle="Configuration, templates, period calendar, integrations and access control." req="ADM-1 · ADM-2 · ADM-3 · AUD-4" />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'health', label: 'Integration health' }, { id: 'settings', label: 'Thresholds & windows' }, { id: 'calendar', label: 'Period calendar' }, { id: 'templates', label: 'Templates & formats' }, { id: 'access', label: 'Users & roles' }]} />
      {tab === 'health' && <Health />}
      {tab === 'settings' && <SettingsForm />}
      {tab === 'calendar' && <Calendar />}
      {tab === 'templates' && <Templates />}
      {tab === 'access' && <Access />}
    </>
  )
}

function Health() {
  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[['Salesforce API usage', '18%', 'of daily limit'], ['Last snapshot', '41 s', 'SNP-2027Q3-2 (partial)'], ['Failed deliveries', '0', 'last 30 days'], ['Queue depth', '0', '4 workers idle']].map(([l, v, s]) => (
          <div key={l} className="rounded-xl border border-line bg-surface p-4"><div className="text-xs text-ink-2">{l}</div><div className="mt-1 text-2xl font-semibold text-ink">{v}</div><div className="text-xs text-ink-3">{s}</div></div>
        ))}
      </div>
      <Card pad={false}>
        <Table head={['Integration', 'Status', 'Last activity', 'Detail']}>
          {INTEGRATIONS.map(i => <tr key={i.name}><td className="font-medium">{i.name}</td><td><Status s={i.status} /></td><td className="font-mono text-xs">{i.lastSync}</td><td className="text-ink-2">{i.metric}</td></tr>)}
        </Table>
      </Card>
    </>
  )
}

function SettingsForm() {
  const { db, actions } = useApp()
  const [s, setS] = useState<Settings>(db.settings)
  const num = (k: keyof Settings, label: string, suffix: string) => (
    <label className="text-sm"><span className="text-xs text-ink-2">{label}</span>
      <div className="mt-1 flex items-center gap-2"><input type="number" value={s[k] as number} onChange={e => setS({ ...s, [k]: +e.target.value })} className="w-32 rounded-lg border border-line bg-surface px-3 py-2 outline-none focus:border-accent" /><span className="text-xs text-ink-3">{suffix}</span></div></label>
  )
  const bool = (k: keyof Settings, label: string) => (
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={s[k] as boolean} onChange={e => setS({ ...s, [k]: e.target.checked })} /> {label}</label>
  )
  return (
    <Card title="Thresholds, tolerances and review windows">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {num('variancePct', 'Variance flag: % vs prior quarter', '%')}
        {num('varianceAbs', 'Variance flag: absolute', 'USD')}
        {num('glTolerance', 'GL accrual match tolerance', 'USD')}
        {num('reviewWindowDays', 'Payee review window', 'business days')}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {bool('deemedAcceptance', 'Deemed acceptance after review window')}
        {bool('folderFallback', 'SharePoint folder delivery fallback')}
        {bool('closeFreeze', 'Change freeze during close window')}
      </div>
      <div className="mt-5 flex justify-end"><Button variant="primary" onClick={() => actions.updateSettings(s)}>Save settings</Button></div>
    </Card>
  )
}

function Calendar() {
  const rows = [
    ['Q3 2027', '2027-09-30', '2027-10-02', '2027-10-11', '2027-10-18', '2027-10-29', 'In progress'],
    ['Q4 2027', '2027-12-31', '2028-01-04', '2028-01-12', '2028-01-19', '2028-01-28', 'Scheduled'],
    ['Q1 2028', '2028-03-31', '2028-04-03', '2028-04-11', '2028-04-18', '2028-04-28', 'Scheduled'],
  ]
  return (
    <Card pad={false}>
      <Table head={['Period', 'Quarter end', 'Snapshot', 'Publish target', 'Review window ends', 'Payroll date', 'Status']}>
        {rows.map(r => <tr key={r[0]}>{r.slice(0, 6).map((c, i) => <td key={i} className={i ? 'font-mono text-xs' : 'font-medium'}>{c}</td>)}<td><Badge tone={r[6] === 'In progress' ? 'warn' : 'neutral'}>{r[6]}</Badge></td></tr>)}
      </Table>
    </Card>
  )
}

function Templates() {
  const { db } = useApp()
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Schedule templates (per population, versioned & approved)">
        <Table head={['Template', 'Population', 'Version', 'Status']} dense>
          {[['Advisor schedule', 'Advisor', 'v4'], ['Referrer schedule', 'Referrer', 'v3'], ['Partner statement', 'Partner', 'v2'], ['Non-advisor statement', 'Non-advisor', 'v2']].map(r => <tr key={r[0]}><td>{r[0]}</td><td>{r[1]}</td><td><Mono>{r[2]}</Mono></td><td><Status s="Approved" /></td></tr>)}
        </Table>
      </Card>
      <Card title="Archetype templates for new payees (REG-6)">
        <Table head={['Template', 'Archetype', 'Parameters']} dense>
          {TEMPLATES.map(t => <tr key={t.id}><td>{t.name}</td><td><Mono>{t.archetype}</Mono></td><td className="text-xs text-ink-2">{t.params.join(', ')}</td></tr>)}
        </Table>
      </Card>
      <Card title="Payroll format mapping">
        <p className="mb-3 text-sm text-ink">{db.settings.payrollFormat}</p>
        <Table head={['Platform field', 'Vendor column']} dense>
          {[['Payee Salesforce ID → employee ID', 'Co Code + File #'], ['Approved total', 'Earnings 3 Amount'], ['Earnings code', 'PSH (profit share)'], ['Period', 'Pay period end']].map(r => <tr key={r[0]}><td>{r[0]}</td><td><Mono>{r[1]}</Mono></td></tr>)}
        </Table>
      </Card>
      <Card title="Notification templates">
        <ul className="space-y-1.5 text-sm text-ink-2">
          {['Schedule ready (individual, secure link)', 'Reminder: acknowledge within window', 'Reissue: new version with change summary', 'Question answered', 'Approval requested (reviewer / rules approver)'].map(t => <li key={t}>✉ {t}</li>)}
        </ul>
      </Card>
    </div>
  )
}

function Access() {
  return (
    <Card pad={false}>
      <Table head={['User', 'Role', 'IdP group', 'MFA', 'Can approve']}>
        {USERS.map(u => <tr key={u.id}><td className="font-medium">{u.name}</td><td>{u.title}</td><td><Mono>ieq-alloc-{u.role}</Mono></td><td><Status s="Pass" /></td><td>{['reviewer', 'rules'].includes(u.role) ? 'Yes — not own work' : '—'}</td></tr>)}
        <tr><td className="font-medium">70 payees</td><td>Payee (own data only)</td><td><Mono>ieq-alloc-payees</Mono></td><td><Status s="Pass" /></td><td>—</td></tr>
      </Table>
    </Card>
  )
}
