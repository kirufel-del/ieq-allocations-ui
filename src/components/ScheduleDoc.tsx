import { LINES, clientName, payeeById, payeeTotal, periodLabel } from '../data/mock'
import type { ScheduleVersion } from '../data/types'
import { money } from './ui'

/** Schedule lines for any period. Q3 2027 uses live run lines; earlier periods are scaled from the same client book (mock). */
export function scheduleLines(s: { payeeId: string; period: string; total: number }) {
  const cur = LINES.filter(l => l.payeeId === s.payeeId)
  const curTotal = payeeTotal(s.payeeId)
  if (s.period === '2027-Q3') return cur
  const f = curTotal ? s.total / curTotal : 0
  const scaled = cur.filter(l => l.archetype !== 'E').map(l => ({ ...l, amount: Math.round(l.amount * f * 100) / 100, basisAmount: Math.round(l.basisAmount * f * 100) / 100, piece: 'Full quarter' }))
  const diff = Math.round((s.total - scaled.reduce((a, l) => a + l.amount, 0)) * 100) / 100
  if (scaled.length && diff) scaled[0] = { ...scaled[0], amount: Math.round((scaled[0].amount + diff) * 100) / 100 }
  if (!scaled.length) return [{ ...cur[0], amount: s.total, basisAmount: s.total, piece: 'Full quarter' }]
  return scaled
}

export default function ScheduleDoc({ s, onAskLine }: { s: ScheduleVersion; onAskLine?: (lineRef: string) => void }) {
  const p = payeeById(s.payeeId)!
  const lines = scheduleLines(s)
  return (
    <div className="rounded-lg border border-line bg-white p-6 text-[13px] text-neutral-900 shadow-sm">
      <div className="mb-4 flex items-start justify-between border-b border-neutral-300 pb-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">IEQ · Profit-share schedule</div>
          <div className="mt-1 text-lg font-semibold">{p.name}</div>
          <div className="text-neutral-600">{p.population} · {p.repCodes.join(', ') || '—'} · paid via {p.channel}</div>
        </div>
        <div className="text-right text-xs text-neutral-600">
          <div className="text-base font-semibold text-neutral-900">{periodLabel(s.period)}</div>
          <div>Version {s.version}{s.supersededBy ? ' · SUPERSEDED' : ''}{s.legacy ? ' · IMPORTED' : ''}</div>
          <div>Issued {s.publishedAt}</div>
        </div>
      </div>
      {s.changeSummary && <div className="mb-3 rounded bg-amber-50 px-3 py-2 text-xs text-amber-900"><b>Changes from v{s.version - 1}:</b> {s.changeSummary}</div>}
      <table className="w-full">
        <thead><tr className="border-b border-neutral-300 text-left text-[11px] uppercase text-neutral-500"><th className="py-1.5">Client / basis</th><th>Period piece</th><th className="text-right">Basis</th><th className="text-right">Rate</th><th className="text-right">Amount</th>{onAskLine && <th />}</tr></thead>
        <tbody>
          {lines.map(l => (
            <tr key={l.id} className="border-b border-neutral-100">
              <td className="py-1.5 pr-2">{l.clientId ? clientName(l.clientId) : l.basis}</td>
              <td className="whitespace-nowrap text-neutral-600">{l.piece}</td>
              <td className="pl-3 text-right tabular-nums">{money(l.basisAmount)}</td>
              <td className="pl-3 text-right tabular-nums">{l.rate}%</td>
              <td className="pl-3 text-right font-medium tabular-nums">{money(l.amount)}</td>
              {onAskLine && <td className="pl-2 text-right"><button className="text-[11px] text-blue-700 hover:underline" onClick={() => onAskLine(l.clientId ? clientName(l.clientId) : l.basis)}>Ask</button></td>}
            </tr>
          ))}
        </tbody>
        <tfoot><tr className="font-semibold"><td colSpan={4} className="pt-2 text-right">Total</td><td className="pt-2 text-right tabular-nums">{money(s.total)}</td>{onAskLine && <td />}</tr></tfoot>
      </table>
      <div className="mt-4 border-t border-neutral-200 pt-2 font-mono text-[10px] text-neutral-500">{s.id} · {s.checksum} · values only · generated from run {s.runId}</div>
    </div>
  )
}
