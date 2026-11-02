<p align="center">
  <img src="docs/brand/rill-dark.svg#gh-dark-mode-only" alt="Rill" width="280">
  <img src="docs/brand/rill.svg#gh-light-mode-only" alt="Rill" width="280">
</p>

Deploy and manage your own installation on Cloudflare Workers.

Everything happens in your browser. No downloads or domain name needed.

### 1. Sign in

Have a [GitHub account](https://github.com/signup) and a [Cloudflare account](https://dash.cloudflare.com/sign-up) ready. GitHub holds your copy of the project; Cloudflare hosts it.

### 2. Deploy

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/mrtxiv/Rill)

- Choose your Cloudflare account and connect GitHub when prompted. Approve access for **Cloudflare Workers & Pages**.
- Choose where to create your GitHub repository and give it a name. Cloudflare makes the copy for you.
- Keep the suggested Worker, database, and queue names, or choose unused names. Leave the detected settings as they are, then select **Deploy**.

Wait for the deployment to succeed. Cloudflare handles the build, database, and background queue setup. Each build fetches the latest Rill code. [About this deployment flow](https://developers.cloudflare.com/workers/platform/deploy-buttons/).

<details>
<summary>If you’re asked for build settings</summary>

Use these values for this project:

| Setting | Value |
| --- | --- |
| Root directory | Repository root (`/`) |
| Build command | `npm run build` |
| Deploy command | `npm run deploy` |
| D1 database binding | `DB` |
| Required variables or secrets | None for deployment and first login |

The database name can change, but the binding must stay `DB`. Tables are created automatically on first use; you do not need to import SQL or run migrations.

You can change build settings later under your Worker's **Settings → Build**. See [Cloudflare's build settings](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/).

If you are deploying through a GitHub organization, its administrator may need to approve access. See [GitHub connection permissions](https://developers.cloudflare.com/workers/ci-cd/builds/git-integration/github-integration/#manage-access).

</details>

### 3. Open it

- In the [Cloudflare dashboard](https://dash.cloudflare.com/), go to **Workers & Pages** and select your Worker.
- Under **Settings → Domains & Routes**, open the `workers.dev` address shown for your installation.
- Create your installation account with a password of at least **8 characters**. This is separate from your GitHub and Cloudflare accounts.
- Optional: before opening it, add a `RILL_SETUP_TOKEN` secret (for example `openssl rand -hex 16`) under **Settings → Variables and Secrets**. The setup page then asks for it, so nobody who finds your address first can claim the installation.

Once the settings page opens, you're done. Bookmark the address.

<details>
<summary>Address and username details</summary>

Your address looks like `https://your-worker.your-subdomain.workers.dev`. Use the actual address Cloudflare shows, rather than this example. You do not need a custom domain. See [Cloudflare's address documentation](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/).

Your username can contain 1–32 letters, numbers, dots, dashes or underscores.

</details>

### Background queue — automatic

**Nothing extra to set up.** Deploy Rill normally, or click **Update Rill** on an existing installation. The build configures a background queue, and deployment creates it and connects it to your Worker automatically. If your configuration already includes a Rill queue, it is reused. Future updates keep the connection.

The queue handles history imports and maintenance. Jellyfin browsing responds directly. Keep the existing scheduled trigger enabled; it sends background work to the queue.

This works on **Cloudflare Free** and does not upgrade your plan. The free queue allowance is **10,000 operations per day** across your account; a normal message uses three operations. Other free-plan limits still apply. [Automatic provisioning](https://developers.cloudflare.com/workers/wrangler/configuration/#automatic-provisioning) · [Free allowance](https://developers.cloudflare.com/queues/platform/pricing/).

---

### Updates

**Connect once:**

1. In Cloudflare, open your Worker → **Settings → Builds → Deploy Hooks**. Create a hook named **Rill updates** for your production branch (normally `main`) and copy its URL.
2. In Rill → **General → Updates → Connect updates**, paste the URL and click **Connect updates**. Saving the connection does not start a build.

After that, updates take one click inside Rill. No API token or GitHub workflow is needed. The hook is saved privately in your installation database, separate from shared configurations; it is never returned to the browser after saving. Anyone with the hook URL can request a build, so keep it private. [About Cloudflare Deploy Hooks](https://developers.cloudflare.com/workers/ci-cd/builds/deploy-hooks/).

**Update now:** sign in to Rill, open **General → Updates**, and click **Update Rill**. You can also reach it from your account menu. Cloudflare starts a fresh build using the latest original Rill code and your existing Worker and database settings. Open **View Cloudflare builds**, select your Worker, and wait for the build to succeed before reloading Rill. “Update requested” means Cloudflare accepted the request; it does not mean deployment has finished.

**Update daily:** enable **Update automatically each day at 04:17 UTC** in Rill's update settings and save. Leave the existing scheduled trigger enabled. Disable the checkbox to return to manual updates, or choose **Disconnect** to disable both. Existing installations using the `RILL_UPDATE_HOOK` secret remain connected with daily updates enabled until changed in Rill.

Cloudflare's standard install button does not provision Deploy Hooks. Creating one through its API requires Workers Builds Configuration edit access (`Workers CI Write`), which is not included in the documented default build token permissions. That is why connecting the hook is a one-time step. [Hook creation API](https://developers.cloudflare.com/api/resources/workers_builds/subresources/deploy_hooks/methods/create/) · [Build token permissions](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/#api-token).

Updates change your running installation; your GitHub copy is not synced. Builds use the original Rill application code, so edits to application code in your copy are not included. Your installation's `wrangler.jsonc`, existing database, and Cloudflare secrets are retained. Failed builds leave the currently deployed version running.

<details>
<summary>Installed before this update feature?</summary>

In Cloudflare → your Worker → **Settings → Build**, set **Build command** to:

```sh
git fetch https://github.com/mrtxiv/Rill.git main && git restore --source=FETCH_HEAD -- scripts package.json package-lock.json && npm run build
```

Set **Deploy command** to `npm run deploy` and save. To start a fresh build, open the connected repository on GitHub, make a small edit to its README, and commit it to the production branch. Keep these build settings for future updates. Once the build succeeds, reload Rill and connect updates using the steps above. No GitHub Actions setup is needed.

Updates use a fresh build started by Rill's connected Deploy Hook. Cloudflare creates a separate repository copy, so GitHub's **Sync fork** button is not part of this update flow.

</details>

<details>
<summary>Need help deploying?</summary>

**GitHub account or repository unavailable**

Check the Cloudflare Workers & Pages app's access in [GitHub → Settings → Applications](https://github.com/settings/installations). For an organization, ask its administrator to approve the connection.

**Build or deployment failed**

Open the failed build from your Worker's **Deployments** tab and read the error log. Check the build settings above. Cloudflare's [build troubleshooting guide](https://developers.cloudflare.com/workers/ci-cd/builds/troubleshoot/) covers common errors.

**“Durable storage is not configured”**

Open your Worker's **Bindings** tab and check for a D1 database connected as `DB`. If missing, select **Add binding → D1 database**, enter `DB` as the variable name, and choose the database created for this installation. See [Cloudflare's D1 binding instructions](https://developers.cloudflare.com/d1/get-started/#3-bind-your-worker-to-your-d1-database).

**The address does not open**

Confirm deployment succeeded and that the `workers.dev` route is enabled under **Settings → Domains & Routes**. Open the production address shown there.

</details>

<details>
<summary>Hosting and usage</summary>

Hosting is in your Cloudflare account. You manage the installation and any associated charges. Review the current [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) and [D1 limits](https://developers.cloudflare.com/d1/platform/limits/) for your plan.

</details>

[MIT License](LICENSE)
