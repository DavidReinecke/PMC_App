# Security notes

The canvas app filters every screen by geographic area and hides actions by role, but that is **convenience, not security**: a user with Dataverse access can still read or change any row their security role allows. Treat the app-level checks as the first layer only.

## For the first round of testing
Create one security role, **WFP Tester**, with **Organization** depth Read/Create/Write/Append/Append To on all eight `wfp_` tables, and assign it only to the people testing. Everyone you give it sees every area, so use test data.

## Before real data: area scoping with business units
1. Create one **business unit per geographic area** under the root (Northern Rockies, Great Basin, ...). Put each person in their area's business unit.
2. Create these roles in the solution:
   - **WFP Area User**: Read, Append, Append To at **Business Unit** depth on all tables; Create/Write at Business Unit depth on Position, Hiring Action, Selection Approval Step, Detail. Create (only) on Hiring Event, no Write or Delete, so the record stays append-only.
   - **WFP Area Data Admin**: everything in Area User, plus Create/Write/Delete on Role Assignment at Business Unit depth.
   - **WFP All-Areas Data Admin**: same as Data Admin at **Organization** depth.
   - **WFP Chief (read all areas)**: Read at **Organization** depth on all tables; Write on Position and Detail (incumbents and details); Write on Selection Approval Step and Hiring Action (final approvals).
   - Everyone: Read at Organization depth on **Geographic Area** and **Role Assignment** (the app reads a person's own assignments at start-up), and Read on Unit.
3. Rows are owned by whoever creates them, so area scoping only works if the owner is in the right business unit. Either have area users create the rows, or assign each area's rows to an **owner team** in that business unit (a small flow on create does this).
4. Keep the app-level role checks as they are. Roles in `wfp_roleassignment` decide what the app shows; business units decide what Dataverse returns.

## What the data administrator roles mean here
- **Data administrator (own area)** and **(all areas)** are rows in `wfp_roleassignment` (all areas = `wfp_allareas` yes). The first all-areas administrator is created by whoever sets up the environment: run `create_dataverse.py --me you@yourorg.gov`, or add the row in the maker portal.
- Approving a selection never needs a Dataverse privilege beyond Write on the step; who may approve is checked in the app (`wfp_approvergroup` against the user's active role and area).
