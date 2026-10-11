# Build the Excel import flow by hand

Result: one manual flow that reads the 7 tables in `WorkforcePlanner_Import_Sample.xlsx` (stored in your OneDrive) and creates or updates Dataverse rows. Build it in Power Automate, inside the Workforce Planner solution (Solutions > Workforce Planner > New > Automation > Cloud flow > Instant).

## Before you start
1. Upload `WorkforcePlanner_Import_Sample.xlsx` to OneDrive for Business.
2. Open it once in Excel Online so the tables are indexed. The 7 tables are tblAreas, tblUnits, tblPositions, tblHiringActions, tblApprovalSteps, tblDetails and tblRoles.
3. Choose the trigger "Manually trigger a flow". No inputs are needed. Pick the file in each Excel step.

## Order (do these in sequence, one block per table)
Areas, Units, Positions, Positions supervisor pass, Hiring Actions, Approval Steps, Details, Roles.

## The block you repeat for each table
1. **Excel Online (Business) > List rows present in a table.** Pick the file and the table. Under Advanced options set DateTime Format to ISO 8601.
2. **Dataverse > List rows**, table = the target table (for example Positions). Name this action `Existing_<table>`. Select columns: the primary name column.
3. **Apply to each** over the value from step 1. Open Settings and set Concurrency control to On with degree 1. Inside it:
   1. **Filter array** named `Self`. From = value of `Existing_<table>`. Condition: item()?['wfp_name'] is equal to the Excel Name column for this row.
   2. **Condition**: `length(body('Self'))` is equal to 0.
      - Yes: **Dataverse > Add a new row** with the fields below.
      - No: **Dataverse > Update a row**, Row ID = `first(body('Self'))?['wfp_<table>id']`, same fields.
4. After the loop, **Dataverse > List rows** named `After_<table>` so later tables can look up the new IDs.

## Fields by table (Excel column to Dataverse column)
| Table | Name | Other columns |
|---|---|---|
| Geographic Areas | Name | Code |
| Units | Name | Unit code, Geographic area (lookup) |
| Positions | Position ID | Title, Unit, Geographic area, Pay plan, Grade range, Full performance grade, Employment type, Position status, Incumbent, Incumbent email, Previous incumbent, Funding status |
| Hiring Actions | Action ID | Position, Geographic area, Stage, Selected candidate, Proposed grade and step, Entry on duty |
| Selection Approval Steps | Step | Hiring action, Geographic area, Sequence, Approver group, Decision, Decided by, Decided on, Comment, Approval round, Supervisor email, Position |
| Details | Detail ID | Home position, Detailed to, Geographic area, Entered by |
| Role Assignments | Person | User email, Role, Assignment status, Geographic area, All areas, Start date |

## Lookup columns
For each lookup, add a **Filter array** inside the loop before the Add/Update:
- From = value of `After_<parent table>` (for example `After_areas` for Geographic area).
- Condition: item()?['wfp_name'] equals the Excel column for that lookup (for example the Unit column).

In the Add or Update action, use the lookup column's field with this expression:
`if(empty(body('Look_x')), null, concat('/wfp_geographicareas(', first(body('Look_x'))?['wfp_geographicareaid'], ')'))`

The entity set names for the concat are wfp_geographicareas, wfp_units, wfp_positions, wfp_hiringactions, wfp_selectionsteps, wfp_details and wfp_roleassignments. In the designer the lookup field is the one that says "Geographic area (Value)". Choose "Enter custom value" and paste the expression above.

## Choice columns
Choice values must be numbers. Use nested `if` expressions. For Pay plan:
`if(equals(items('Apply_to_each')?['Pay plan'],'GS'),100000000,if(equals(items('Apply_to_each')?['Pay plan'],'GW'),100000001,100000002))`
The numbers go in the order the choices were created: first choice = 100000000, second = 100000001, and so on.
- Pay plan: GS, GW, WG
- Employment type: Full time, Career seasonal, Seasonal
- Position status: Filled, Vacant
- Funding status: Approved, Pending, Not approved
- Stage: Draft, PMC review, Cleared to advertise, Announced, Certificate issued, Interviews, Selection approval, Selection approved, Offer
- Approver group: Supervisor, Budget, Assistant Chief Operations, Assistant Chief Support Services, Area chief or deputy
- Decision: Waiting, Pending, Approved, Returned
- Role: Budget, Area fire chief, Deputy chief, Assistant Chief Operations, Assistant Chief Support Services, PMC member, Data administrator
- Assignment status: Active, Ended

## Other value types
- Number columns: `if(empty(string(x)), null, int(x))`
- Date columns: `if(empty(string(x)), null, formatDateTime(x, 'yyyy-MM-dd'))`
- All areas (yes/no): `or(equals(toLower(string(x)),'true'), equals(toLower(string(x)),'yes'))`

## Supervisor pass (after Positions)
Add a second Apply to each over the same Excel rows, with concurrency 1. Inside:
1. Filter array `SelfRow` over `After_positions`, name equals the Position ID.
2. Filter array `SupRow` over `After_positions`, name equals the Supervisor position column.
3. Condition: both have length greater than 0. If yes, **Update a row** on `first(body('SelfRow'))?['wfp_positionid']`, setting the Supervisor position lookup to `concat('/wfp_positions(', first(body('SupRow'))?['wfp_positionid'], ')')`.

## Tip
Build and test the first two blocks (Areas, Units) and run them once before adding the rest.
