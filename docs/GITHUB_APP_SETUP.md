# GitHub App setup

Use the current [Netlify deployment guide](NETLIFY_DEPLOYMENT.md#2-register-one-public-github-app). GhostCommits now uses one public GitHub App registered by the site operator, OAuth sign-in for each maintainer, and installation-scoped bot tokens for PR operations.

Maintainers sign in on the site, install the App on their own selected public repositories, refresh the repository list, and publish a bounty. The server rechecks their maintainer/admin permission when publishing. Contributors need no personal GitHub login.

For local development register an additional callback `http://localhost:5173/api/github/callback` and use `APP_ORIGIN=http://localhost:5173`. The Vite proxy forwards the callback to the backend. Keep local PEM files in Git-ignored `secrets/` or set the private-key environment variable. Never commit credentials.
