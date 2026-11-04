# Connect a repository through a GitHub App

Repository owners install the app through GitHub. Contributors use local Ghost identities and do not sign in to GitHub. No personal access token is needed. The server still needs the app's own signing credentials, configured once by the operator.

## Register the app once

1. Open [GitHub App settings](https://github.com/settings/apps) and choose **New GitHub App**. Use a unique name, for example `ghostcommits-your-name`.
2. Set the homepage to your application URL (`http://localhost:5173` for local development).
3. This integration uses installation authentication, not user OAuth. Leave OAuth callback and setup URLs empty, and leave user authorization during installation disabled. Owners return to the existing GhostCommits tab manually.
4. Disable **Active** under Webhook. This MVP checks merges on request and does not have a webhook receiver.
5. Under repository permissions, select **Contents: Read and write** and **Pull requests: Read and write**. Metadata read access is included by GitHub. No account or organization permissions are needed.
6. Choose installation availability: only your account for a personal demo, or any account if other repository owners will install it.
7. Create the app, copy its **App ID**, and generate/download a private key. Store the PEM file privately, for example `secrets/github-app.pem` inside this project. Both `secrets/` and `*.pem` are Git-ignored. Do not put the key in `public/` or `dist/`.

Fill these values in `.env`:

```dotenv
GITHUB_APP_ID=your-app-id
GITHUB_APP_PRIVATE_KEY_PATH=./secrets/github-app.pem
GITHUB_REPOSITORY=your-owner/your-repository
GITHUB_BASE_BRANCH=main
```

Keep the generated `SPONSOR_TOKEN`; it protects the sponsor desk. No OAuth client secret, personal GitHub token, or manually copied installation token is needed. Relative key paths resolve from the directory where you start the server. Restart the server after changing environment values.

## Connect in GhostCommits

1. Start the app with `npm run dev` and open `http://localhost:5173`.
2. Open **Sponsor desk** and enter your `SPONSOR_TOKEN`.
3. Click **Connect GitHub**, then **Continue on GitHub**. GitHub handles sign-in and installation approval in a new tab.
4. Select the owner and grant access to the repository configured above. Organization owners may need to approve an installation request.
5. Return to GhostCommits and click **Check connection**. The server discovers the installation directly from GitHub, checks Contents/Pull requests permissions, requests a token restricted to the configured repository, and verifies that the base branch exists.
6. Once connected, contributions can be published. Repeat **Check connection** after a backend restart. Other already-open tabs may need a page reload to show the updated status.

The MVP still serves one configured repository and one bounty; installation does not enable arbitrary repository selection. Do not change bounty/repository configuration while existing contributions or claims depend on it.

## Credentials and failures

- Installation tokens stay in server memory and are refreshed before expiry. No tokens or private keys are returned by the connection endpoints.
- Installation lookup comes from GitHub's authenticated repository endpoint. The browser cannot select an arbitrary installation ID or repository.
- A missing, suspended, or insufficiently authorized installation cannot pass the check. A nonexistent or empty base branch also prevents connection.
- If access is revoked, subsequent GitHub calls fail. Reinstall/restore permissions and check the connection again. Cached tokens do not bypass GitHub's authorization checks.
- To disconnect, uninstall the app or remove repository access in GitHub's installed-app settings. Stop the backend and remove its signing credentials if retiring the deployment.
- Never share the app private key or sponsor secret. The sponsor secret still controls payouts; GitHub installation does not grant sponsor-desk access.

No live installation or PR creation has been verified in this workspace. Complete an end-to-end trial on a controlled test repository before relying on the integration.

References: [GitHub App installation authentication](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation), [app JWT authentication](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-json-web-token-jwt-for-a-github-app).
