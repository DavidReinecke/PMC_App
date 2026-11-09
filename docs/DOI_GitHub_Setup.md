# Moving the code app to your DOI GitHub and deploying it into your solution

What you end up with: a private repository in your DOI GitHub, and a workflow you run by hand (Actions tab) that builds the app, publishes it to your GCC environment, and adds it to your Workforce Planner solution. After that you export and move the solution like any other.

Claude cannot reach your DOI GitHub, so the code moves by zip and you commit it yourself.

## Before you start (one time)

1. **Your solution must already be imported** in the target environment. The workflow connects the code app to the 12 `wfp_` tables, so they have to exist. Import the Workforce Planner solution first (the zip from earlier).
2. **Code apps must be enabled** in that environment. In the Power Platform admin center: Environments, pick the environment, Settings, Product, Features, and turn on "Power Apps code apps". If you cannot see it, your tenant admin has to turn it on. This is the same approval you were waiting on.
3. **Find the solution's unique name.** In make.powerapps.com, open Solutions, select Workforce Planner, and look at the details panel (or the Properties pane). Copy the **Name** (unique name, usually no spaces, like `WorkforcePlanner`). Not the display name.
4. **Add one column the app expects** on the Positions table: `Vacant since`, logical name `wfp_vacantsince`, type Date Only. The other new columns (priority, Preparedness %, premium override, labor settings) are listed in `docs/CodeApp.md`. They are needed when the Dataverse connection is written, not for the first deployment.

## Fastest start: no service account and nothing installed on your computer

The workflow can sign in as you. When you run it, choose **device-code** (the default). The run pauses and prints a line in its log telling you to open https://microsoft.com/devicelogin and type a code. You do that in your normal browser, signed in as yourself, and the run continues. Steps 1 and the three `PP_` secrets in step 3 are then not needed. You still need the `PP_ENVIRONMENT_URL`, `PP_CLOUD` and `PP_SOLUTION_NAME` variables.

Your account needs rights to create and publish apps in the environment (Environment Maker) and read the `wfp_` tables. Some tenants block device-code sign-in with a conditional access policy. If the run fails at the sign-in step with a message about that, you need either the service account (step 1) or Option B.

## If sign-in is blocked ("You don't have access to this")

Some agencies use a Conditional Access policy that rejects sign-ins made through GitHub's computers. The device-code sign-in then ends with "Your sign-in was successful but does not meet the criteria to access this resource." Retrying does not help. You have two ways forward.

**Route 1: a service account.** Ask your admin for it (step 1 below). Policies that block people often do not apply to app registrations, but your admin has to confirm that.

**Route 2: build in GitHub, publish from your government computer.** Choose **build-only** when you run the workflow. It makes no sign-in. It builds the app and saves the finished files as a download named **code-app-build**.
1. Run the workflow with sign-in set to build-only. Open the finished run and download **code-app-build** (a zip).
2. On your government computer, install the Power Platform CLI. The VS Code "Power Platform Tools" extension does this without Node. Sign in from there, which uses your normal managed-device sign-in:
   ```
   pac auth create --cloud UsGov --environment <environment URL>
   ```
3. Get the repository's `codeapp` folder onto the computer (clone it, or download the repository zip). Unzip the code-app-build download into `codeapp/dist`.
4. In a terminal in the `codeapp` folder:
   ```
   pac code init --displayName "Workforce Planner" --buildPath dist
   pac code add-data-source -a dataverse -t wfp_geographicarea
   ```
   Repeat the second line for each table listed under Option B below. Then publish:
   ```
   pac code push --solutionName <unique name>
   ```
5. Commit `power.config.json` and `src/generated` to the repository, as in step 4 of the run instructions.

I have not tested Route 2 end to end. It uses only commands Microsoft documents, but `pac code push` may expect to find the Node tools. If it complains, send me the exact message.

## 1. Service account (ask your Power Platform admin)

Send this:

> I am deploying a Power Apps code app from GitHub Actions and need a service account for it.
> 1. Create an Entra app registration (single tenant) named "Workforce Planner deploy" and a client secret. Give me the Application (client) ID, the Directory (tenant) ID and the secret value.
> 2. In the Power Platform admin center, add that app as an application user in the environment that has the Workforce Planner solution. Give it a security role that can create and publish code apps and read the wfp_ tables. Environment Maker plus a role with access to the Workforce Planner tables is the usual start.
> 3. Confirm code apps are enabled for that environment. Give me the environment URL and the cloud it is in (GCC is UsGov).

The secret expires (often 6 or 12 months), so put a reminder on your calendar.

**If your agency does not allow service accounts or secrets:** skip the service-account steps and run the same commands yourself from a laptop (see "Option B").

## 2. Move the code into a DOI repository

1. In your DOI GitHub, create a new **private** repository, for example `workforce-planner`. Do not add a README.
2. On your computer, unzip `workforce-planner-codeapp.zip` into a new folder. You should see `codeapp`, `docs` and `.github` (the `.github` folder is hidden on some systems, so make sure it came along).
3. Open a terminal in that folder (or VS Code's terminal) and run:
   ```
   git init -b main
   git add .
   git commit -m "Workforce Planner code app"
   git remote add origin https://<your DOI GitHub host>/<org>/workforce-planner.git
   git push -u origin main
   ```
   Use the clone URL shown on the empty repository's page. Sign in when asked.
   If you would rather not use the command line: on the repository page choose "uploading an existing file", drag in the three folders, and commit. Check that `.github/workflows` shows two files afterward.
4. Open the repository's **Actions** tab. A "Check code app builds" run starts on its own. A green check means the app compiles in your environment. If Actions is disabled or no runs appear, ask your GitHub admin to allow Actions for the repository (and Windows hosted runners, or a self-hosted Windows runner).

## 3. Add the secrets and variables

Using device-code sign-in? Only add the three variables. The secrets are for the service account.

Repository, Settings, "Secrets and variables", Actions.

| Where | Name | Value |
| --- | --- | --- |
| Secrets | `PP_TENANT_ID` | Directory (tenant) ID |
| Secrets | `PP_CLIENT_ID` | Application (client) ID |
| Secrets | `PP_CLIENT_SECRET` | Client secret value |
| Variables | `PP_ENVIRONMENT_URL` | Environment URL, for example `https://yourorg.crm9.dynamics.com` |
| Variables | `PP_CLOUD` | `UsGov` (use `UsGovHigh` or `DoD` if that is your cloud) |
| Variables | `PP_SOLUTION_NAME` | The solution's unique name from "Before you start" |

## 4. Run the deployment

1. Actions, "Deploy Workforce Planner code app", Run workflow. Choose **device-code** (or **service-account** if you set that up). Open the run and watch its log while it works through the sign-in step.
2. The first run signs in, registers the app, adds the 12 tables as data sources, builds, and publishes the app into your solution. A few minutes.
3. When it finishes, download the **code-app-generated** artifact from the run page. It holds `power.config.json` and the `src/generated` folder.
4. Commit both back into the repository: `codeapp/power.config.json` and `codeapp/src/generated/`. **This matters.** Without `power.config.json`, every run creates a brand new copy of the app instead of updating this one.
5. Send me the `src/generated` files so I can write the Dataverse connection. Until then the app runs on sample data (the banner at the top says so).

## 5. Check that it landed in the solution

1. make.powerapps.com, pick the environment, Solutions, Workforce Planner.
2. You should see the code app listed as an app. If it is not there, use Add existing, App, Code app, and pick "Workforce Planner". Then run the workflow again so later runs keep it in the solution.
3. Open it from the Apps list to confirm it loads. Share it with users the way you share any app (Share on the app, or security roles).
4. Export the solution as usual. The code app moves with it. Code apps do not support Git source-code integration for solutions, so keep exporting solution zips the way you do now.

## Option B: deploy from your own computer instead of Actions

This also works as a fallback if the service account is not approved.

1. Install Node (LTS) and the Power Platform CLI (the VS Code "Power Platform Tools" extension installs it).
2. In a terminal:
   ```
   pac auth create --cloud UsGov --environment <environment URL>
   cd codeapp
   npm ci
   pac code init --displayName "Workforce Planner"
   pac code add-data-source -a dataverse -t wfp_geographicarea
   ```
   Repeat the last line for each table: `wfp_unit`, `wfp_position`, `wfp_hiringaction`, `wfp_selectionstep`, `wfp_roleassignment`, `wfp_detail`, `wfp_hiringevent`, `wfp_payrate`, `wfp_laborsetting`, `wfp_positionrequest`, `wfp_incumbentupdate`.
   ```
   npm run build
   pac code push --solutionName <unique name>
   ```
3. Commit `power.config.json` and `src/generated` as in step 4 above.

## When I change the app

I send a new zip. Copy its files over the repository folder, `git add . && git commit -m "Update" && git push`, then run the workflow again. I will say which files changed. Keep your committed `power.config.json` and `src/generated`. Do not let a new zip overwrite them (the zip does not contain them).

## Things I could not confirm

- A service account pushing a code app (`pac code push` with an application user) has not been tested, and Microsoft's pages do not document it. If the first run fails at "Publish to Power Apps", send me the error text. Option B is the fallback.
- Microsoft is replacing `pac code` with a newer npm-based CLI called `pa` (`pa app init`, `pa app push --solution-id <GUID>`), and says `pac code` will be deprecated in a future release. `pac code` still works today and is what this workflow uses. If your environment rejects it, tell me and I will switch the workflow to `pa`.
- Code apps in GCC: confirm with your admin that code apps are available in your GCC environment, since support can lag the commercial cloud.
