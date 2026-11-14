# IEQ Allocations — mock web UI

Clickable prototype of the IEQ Allocations Platform described in
`../IEQ Product v2 - 1 Requirements & Design.md`. Front-end only: all data is
deterministic mock data generated in `src/data/mock.ts` and held in memory
(refresh the page to reset).

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build into dist/
npm run deploy     # build and publish to GitHub Pages (gh-pages branch)
```

Live site: https://kirufel-del.github.io/ieq-allocations-ui/

## Demo script (the Q3 2027 close)

The simulated date is 7 Oct 2027. The Q3 2027 run is **Calculated** with 4 blocking exceptions.

1. **Maya Chen (preparer)** → Exception queue → resolve EX-3001…3004 (or route to Sales Ops).
2. Runs → RUN-2027Q3-01 → **Submit for review**. *Approve* is disabled for Maya (segregation of duties).
3. Switch "Viewing as" to **Daniel Okafor (controller)** → **Approve run**.
4. Back to Maya → **Generate & publish schedules** → Payroll hand-off → **Generate payroll & AP files**.
5. **Lena Ford (payroll)** → **Sign tie-out**, then Runs → **Confirm paid**. Daniel can then close the period.
6. **Payee portal** (impersonate any payee) → view the schedule, **Acknowledge**, or click **Ask** on a line.
7. **Priya Raman / Jordan Alvarez** → Rules register → Changes: approve or reject; you cannot approve your own change.
8. **Rosa Singh (auditor)** → read-only audit log, maker/checker approvals, evidence export.
9. **Sam Ito (admin)** → integration health, thresholds, calendar, templates, users and roles.

Every action appends an entry to the audit log.

## Screens → requirements

| Screen | Requirements |
|---|---|
| Close dashboard | WF-6 |
| Runs / run detail (state machine, shadow compare) | WF-1, WF-2, CALC-1, CALC-8 |
| Snapshots | ING-1 … ING-7 |
| Exception queue | WF-3, VAL-6, ING-4 |
| Allocations + lineage drawer | CALC-2 … CALC-4, ING-5 |
| Reconciliation | VAL-1 … VAL-7 |
| Adjustments | CALC-5, WF-4 |
| Schedules | GEN-1 … GEN-7, DIST-1 … DIST-3 |
| Payee questions | DIST-5 |
| Payroll hand-off | PAY-1, PAY-2, PAY-4 |
| Rules register | REG-1 … REG-9 |
| Payee portal | DIST-4, DIST-7 |
| Audit & evidence | AUD-1 … AUD-3 |
| Administration | ADM-1 … ADM-3 |
| Migration | MIG-1 … MIG-7 |

Stack: Vite, React 18, TypeScript, Tailwind CSS v4, Recharts, lucide-react, React Router (hash routing, so `dist/` can be hosted as static files).
