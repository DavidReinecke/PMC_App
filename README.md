# Workforce Planner, canvas app (core)

First testable version of the Workforce Planner as a canvas app on Dataverse, until the code app is approved.

**Core scope:** Tables of Organization (with incumbent edit and the simple Detail marker), Vacancies and Hiring (stages, funding status, selection submit, entry on duty), Selection Approvals (Supervisor, Budget, then a final approver routed by grade), Role Assignments (area-only and all-areas data administrators). Roles: Supervisor, Budget, area fire chief, deputy chief, Assistant Chief Operations, Assistant Chief Support Services, PMC member, Data administrator.

**Not in this round:** PMC dashboard and requests to advertise, position requests, incumbent update requests, pay codes, labor estimate, email notifications, and the daily flow that fills a position on its entry-on-duty date. The tables and screens for these are in the mockup; they come in later rounds. Until the daily flow exists, a position fills immediately only when the entry-on-duty date is today or earlier.

None of this has been imported into a tenant. Expect to send me errors. Paste the exact message and I will fix the file.

## What is in the folder
| Path | What it is |
|---|---|
| `solution_source/` | Unpacked Dataverse solution: 8 tables, columns, choices, 14 lookups. Pack with the CLI. |
| `create_dataverse.py`, `schema.json` | Fallback: creates the same tables through the Web API if the solution import fails. |
| `seed_data.json` | Sample data from the mockup (24 positions, hiring actions, approval steps, details, role assignments). Loaded by the script. |
| `canvas/Src/*.pa.yaml` | Canvas app source: `App` plus four screens, as Power Apps YAML. |
| `canvas/BuildGuide.md` | The same app, control by control, for building by hand or fixing a paste that fails. |
| `docs/SECURITY.md` | Test-round security role and the business-unit model for real data. |

## Setup (GCC)
1. **Tables.** Easiest path first:
   - Install the Power Platform CLI, then `pac auth create --cloud UsGov --environment https://YOURORG.crm9.dynamics.com` (GCC High: `--cloud UsGovHigh`).
   - `pac solution pack --zipfile WorkforcePlanner.zip --folder solution_source --packagetype Unmanaged`
   - `pac solution import --path WorkforcePlanner.zip --publish-changes`
   - If pack or import fails, send me the error, or use the fallback: `pip install msal requests`, then `python create_dataverse.py --org https://YOURORG.crm9.dynamics.com --me you@yourorg.gov` (GCC High: add `--cloud gcchigh`). It creates the tables in a `WorkforcePlanner` solution and loads the sample data. If you imported the solution, run it with the same flags anyway to load the sample data (it skips tables that already exist).
2. **Make yourself an administrator.** The script's `--me` flag adds an all-areas data administrator for your sign-in. Otherwise add a row to Role Assignments by hand (Role = Data administrator, All areas = Yes, User email = your UPN).
3. **Security.** Give testers the role in `docs/SECURITY.md`.
4. **Canvas app.**
   - make.powerapps.com > Create > Blank app > Blank canvas app > Tablet (1366 x 768), in the same environment.
   - Add data sources: Geographic Areas, Units, Positions, Hiring Actions, Selection Approval Steps, Role Assignments, Details, Hiring Events.
   - Settings > General > Data row limit = 2000.
   - Open `canvas/Src/App.pa.yaml` and paste the `OnStart` formula into the App object, then each `scr*.pa.yaml` into a new screen with Studio's paste-code feature (copy the YAML, select the screen in the tree, Ctrl+V). If your Studio build does not take it, follow `canvas/BuildGuide.md` instead.
   - Run `OnStart` (App > ... > Run OnStart), then play the app.
5. **Test as each role.** Change `wfp_useremail` on a role assignment to your own address to try a role. A person is a Supervisor if their email is on a position (`wfp_incumbentemail`) that other positions report to.

## How final approval is routed
Set when the selection is submitted, from the proposed grade you type (for example `GS-12 Step 3`); if it cannot be read, the position's own pay plan and full performance grade are used.

| Proposed grade | Final approver (step 3) |
|---|---|
| GW below 10 | Assistant Chief, Operations |
| GS or WG below 10 | Assistant Chief, Support Services |
| Any scale at 10 or above | Area fire chief or deputy chief |

A return sends the hiring action back to Interviews and keeps the old steps; the next submission adds a new round.

## Known limits and likely first errors
- Not validated against a tenant: the solution XML and the YAML control versions are hand-built to the documented formats. Import and paste errors are expected; send them to me.
- Choice and lookup column names in formulas use the display names from `schema.json`. If a formula reports an unknown name, check the column's display name in the table.
- The role checks, the supervisor check and several filters are not delegable. They are fine for a pilot (hundreds of rows) and are the first thing to revisit before the full 10,000 employees.
- Area scoping in the app is a filter, not security; see `docs/SECURITY.md`.
- Sample email addresses are `first.last@example.gov`; change them to real sign-in addresses.
