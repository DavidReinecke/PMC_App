# Workforce Planner code app

The code app is a React and TypeScript project in `codeapp/`. It replaces the canvas app once code apps are enabled in your GCC environment. It reads and writes the same Dataverse tables as the canvas app, so nothing in the solution changes.

## What exists now

| Area | State |
| --- | --- |
| Org Chart (pyramid layout, click for direct reports, pan and zoom, collapse and expand) | Built |
| Tables of Organization (search, unit and status filters, position panel, fill, change or vacate an incumbent) | Built |
| Role-based access (same rules as the canvas app) | Built |
| PMC Requests (dashboard, submit, edit and resubmit, withdraw, clear, return) | Built, on sample data |
| Incumbents (request fill, change or vacate; apply or reject) | Built, on sample data |
| Vacancies & Hiring (stage, funding, route selection, entry on duty, detail marker) | Built, on sample data |
| Selection Approvals (3-step routing, approve or return with comment, earlier rounds) | Built, on sample data |
| Labor Estimate (step 5 pay plus area premium, by unit and position) | Built, on sample data |
| Role Assignments (assign, end, search) | Built, on sample data |
| Dataverse connection | Built. When hosted in Power Apps and `src/generated` is present, the app reads and writes Dataverse and shows a Test version banner. On a laptop it still runs on sample data |

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

- `src/data/provider.ts` is the one interface the screens use for data. `sampleProvider.ts` implements it with in-memory data. `dataverseProvider.ts` implements the same interface against the generated services, which it loads on demand.
- `src/data/access.ts` holds the role rules.
- `src/components/orgLayout.ts` is the org chart layout. A supervisor with more than six direct reports gets two columns with a line between them. Change `SPLIT` to move that cutoff.


## How the code is split

- `src/data/provider.ts` is the list of plain create, read and update operations. `sampleProvider.ts` implements it in memory. `dataverseProvider.ts` implements the same interface on Dataverse.
- `src/data/services.ts` holds every business rule (what Clear, Approve, Return, Apply and entry on duty do, final approver by grade, labor math). It only uses the provider interface, so rules behave the same on sample data and Dataverse.
- `src/screens/` has one file per tab. `src/ui/kit.tsx` has the shared form, modal and loading helpers.

Choices made without a canvas equivalent, worth reviewing: clearing an "Add position" request creates a vacant position with Pending funding and no supervisor; approving or returning a selection is limited to the step's group (or a data administrator); entry on duty now asks for the candidate's sign-in email so the person can see their position.

## Test version notes

- The first person to open the app before any Role Assignment rows exist acts as a setup administrator and should add themselves (Data administrator, all areas) on the Role Assignments tab. After one active row exists, access follows the roles.
- Dataverse security still decides who can read and write each table. Give testers a security role with Create, Read and Write on the `wfp_` tables (Hiring Event: Create and Read only).
- There is no series column in Dataverse, so the Series line is hidden in the position panel.
- Grade is stored in Full performance grade (`wfp_topgrade`). The Grade range text column is filled with, for example, GS-12 when a position is created from a request.
- Publish loop from `codeapp`: `npm.cmd run build`, then `pa.cmd app push --solution-id <GUID>`.
