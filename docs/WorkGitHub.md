# Deploying the code app from your work GitHub

Claude cannot reach your work GitHub account, so the project travels as a zip. You put it in a work repository, a workflow there builds the app and publishes it to your environment, and when something changes you copy the new files over.

## 1. Ask your Power Platform admin for a service account

Send them this:

> I am deploying a Power Apps code app from GitHub Actions and need a service account for it.
> 1. Create an Entra app registration (single tenant) named "Workforce Planner deploy" and a client secret for it. Give me the Application (client) ID, the Directory (tenant) ID and the secret value.
> 2. In the Power Platform admin center, add that app as an application user in the environment that has the Workforce Planner solution, and give it a security role that lets it create and publish code apps, and read the wfp_ tables (Environment Maker plus a role with access to the Workforce Planner tables is the usual starting point).
> 3. Confirm that code apps are enabled for that environment, and give me the environment URL (https://yourorg.crm9.dynamics.com or similar) and which cloud it is in (GCC is UsGov).

Two things to know. The secret expires (often in 6 or 12 months), so put a reminder on your calendar. And I have not been able to test a service account pushing a code app, so if the first run fails on permissions, send me the error and I will adjust the steps.

## 2. Create the work repository

1. In your work GitHub, create a new private repository, for example `workforce-planner`.
2. Unzip `workforce-planner-codeapp.zip` and upload everything in it to the repository (GitHub's "Add file", "Upload files" works, or use Git or VS Code). The folders are `codeapp`, `docs` and `.github`. Make sure the hidden `.github` folder comes along.

## 3. Add the secrets and settings

In the repository: Settings, then "Secrets and variables", then Actions.

| Where | Name | Value |
| --- | --- | --- |
| Secrets | `PP_TENANT_ID` | Directory (tenant) ID |
| Secrets | `PP_CLIENT_ID` | Application (client) ID |
| Secrets | `PP_CLIENT_SECRET` | The client secret value |
| Variables | `PP_ENVIRONMENT_URL` | The environment URL |
| Variables | `PP_CLOUD` | `UsGov` (or `UsGovHigh`, `DoD`) |

## 4. Run it

1. Go to the Actions tab, choose "Deploy Workforce Planner code app", then Run workflow.
2. The first run registers the app, adds the 12 tables as data sources, builds and publishes. It takes a few minutes.
3. When it finishes, open the run and download the **code-app-generated** artifact. It holds `power.config.json` and the generated `src/generated` files.
4. Commit both into the repository (`codeapp/power.config.json` and `codeapp/src/generated/`). This matters: without `power.config.json`, every run would create a new copy of the app instead of updating this one.
5. Send me the `src/generated` files. I will connect the app to Dataverse using them.

## 5. When I change the app

I will send a new zip. Copy its files over the repository, commit, and run the workflow again. Only files that changed need to be replaced, and I will say which ones.

## If Actions is turned off

Some work GitHub organizations restrict Actions or hosted runners. If the Actions tab is missing or runs never start, ask your GitHub admin to allow Actions for this repository.
