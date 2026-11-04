import '@fontsource-variable/inter';
import './styles.css';
import {
  loadIdentity,
  createIdentity,
  exportIdentity,
  importIdentity,
  fingerprint,
  sign,
} from './identity.js';
import { request, authenticated, clearSession } from './api.js';
import { connectWallet, sendPayment, checkPayment } from './wallet.js';
import {
  shell,
  bounties,
  bountyDetail,
  identityView,
  submitView,
  contributionsView,
  sponsorView,
  privacyView,
  escape,
} from './views.js';
import { icon } from './icons.js';

const state = {
  route: location.hash.slice(1) || 'bounties',
  config: null,
  identity: loadIdentity(),
  fingerprint: '',
  submissions: [],
  claims: [],
  sponsorToken: '',
  maintainer: null,
  repositories: [],
  bountyRequestId: crypto.randomUUID(),
  walletBalance: null,
  wallet: null,
  error: '',
  review: false,
  draft: { title: '', description: '', path: '', content: '', requestId: crypto.randomUUID() },
  pendingTx: {},
  githubInstallUrl: '',
};
const app = document.querySelector('#app');
let claimReview = null;
let working = false;

function notify(message, error = false) {
  const node = document.createElement('div');
  node.className = `toast ${error ? 'toast-error' : ''}`;
  node.textContent = message;
  document.querySelector('#notifications').append(node);
  setTimeout(() => node.remove(), error ? 10000 : 5000);
}
function render() {
  if (!state.config) {
    app.innerHTML = `<div class="boot-state"><img src="/ghost.svg" width="48" height="48" alt=""/><h1>GhostCommits</h1><p>${escape(state.error || 'Opening your workspace…')}</p>${state.error ? '<button class="button primary" data-action="reload">Retry connection</button>' : '<div class="loading-bar"></div>'}</div>`;
    return;
  }
  const route = state.route.split('/')[0];
  const selected = state.config.bounties?.find((b) => b.id === state.route.split('/')[1]);
  if (selected && ['bounty', 'submit'].includes(route)) state.config.bounty = selected;
  if (route === 'submit' && state.draft.bountyId !== state.config.bounty.id) {
    state.draft = {
      title: '',
      description: '',
      path: '',
      content: '',
      requestId: crypto.randomUUID(),
      bountyId: state.config.bounty.id,
    };
    state.review = false;
  }
  const view =
    {
      bounties,
      bounty: bountyDetail,
      identity: identityView,
      submit: submitView,
      contributions: contributionsView,
      sponsor: sponsorView,
      privacy: privacyView,
    }[route] || bounties;
  app.innerHTML = shell(state, view(state));
  document.title = `${{ bounties: 'Discover', bounty: 'Bounty', identity: 'My Ghost', submit: 'New contribution', contributions: 'Contributions', sponsor: 'Sponsor desk', privacy: 'Privacy' }[route] || 'Workspace'} · GhostCommits`;
}
async function refreshContributions() {
  if (state.identity) state.submissions = await authenticated(state.identity, '/submissions');
  state.config = await request('/config');
}
async function refreshSponsor() {
  if (state.sponsorToken || state.maintainer)
    state.claims = await request('/sponsor/claims', { authorization: state.sponsorToken });
}
function sponsor(path, data) {
  return request(`/sponsor${path}`, { data, authorization: state.sponsorToken });
}
function navigate(route) {
  if (location.hash === `#${route}`) {
    state.route = route;
    render();
  } else location.hash = route;
}
async function busy(element, callback) {
  if (working) return;
  working = true;
  const button = element?.matches('button')
    ? element
    : element?.querySelector('button[type="submit"],button:not([type])');
  const old = button?.innerHTML;
  if (button) {
    button.disabled = true;
    button.innerHTML = '<span class="spinner"></span> Working…';
    button.setAttribute('aria-busy', 'true');
  }
  try {
    await callback();
  } catch (error) {
    notify(error.message || 'Something went wrong. Please try again.', true);
  } finally {
    working = false;
    if (button?.isConnected) {
      button.disabled = false;
      button.innerHTML = old;
      button.removeAttribute('aria-busy');
    }
  }
}
async function initialize() {
  state.error = '';
  render();
  try {
    state.config = await request('/config');
    state.maintainer = (await request('/maintainer')).user;
    if (state.maintainer) await refreshSponsor();
    if (state.identity) {
      state.fingerprint = await fingerprint(state.identity);
      await refreshContributions();
    }
  } catch (error) {
    state.error = error.message;
  }
  render();
}

app.addEventListener('click', (event) => {
  if (!event.target.closest('.skip-link')) return;
  event.preventDefault();
  document.querySelector('#main')?.focus();
});

window.addEventListener('hashchange', () => {
  state.route = location.hash.slice(1) || 'bounties';
  render();
  window.scrollTo({ top: 0 });
});
app.addEventListener('input', (event) => {
  if (event.target.closest('#contribution-form')) {
    state.draft[event.target.name] = event.target.value;
    state.draft.requestId = crypto.randomUUID();
  }
});
app.addEventListener('change', (event) => {
  if (event.target.id !== 'import-key' || !event.target.files[0]) return;
  const file = event.target.files[0];
  if (state.identity && !state.identity.backedUp) {
    notify('Export the current recovery key before replacing your identity.', true);
    event.target.value = '';
    return;
  }
  busy(null, async () => {
    state.identity = await importIdentity(file);
    clearSession();
    state.fingerprint = await fingerprint(state.identity);
    state.submissions = [];
    state.review = false;
    render();
    await refreshContributions();
    render();
    notify('Identity restored.');
  });
});
app.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  busy(button, async () => {
    if (action === 'reload') await initialize();
    if (action === 'create-identity') {
      state.identity = await createIdentity();
      state.fingerprint = await fingerprint(state.identity);
      clearSession();
      render();
      notify('Your Ghost identity is ready. Export a recovery copy.');
    }
    if (action === 'export-key') {
      exportIdentity(state.identity);
      render();
      notify('Recovery export downloaded. Keep it private.');
    }
    if (action === 'edit-draft') {
      state.review = false;
      render();
    }
    if (action === 'verify') {
      await authenticated(state.identity, '/submissions/verify', { id: button.dataset.id });
      await refreshContributions();
      render();
      notify('Merge status refreshed from GitHub.');
    }
    if (action === 'retry-pr') {
      const submission = state.submissions.find((s) => s.id === button.dataset.id);
      await authenticated(state.identity, '/submissions', submission);
      await refreshContributions();
      render();
      notify('Pull request is ready.');
    }
    if (action === 'load-repositories') {
      state.repositories = await sponsor('/repositories');
      render();
      notify(`${state.repositories.length} repositories available.`);
    }
    if (action === 'recipient-wallet') {
      const connected = await connectWallet();
      document.querySelector('#claim-form input[name="address"]').value =
        connected.account.shielded;
    }
    if (action === 'connect-github') {
      const result = await sponsor('/github/connect', {});
      state.githubInstallUrl = result.url;
      render();
    }
    if (action === 'check-github') {
      try {
        await sponsor('/github/check', {});
        notify('GitHub repository connected. Contributions can now be published.');
      } finally {
        state.config = await request('/config');
        render();
      }
    }
    if (action === 'connect-wallet') {
      const connected = await connectWallet();
      state.wallet = connected.wallet;
      state.walletBalance = await connected.wallet.zcash.getBalance().catch(() => null);
      render();
      notify('Testnet wallet connected.');
    }
    if (action === 'refresh-sponsor') {
      await refreshSponsor();
      render();
    }
    if (action === 'lock-sponsor') {
      await request('/maintainer/logout', { data: {} });
      state.maintainer = null;
      state.repositories = [];
      state.walletBalance = null;
      state.sponsorToken = '';
      state.claims = [];
      state.wallet = null;
      state.githubInstallUrl = '';
      render();
    }
    if (action === 'pay') {
      const claim = state.claims.find((c) => c.id === button.dataset.id);
      if (!state.wallet) throw new Error('Connect a testnet wallet first.');
      await checkPayment(state.wallet, claim);
      await sponsor('/reserve', { id: claim.id });
      try {
        const txid = await sendPayment(state.wallet, claim);
        state.pendingTx[claim.id] = txid;
        await sponsor('/record', { id: claim.id, txid });
        notify('Transaction recorded. Confirm receipt in the recipient wallet.');
      } catch (error) {
        notify(
          `${error.message} The payout remains reserved. Check wallet history before taking any further action.`,
          true,
        );
      } finally {
        await refreshSponsor();
        render();
      }
    }
  });
});
app.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.target;
  const values = Object.fromEntries(new FormData(form));
  busy(form, async () => {
    if (form.id === 'bounty-form') {
      const result = await sponsor('/bounties', { ...values, requestId: state.bountyRequestId });
      state.bountyRequestId = crypto.randomUUID();
      state.config = await request('/config');
      navigate(`bounty/${result.id}`);
      notify('Bounty published. Share its link with contributors.');
    }
    if (form.classList.contains('revision-form')) {
      await authenticated(state.identity, '/submissions/revise', {
        id: form.dataset.id,
        content: values.content,
      });
      await refreshContributions();
      render();
      notify('The existing pull request has been updated.');
    }
    if (form.classList.contains('reject-form')) {
      await sponsor('/reject', { id: form.dataset.id, reason: values.reason });
      await refreshSponsor();
      render();
      notify('Claim declined.');
    }
    if (form.id === 'contribution-form') {
      Object.assign(state.draft, values);
      state.review = true;
      render();
      window.scrollTo({ top: 0 });
    }
    if (form.id === 'publish-form') {
      try {
        const submission = await authenticated(state.identity, '/submissions', state.draft);
        await refreshContributions();
        state.review = false;
        state.draft = {
          title: '',
          description: '',
          path: '',
          content: '',
          requestId: crypto.randomUUID(),
        };
        navigate(`contributions/${submission.id}`);
        notify('Your GitHub pull request is ready.');
      } catch (error) {
        await refreshContributions().catch(() => {});
        throw error;
      }
    }
    if (form.id === 'claim-form') {
      const challenge = await authenticated(state.identity, '/claims/challenge', {
        submissionId: form.dataset.id,
        address: values.address.trim(),
      });
      claimReview = challenge;
      showClaimDialog(challenge);
    }
    if (form.id === 'sponsor-login') {
      const claims = await request('/sponsor/claims', { authorization: values.token });
      state.sponsorToken = values.token;
      state.claims = claims;
      render();
    }
    if (form.classList.contains('record-form')) {
      await sponsor('/record', { id: form.dataset.id, txid: values.txid.trim() });
      await refreshSponsor();
      render();
      notify('Transaction recorded as unverified.');
    }
  });
});

function showClaimDialog(challenge) {
  const payload = JSON.parse(challenge.message);
  const dialog = document.createElement('dialog');
  dialog.className = 'claim-dialog';
  dialog.innerHTML = `<form method="dialog"><div class="dialog-heading"><span class="empty-icon">${icon('key')}</span><h2>Review your reward claim</h2><p>Your signature binds this contribution, reward, and address.</p></div><dl><dt>Reward</dt><dd>${escape(payload.amount)} testnet ZEC</dd><dt>Destination</dt><dd class="mono break-all">${escape(payload.address)}</dd><dt>Submission</dt><dd class="mono">${escape(payload.submissionId)}</dd><dt>Application</dt><dd>${escape(payload.domain)}</dd></dl><p class="small muted">The sponsor and operator can see this receiving address. This signature requests a payout; it does not send funds.</p><div class="form-actions"><button class="button secondary" value="cancel">Cancel</button><button type="button" class="button primary" id="sign-claim">${icon('key')} Sign reward claim</button></div></form>`;
  document.body.append(dialog);
  dialog.showModal();
  dialog.addEventListener('close', () => {
    claimReview = null;
    dialog.remove();
  });
  dialog.querySelector('#sign-claim').addEventListener('click', (event) =>
    busy(event.currentTarget, async () => {
      const signature = await sign(state.identity, challenge.message);
      await authenticated(state.identity, '/claims', { id: challenge.id, signature });
      dialog.close();
      await refreshContributions();
      render();
      notify('Claim signed and sent for sponsor review.');
    }),
  );
}

initialize();
