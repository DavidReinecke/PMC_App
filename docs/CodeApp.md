# Workforce Planner code app

The code app is a React and TypeScript project in `codeapp/`. It replaces the canvas app once code apps are enabled in your GCC environment. It reads and writes the same Dataverse tables as the canvas app, so nothing in the solution changes.

## What exists now

| Area | State |
| --- | --- |
| Org Chart (pyramid layout, click for direct reports, pan and zoom, collapse and expand) | Built |
| Tables of Organization (search, unit and status filters, position panel, fill, change or vacate an incumbent) | Built |
| Role-based access (same rules as the canvas app) | Built |
| Vacancies & Hiring, Selection Approvals, Labor Estimate, PMC Requests, Incumbents, Role Assignments | Placeholder tabs, next in line |
| Dataverse connection | Not connected yet. The app runs on sample data (see below) |

## Run it on your computer

You need Node 20 or later.

```
cd codeapp
npm install
npm run dev
```

Open http://localhost:3000. A banner says "Sample data". The "Preview as" menu switches between a data administrator, an area fire chief, a PMC member, a supervisor and an employee so you can see what each role gets. Changes are held in memory and disappear when you reload.

## Connect it to your environment

1. Install the Power Platform CLI and sign in to the GCC environment that has the Workforce Planner solution:
   ```
   pac auth create --cloud UsGov
   pac env select --environment <environment URL or ID>
   ```
   Use `UsGovHigh` or `DoD` if that is your cloud.
2. From `codeapp/`, register the app:
   ```
   pac code init --displayName "Workforce Planner"
   ```
   This creates `power.config.json`. Commit it.
3. Add each table as a data source (one command per table):
   ```
   pac code add-data-source -a dataverse -t wfp_geographicarea
   pac code add-data-source -a dataverse -t wfp_unit
   pac code add-data-source -a dataverse -t wfp_position
   pac code add-data-source -a dataverse -t wfp_hiringaction
   pac code add-data-source -a dataverse -t wfp_selectionstep
   pac code add-data-source -a dataverse -t wfp_roleassignment
   pac code add-data-source -a dataverse -t wfp_detail
   pac code add-data-source -a dataverse -t wfp_hiringevent
   pac code add-data-source -a dataverse -t wfp_payrate
   pac code add-data-source -a dataverse -t wfp_laborsetting
   pac code add-data-source -a dataverse -t wfp_positionrequest
   pac code add-data-source -a dataverse -t wfp_incumbentupdate
   ```
   This writes typed services into `codeapp/src/generated/`. Commit that folder and tell Claude. The Dataverse provider in `src/data/` is written against those generated files, so it is the next piece to build.
4. Deploy:
   ```
   npm run build
   pac code push
   ```

## One new column

The "days vacant" badge needs a date column on Positions. Add a Date Only column named **Vacant since** (logical name `wfp_vacantsince`). The app sets it when a position becomes vacant and clears it when the position is filled.

## How the code is organised

- `src/data/provider.ts` is the one interface the screens use for data. `sampleProvider.ts` implements it with in-memory data. A `dataverseProvider.ts` will implement the same interface.
- `src/data/access.ts` holds the role rules.
- `src/components/orgLayout.ts` is the org chart layout. A supervisor with more than six direct reports gets two columns with a line between them. Change `SPLIT` to move that cutoff.
