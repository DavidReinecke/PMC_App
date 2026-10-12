# Pay Rates and Labor Settings: setup and yearly update

## Part 1. One-time setup (do these in order)

1. **Import the Pay Tables solution.** Power Apps > Solutions > Import solution > `WorkforcePlanner_PayTables.zip`. It adds two tables, Pay Rates and Labor Settings. It does not touch your other tables or the app. Choose Publish all customizations afterward.
2. **Load the pay rates.**
   - Upload `WorkforcePlanner_PayRates_2026.xlsx` to OneDrive for Business and open it once in Excel Online so the table `tblPayRates` is indexed.
   - In the Pay Rates table, choose Edit with Excel, or build the flow below once. The workbook holds 315 rows: GS and GW grades 1 to 15, steps 1 to 10, plus WG placeholder rows at step 5.
3. **Import the app.** Import `WorkforcePlanner_full.zip` (version 1.0.0.13 or later) over the existing solution.
4. **Add the two tables as data sources in the app.** Open the app for editing. In the Data panel choose Add data > Dataverse > pick **Pay Rates** and **Labor Settings** (the `wfp_` ones, not any `mt_` table). The names must show exactly as `Pay Rates` and `Labor Settings`. Formula errors on the Labor Estimate screen clear once both are added.
5. **Save and publish.**

## Part 2. The Pay Rates flow (loads a workbook into the table)

Use a manual flow in the Workforce Planner solution. It follows the same pattern as the Positions flow.

1. Trigger: Manually trigger a flow.
2. **List rows present in a table** (Excel Online Business). File: the pay rates workbook. Table: `tblPayRates`. Pagination On, threshold 1000. Rename it `Excel_PayRates`.
3. **List rows** (Dataverse), table = **Pay Rates**, Select columns `wfp_name`, Row count 5000. Rename it `Existing_PayRates`.
4. **Apply to each** over `value` from `Excel_PayRates`. Settings: Concurrency control On, degree 1. Rename it `Each_Rate`. Inside it:
   - **Filter array** `Self`: From `value` of `Existing_PayRates`, condition `@equals(item()?['wfp_name'], items('Each_Rate')?['Rate key'])`.
   - **Condition**: `@equals(length(body('Self')), 0)`.
   - Yes branch: **Add a new row**. No branch: **Update a row** with Row ID `@first(body('Self'))?['wfp_payrateid']`.

Fields for both actions:

| Field | Value |
|---|---|
| Rate key | `@items('Each_Rate')?['Rate key']` |
| Pay plan | `@if(equals(items('Each_Rate')?['Pay plan'],'GS'),100000000,if(equals(items('Each_Rate')?['Pay plan'],'GW'),100000001,100000002))` |
| Grade | `@int(items('Each_Rate')?['Grade'])` |
| Step | `@int(items('Each_Rate')?['Step'])` |
| Annual rate | `@int(items('Each_Rate')?['Annual rate'])` |
| Effective year | `@int(items('Each_Rate')?['Effective year'])` |
| Wage area | `@items('Each_Rate')?['Wage area']` |

Pick the `wfp_` Pay Rates table in each Dataverse action. A 315-row run takes a few minutes with concurrency 1.

## Part 3. Every January

1. Download the new GS and GW tables, and the WG table for your wage area.
2. Copy the workbook, change **Effective year** to the new year, change the **Rate key** suffix to match (for example `GS-12-5-2027`), and update **Annual rate**.
3. Run the flow. Old years stay in the table. The Labor Estimate screen uses the latest year that has started (Effective year is this year or earlier), so rates switch over automatically on January 1.
4. If an error is found later, fix the row in the Pay Rates table.

## Replacing the WG placeholders

Delete the 15 rows where Wage area is PLACEHOLDER. Add real WG rows for your wage area with Wage area set to its name (anything except PLACEHOLDER). Step 5 is the only step the app reads today. Once the placeholders are gone, the asterisk and the note on the Labor Estimate screen disappear.

## Premium percent

The + and - buttons on the Labor Estimate screen (Budget and data administrators only) save to Labor Settings, one row per geographic area, created the first time someone changes the value. The default is 32 until then.
