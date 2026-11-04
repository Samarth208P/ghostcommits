import { icon } from './icons.js';

export const escape = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );
const e = escape;
const help = (label, text) =>
  `<button type="button" class="info-button" aria-label="${e(label)}" data-help="${e(text)}">${icon('info')}</button>`;
const guidance = (label, text) =>
  `<div class="inline-guidance"><span>${label}</span>${help(label, text)}</div>`;
const date = (value) =>
  new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
const labels = {
  creating: 'PR creation pending',
  'in-review': 'In review',
  merged: 'Merge verified',
  closed: 'Closed',
  rejected: 'Not selected',
  'awaiting-sponsor': 'Awaiting sponsor',
  'payment-reserved': 'Payment reserved',
  'recorded-unverified': 'Transaction unverified',
};
export const badge = (label, tone = '') =>
  `<span class="badge ${tone}"><span class="status-dot"></span>${e(label)}</span>`;
const status = (item) =>
  badge(
    labels[item.status] || item.status,
    item.status === 'merged' ? 'green' : item.status === 'closed' ? 'neutral' : 'amber',
  );
const link = (url, title, className = '') =>
  `<a href="${e(url)}" class="${className}" target="_blank" rel="noopener noreferrer">${e(title)}${icon('external')}</a>`;
const empty = (name, title, description, action = '') =>
  `<div class="empty-state"><span class="empty-icon">${icon(name)}</span><h3>${title}</h3><p>${description}</p>${action}</div>`;
const repo = (name) => `<span class="repository">${icon('book')}<span>${e(name)}</span></span>`;
const reward = (amount) =>
  `<div class="reward-wrap"><span class="reward-number">${e(amount)} <span class="reward-currency">ZEC</span></span><span class="muted small reward-note">Testnet reward · no monetary value</span></div>`;
const pageHeading = (title, description, action = '') =>
  `<div class="page-heading"><div><h1>${title}</h1><p>${description}</p></div>${action}</div>`;
const privacyNote = () =>
  `<div class="privacy-note">${icon('shield')}<div><div class="inline-guidance"><strong>Your work speaks for you.</strong>${help('About your privacy', "Your code is public. Your personal GitHub account isn't required. Your activity remains linked to your Ghost. The operator can still associate submissions and payments.")}</div><a href="#privacy">Understand privacy boundaries ${icon('arrow')}</a></div></div>`;

export function shell(state, content) {
  const page = state.route.split('/')[0];
  const nav = (href, name, symbol, active) =>
    `<a href="#${href}" class="nav-item ${active ? 'active' : ''}" ${active ? 'aria-current="page"' : ''}>${icon(symbol)}<span>${name}</span>${href === 'contributions' && state.submissions.length ? `<span class="nav-count">${state.submissions.length}</span>` : ''}</a>`;
  return `
    <a class="skip-link" href="#main">Skip to content</a>
    <div class="app-shell ${state.sidebarCollapsed ? 'sidebar-retracted' : ''}">
      <aside class="sidebar" id="workspace-sidebar" ${state.sidebarCollapsed ? 'inert aria-hidden="true"' : ''}>
        <a class="brand" href="#bounties">
          <span class="brand-name">GhostCommits<span class="brand-period">.</span></span>
        </a>
        <div class="workspace-label">YOUR WORKSPACE</div>
        <nav aria-label="Main navigation">
          ${nav('bounties', 'Bounties', 'grid', ['bounties', 'bounty', 'submit'].includes(page))}
          ${nav('contributions', 'My contributions', 'branch', page === 'contributions')}
          ${nav('identity', 'My Ghost', 'ghost', page === 'identity')}
        </nav>
        <div class="sidebar-divider"></div>
        <div class="workspace-label">WORKSPACE TOOLS</div>
        <nav aria-label="Resources">
          ${nav('sponsor', 'Sponsor desk', 'wallet', page === 'sponsor')}
          ${nav('privacy', 'Privacy & security', 'shield', page === 'privacy')}
        </nav>
        <div class="sidebar-bottom">
          <div class="network-mini">
            <span class="status-dot"></span>
            <span>Zcash testnet</span>
            <span class="version-tag">v0.1</span>
          </div>
          <a href="#identity" class="sidebar-identity">
            <span class="avatar">${icon('ghost')}</span>
            <div>
              <strong>${state.identity ? `Ghost #${state.fingerprint.slice(0, 4)}` : 'Private identity'}</strong>
              <span>${state.identity ? 'Local signing key active' : 'Create your Ghost'}</span>
            </div>
            ${icon('arrow')}
          </a>
        </div>
      </aside>
      <div class="workspace">
        <header class="topbar">
          <div class="topbar-left">
            <button type="button" class="sidebar-toggle" data-sidebar-toggle aria-controls="workspace-sidebar" aria-expanded="${!state.sidebarCollapsed}" aria-label="${state.sidebarCollapsed ? 'Expand' : 'Collapse'} sidebar" title="${state.sidebarCollapsed ? 'Expand' : 'Collapse'} sidebar">${icon('sidebar')}</button>
            <a class="topbar-brand brand-name" href="#bounties">GhostCommits<span class="brand-period">.</span></a>
          <div class="breadcrumb">
            <span>Workspace</span>
            <span class="breadcrumb-slash">/</span>
            <strong>${{ bounties: 'Discover', bounty: 'Bounty details', submit: 'New contribution', contributions: 'Contributions', identity: 'My Ghost', sponsor: 'Sponsor desk', privacy: 'Privacy dossier' }[page] || 'Discover'}</strong>
          </div>
          </div>
          <div class="topbar-right">
            ${badge('Testnet', 'neutral')}
            <a class="topbar-help" href="#privacy">${icon('lock')} <span>Privacy by intention</span></a>
          </div>
        </header>
        <main id="main" tabindex="-1">
          ${state.error ? `<div class="notice error" role="alert">${icon('info')}<div>${e(state.error)} <button class="text-button" data-action="reload">Try again</button></div></div>` : ''}
          ${content}
        </main>
        <div class="huge-watermark" aria-hidden="true"><span>GHOSTCOMMITS</span></div>
        <footer class="workspace-footer">
          <span>Public code. A separate identity. Testnet rewards.</span>
          <span>Made for open source <span class="footer-dot">·</span> Powered by Zcash Shielded Testnet</span>
        </footer>
      </div>
    </div>
  `;
}

export function bounties(state) {
  if (state.config.bounties)
    return `
    ${pageHeading('Good work. <span class="text-accent-red">Quiet identity.</span>', 'Contribute to public repositories. Receive maintainer-approved ZEC testnet rewards.', '<a class="button secondary" href="#sponsor">Publish a bounty</a>')}
    <div class="catalog-meta"><span>${icon('grid')} Available bounties <span class="catalog-count">${state.config.bounties.length}</span></span>${guidance('How it works', 'No personal GitHub login is required to contribute. Submit one file through the repository bot using your local Ghost identity. Rewards use Noir Wallet on Zcash testnet and have no monetary value. A merge does not guarantee a reward; the maintainer must approve it.')}</div>
    <div class="bounty-catalog">${state.config.bounties
      .map(
        (b) => `
      <a class="bounty-card" href="#bounty/${e(b.id)}">
        <div class="card-top">${repo(b.repository)}${badge(b.awardAvailable ? 'Open for PRs' : 'Award selected', b.awardAvailable ? 'green' : 'neutral')}</div>
        <h2>${e(b.title)}</h2><p>${e(b.description)}</p>
        <p class="small muted">Maintained by ${e(b.maintainerLogin)} · One file per contribution</p>
        <div class="bounty-card-bottom">${reward(b.amount)}${icon('arrow')}</div>
      </a>`,
      )
      .join('')}</div>
    ${!state.config.bounties.length ? empty('branch', 'Ready for the first bounty', 'Maintainers can sign in with GitHub, install the bot on a public repository, and publish a testnet reward.', '<a class="button primary" href="#sponsor">Connect your repository</a>') : ''}
    ${privacyNote()}`;

  const b = state.config.bounty;
  return `
    <div class="live-pill animate-fade-up">
      <span class="beacon-wrap">
        <span class="beacon-ping"></span>
        <span class="beacon-core"></span>
      </span>
      <span class="live-pill-text">GhostCommits testnet workspace</span>
      <span class="live-pill-arrow">${icon('arrow')}</span>
    </div>
    ${pageHeading(
      'Good work. <span class="text-accent-red">Quiet identity.</span>',
      'Find something worth building. Let your contribution do the talking.',
      `<a class="button secondary" href="#contributions">${icon('branch')} My contributions</a>`,
    )}
    <div class="intro-strip animate-fade-up">
      <div class="intro-mark">${icon('ghost')}</div>
      <div class="intro-content">
        <strong>Public contributions. Pseudonymous ownership.</strong>
        ${guidance('One file. Your Ghost. A verifiable contribution.', 'Submit one file through the repository bot, prove control of your Ghost identity, and request a sponsor-approved testnet reward.')}
      </div>
      <a href="#identity" class="intro-action">${state.identity ? 'View your Ghost' : 'Create your Ghost'} ${icon('arrow')}</a>
    </div>
    <div class="section-heading">
      <div class="tab-label">${b.configured ? 'Configured bounty' : 'Sample bounty'} <span>1</span></div>
      <span class="muted small">${b.configured ? (b.awardAvailable === false ? 'Active repository · award already claimed' : 'Active repository · 1 award open') : 'Sample workspace · configuration required'}</span>
    </div>
    <div class="discovery-grid">
      <div>
        <a class="bounty-card" href="#bounty">
          <div class="card-top">
            ${repo(b.repository)}
            ${badge(b.configured ? (b.awardAvailable === false ? 'Award claimed' : 'Open for PRs') : 'Sample bounty', b.configured ? 'green' : 'neutral')}
          </div>
          <h2>${e(b.title)}</h2>
          <p>${e(b.description)}</p>
          <div class="tags">
            <span>Open source</span>
            <span>One repository</span>
            <span>Single award</span>
            <span>Shielded Zcash</span>
          </div>
          <div class="bounty-card-bottom">
            ${reward(b.amount)}
            <span class="card-arrow" aria-label="View bounty">${icon('arrow')}</span>
          </div>
        </a>
        <div class="subtle-callout">${guidance(b.configured ? 'Reward eligibility' : 'About this sample', b.configured ? 'Rewards are subject to published criteria and sponsor approval. Only verified merged PRs are eligible for payout.' : 'This is a sample bounty from the product specification. Configure your GitHub repository to accept real contributions.')}</div>
        <section class="recent-section">
          <div class="section-heading">
            <h2>Your contributions</h2>
            <a class="quiet-link" href="#contributions">View all ${icon('arrow')}</a>
          </div>
          ${state.submissions.length ? contributionList(state.submissions.slice(0, 3)) : empty('branch', 'Your first contribution starts here', 'Pick up the bounty above. Your work will appear here once you submit it.', '<a class="button secondary" href="#bounty">Explore the bounty ' + icon('arrow') + '</a>')}
        </section>
      </div>
      <aside class="context-rail">
        <section class="journey panel">
          <h3>A different way to contribute</h3>
          <ol>
            <li>
              <span>${icon('ghost')}</span>
              <div>
                <div class="inline-guidance"><strong>Make it yours</strong>${help('About your Ghost identity', 'Generate a local keypair. Keep the recovery file. Your private key stays in this browser and is used to authenticate your submissions.')}</div>
              </div>
            </li>
            <li>
              <span>${icon('code')}</span>
              <div>
                <div class="inline-guidance"><strong>Ship something useful</strong>${help('About submitting code', 'The bot opens your pull request without a personal GitHub login. Your code, file path, title, and description are public on GitHub.')}</div>
              </div>
            </li>
            <li>
              <span>${icon('shield')}</span>
              <div>
                <div class="inline-guidance"><strong>Let the work count</strong>${help('About merge verification', 'GitHub merge checks update your contribution history in this workspace. A maintainer reviews the PR; GhostCommits then verifies merge evidence from GitHub.')}</div>
              </div>
            </li>
            <li>
              <span>${icon('wallet')}</span>
              <div>
                <div class="inline-guidance"><strong>Claim your reward</strong>${help('About reward claims', 'Sign a cryptographic claim for a shielded testnet payout. The sponsor reviews the claim and approves payment in Noir Wallet. Testnet ZEC has no monetary value.')}</div>
              </div>
            </li>
          </ol>
          <a href="#privacy" class="journey-link">How privacy boundaries work ${icon('arrow')}</a>
        </section>
        ${privacyNote()}
      </aside>
    </div>
  `;
}

export function bountyDetail(state) {
  const b = state.config.bounty;
  return `
    <a class="back-link" href="#bounties">${icon('back')} All bounties</a>
    ${pageHeading(e(b.title), 'A small contribution can make a real difference to privacy-first open source.')}
    <div class="detail-grid">
      <article class="panel bounty-detail">
        <div class="card-top">
          ${repo(b.repository)}
          ${badge(b.configured ? (b.awardAvailable === false ? 'Award claimed' : 'Open for contributions') : 'Sample bounty', b.configured ? 'green' : 'neutral')}
        </div>
        <h2>The objective</h2>
        <p class="body-copy">${e(b.description)}</p>
        <h2>Acceptance criteria</h2>
        <ul class="criteria">
          ${b.criteria.map((item) => `<li>${icon('check')}<span>${e(item)}</span></li>`).join('')}
        </ul>
        <div class="review-guidance">${guidance('How your contribution is reviewed', 'A maintainer reviews your pull request on GitHub. Once it is merged, GhostCommits verifies the merge evidence. You can then prove ownership using your Ghost key and sign a reward claim. The sponsor reviews the claim before authorizing a shielded transfer.')}</div>
        <div class="detail-links">
          ${b.configured ? link(`https://github.com/${b.repository}`, 'View repository on GitHub', 'button secondary') : '<span class="muted small">Repository access has not been configured.</span>'}
          ${b.issueUrl ? link(b.issueUrl, 'View linked issue', 'button secondary') : ''}
        </div>
      </article>
      <aside>
        <div class="panel reward-panel">
          <div class="reward-label">Bounty reward</div>
          ${reward(b.amount)}
          <hr/>
          <dl>
            <div><dt>Network</dt><dd>Zcash testnet</dd></div>
            <div><dt>Payment type</dt><dd>Shielded Zcash</dd></div>
            <div><dt>Awards</dt><dd>Single winner</dd></div>
            <div><dt>Verification</dt><dd>Maintainer merge evidence</dd></div>
          </dl>
          <a class="button primary full" href="#${state.identity ? `submit/${e(b.id)}` : 'identity'}">
            ${state.identity ? 'Start contribution' : 'Create Ghost to contribute'} ${icon('arrow')}
          </a>
          <p class="small muted">Rewards require sponsor approval. No escrow.</p>
          ${guidance('Publishing & payment details', 'Your code and PR description are published under the bot. Repository visibility determines who can read them. Rewards require sponsor approval and are not held in escrow.')}
          ${b.awardAvailable === false ? '<p class="small muted">The single award has already been claimed. Further submissions do not have an available bounty reward.</p>' : ''}
        </div>
        ${privacyNote()}
      </aside>
    </div>
  `;
}

export function identityView(state) {
  if (!state.identity)
    return `
      ${pageHeading('A fresh identity. <span class="text-accent-red">The same you.</span>', 'Your contributions deserve a verifiable history. Your personal GitHub stays yours.')}
      <div class="onboarding panel">
        <div class="identity-art">
          <img src="/ghost.svg" alt="" width="92" height="92"/>
          <span class="art-label">Your identity. Your signing key.</span>
        </div>
        <div class="onboarding-copy">
          <h2>Meet your Ghost.</h2>
          <div class="onboarding-intro">${guidance('No GitHub login. No email. Just your key.', 'A local asymmetric signing key is all you need to get started. No personal GitHub login. No email address. Your activity remains linked to your Ghost.')}</div>
          <ul class="criteria">
            <li>${icon('check')}<span>Authenticate submissions with your Ghost identity</span></li>
            <li>${icon('check')}<span>Track GitHub-verified merges in this workspace</span></li>
            <li>${icon('check')}<span>Sign claims for shielded Zcash testnet rewards</span></li>
          </ul>
          <button class="button primary" data-action="create-identity">${icon('plus')} Create Ghost identity</button>
          <label class="import-link">
            Already have a Ghost? <span>Import recovery key</span>
            <input type="file" id="import-key" accept="application/json,.json"/>
          </label>
          <p class="small muted">Your private key is stored exclusively in this browser. Export a recovery copy and keep it safe.</p>
        </div>
      </div>
    `;

  const merged = state.submissions.filter((s) => s.evidence?.merged);
  return `
    ${pageHeading('My Ghost', 'Your contribution history under a separate identity. Public profiles and portable credentials are not included.')}
    <div class="profile-header panel">
      <span class="large-avatar">${icon('ghost')}</span>
      <div>
        <h2>Ghost #${state.fingerprint.slice(0, 4)}</h2>
        <p>Pseudonymous contributor <span class="footer-dot">·</span> Established ${date(state.identity.createdAt)}</p>
      </div>
      ${badge('Local Key Active', 'green')}
    </div>
    ${
      !state.identity.backedUp
        ? `
      <div class="notice amber">
        ${icon('key')}
        <div><strong>Keep a recovery copy.</strong> Losing this browser's key means losing access to your reputation and rewards.</div>
        <button class="button small-button secondary" data-action="export-key">Export key</button>
      </div>
    `
        : ''
    }
    <div class="profile-stats">
      <div><strong>${merged.length}</strong><span>Verified merged PRs</span></div>
      <div><strong>${new Set(merged.map((s) => s.repository)).size}</strong><span>Repositories contributed</span></div>
      <div><strong>${state.submissions.filter((s) => s.claim).length}</strong><span>Reward claims signed</span></div>
    </div>
    <div class="detail-grid">
      <section>
        <div class="section-heading"><h2>Contribution record</h2></div>
        ${state.submissions.length ? contributionList(state.submissions) : empty('branch', 'A blank canvas, full of possibility', 'Verified merged contributions will appear here. No noise, just verified code.', '<a href="#bounties" class="button secondary">Find your first bounty ' + icon('arrow') + '</a>')}
      </section>
      <aside class="panel key-panel">
        <div class="inline-guidance"><h3>Identity & recovery</h3>${help('About your public fingerprint', 'Your public-key fingerprint identifies this Ghost across bounties and claims. Safe to share publicly. Your private recovery key should never be shared.')}</div>
        <code class="fingerprint">${e((state.fingerprint.match(/.{1,8}/g) || []).join(' '))}</code>
        <button class="button secondary full" data-action="export-key">${icon('download')} Export recovery key</button>
        <label class="import-link">
          Restore another identity
          <input type="file" id="import-key" accept="application/json,.json"/>
        </label>
        <p class="small muted">Importing replaces the active identity in this browser. Export your current key first.</p>
      </aside>
    </div>
  `;
}

export function submitView(state) {
  if (!state.identity) return identityView(state);
  const d = state.draft;
  return `
    <a class="back-link" href="#bounty/${e(state.config.bounty.id)}">${icon('back')} Bounty details</a>
    ${pageHeading('Make your contribution.', 'One file. A meaningful change. Published under the GitHub bot.')}
    <div class="step-tabs">
      <span class="${!state.review ? 'selected' : ''}"><b>1</b> Prepare contribution</span>
      <span class="${state.review ? 'selected' : ''}"><b>2</b> Review & publish</span>
    </div>
    <div class="editor-layout">
      <section class="panel editor-panel">
        ${
          state.review
            ? `
          <div class="editor-heading">
            <h2>${e(d.title)}</h2>
            ${badge('Ready to submit', 'neutral')}
          </div>
          <p class="body-copy">${e(d.description)}</p>
          <div class="code-header">
            ${icon('code')} ${e(d.path)} <span>Complete replacement contents</span>
          </div>
          <pre class="code-preview"><code>${e(d.content)}</code></pre>
          <div class="notice amber">
            ${icon('info')}
            <p>This replaces the selected file in a new branch. Verify that your file contents do not contain your personal email, tokens, or local paths.</p>
          </div>
          <form id="publish-form">
            <label class="checkbox-label">
              <input type="checkbox" required/>
              <span>I reviewed the file contents and description for private identifying information.</span>
            </label>
            <div class="form-actions">
              <button type="button" class="button secondary" data-action="edit-draft">${icon('back')} Back to editing</button>
              <button class="button primary" ${!state.config.bounty.configured ? 'disabled' : ''}>Create GitHub PR ${icon('arrow')}</button>
            </div>
          </form>
        `
            : `
          <form id="contribution-form">
            <label>
              Pull request title
              <input name="title" required maxlength="160" placeholder="e.g., Handle reconnects gracefully during wallet synchronization" value="${e(d.title)}"/>
            </label>
            <label>
              Description
              <textarea name="description" rows="3" required maxlength="6000" placeholder="Explain the problem, your solution, and how to verify it...">${e(d.description)}</textarea>
            </label>
            <label>
              Destination file
              <span class="field-hint">Relative path within the repository. Complete file replacement.</span>
              <input name="path" class="mono" required maxlength="240" placeholder="src/sync/reconnect.ts" value="${e(d.path)}"/>
            </label>
            <label>
              File contents
              <textarea name="content" class="code-input" rows="14" required maxlength="120000" spellcheck="false" placeholder="// Paste your complete source code here...">${e(d.content)}</textarea>
            </label>
            <div class="form-actions">
              ${guidance('Draft storage', 'Draft is stored locally in memory in this browser tab. Closing or reloading the tab clears your draft.')}
              <button class="button primary">Review contribution ${icon('arrow')}</button>
            </div>
          </form>
        `
        }
      </section>
      <aside class="context-rail">
        <div class="submission-context panel">
          <h3>Target repository</h3>
          ${repo(state.config.bounty.repository)}
          <p class="target-title">${e(state.config.bounty.title)}</p>
          <hr/>
          <div class="privacy-columns">
            <div class="inline-guidance"><h4>${icon('external')} Public on GitHub</h4>${help('What is public on GitHub', 'Code patch, file path, title, PR description, bot commit attribution. Check for personal emails, secrets, and local paths before publishing.')}</div>
            <div class="inline-guidance"><h4>${icon('lock')} Kept confidential</h4>${help('What stays confidential', 'Your private key stays in your browser. No personal GitHub login is required. The sponsor and operator can see your receiving address.')}</div>
          </div>
        </div>
        ${!state.config.bounty.configured ? '<div class="notice amber">GitHub credentials are not yet configured on the server. You can prepare and preview drafts, but publishing is disabled.</div>' : ''}
      </aside>
    </div>
  `;
}

function contributionList(items) {
  return `
    <div class="contribution-list">
      ${items
        .map(
          (s) => `
        <a class="contribution-row" href="#contributions/${e(s.id)}">
          <span class="row-icon ${s.evidence?.merged ? 'green' : ''}">
            ${icon(s.evidence?.merged ? 'check' : 'branch')}
          </span>
          <div class="row-content">
            <strong>${e(s.title)}</strong>
            <span>${e(s.repository)} <span class="footer-dot">·</span> ${s.pr ? `#${s.pr.number}` : 'PR pending'} <span class="footer-dot">·</span> ${date(s.createdAt)}</span>
          </div>
          ${status(s)}
          ${icon('arrow')}
        </a>
      `,
        )
        .join('')}
    </div>
  `;
}

export function contributionsView(state) {
  const id = state.route.split('/')[1];
  if (!id)
    return `
      ${pageHeading(
        'Your work, in the open.',
        'Follow each contribution from bot submission to verified merge and reward claim.',
        '<a href="#bounties" class="button primary">' + icon('plus') + ' New contribution</a>',
      )}
      ${state.submissions.length ? contributionList(state.submissions) : empty('branch', 'Nothing submitted yet', 'Your pull requests, merge evidence, and reward claims will live here.', '<a class="button secondary" href="#bounties">Explore bounties ' + icon('arrow') + '</a>')}
    `;

  const s = state.submissions.find((item) => item.id === id);
  if (!s)
    return empty(
      'info',
      'Contribution not found',
      'Switch to the Ghost identity that submitted this contribution, or return to your list.',
      '<a class="button secondary" href="#contributions">View contributions</a>',
    );

  const steps = [
    ['Submitted through GhostCommits', true, date(s.createdAt)],
    [
      'Pull request created on GitHub',
      Boolean(s.pr),
      s.pr
        ? `PR #${s.pr.number} · bot attribution`
        : 'PR creation is pending. You can retry with the same submission.',
    ],
    [
      'Merge checked against GitHub',
      Boolean(s.evidence?.merged),
      s.evidence?.merged
        ? `Checked ${date(s.evidence.checkedAt)}`
        : s.status === 'closed'
          ? 'This PR was closed without merging.'
          : 'Awaiting maintainer merge on GitHub.',
    ],
    [
      'Reward claim cryptographically signed',
      Boolean(s.claim),
      s.claim ? 'Ownership signature verified on server.' : 'Available after merge verification.',
    ],
    [
      'Transaction ID recorded — unverified',
      Boolean(s.claim?.txid),
      s.claim?.txid
        ? 'Transaction recorded. Verify receipt in your Noir / Zcash wallet.'
        : 'Sponsor approval and a shielded testnet transfer are required.',
    ],
  ];

  return `
    <a class="back-link" href="#contributions">${icon('back')} My contributions</a>
    ${pageHeading(e(s.title), e(s.repository), s.pr ? link(s.pr.url, 'View PR on GitHub', 'button secondary') : '')}
    <div class="detail-grid">
      <section class="panel">
        <div class="section-heading">
          <h2>Contribution lifecycle</h2>
          ${status(s)}
        </div>
        <ol class="timeline">
          ${steps
            .map(
              ([title, done, description]) => `
            <li class="${done ? 'completed' : ''}">
              <span class="timeline-marker">${icon(done ? 'check' : 'clock')}</span>
              <div>
                <h3>${title}</h3>
                <p>${e(description)}</p>
              </div>
            </li>
          `,
            )
            .join('')}
        </ol>
        <div class="detail-actions">
          ${s.pr ? `<button class="button secondary" data-action="verify" data-id="${e(s.id)}">${icon('branch')} Check merge status</button>` : `<button class="button secondary" data-action="retry-pr" data-id="${e(s.id)}">Retry PR creation</button>`}
        </div>
        ${s.pr && s.status === 'in-review' ? `<details class="evidence"><summary>Revise this contribution</summary><p>Read maintainer feedback on the public PR, then replace the same file here. Your Ghost remains the owner.</p>${link(s.pr.url, 'Read PR feedback')}<form class="revision-form" data-id="${e(s.id)}"><label>Updated ${e(s.path)}<textarea name="content" required maxlength="120000" rows="14" spellcheck="false">${e(s.content)}</textarea></label><button class="button primary">Update existing PR</button></form></details>` : ''}
        ${
          s.evidence?.sha
            ? `
          <details class="evidence">
            <summary>View recorded merge evidence</summary>
            <dl>
              <dt>Repository</dt><dd>${e(s.repository)}</dd>
              <dt>Merge commit SHA</dt><dd class="mono break-all">${e(s.evidence.sha)}</dd>
              <dt>Verified timestamp</dt><dd>${e(s.evidence.checkedAt)}</dd>
            </dl>
          </details>
        `
            : ''
        }
      </section>
      <aside class="panel reward-panel">
        <h3>Contribution reward</h3>
        ${reward(s.terms?.amount || state.config.bounty.amount)}
        <hr/>
        ${
          s.claim
            ? `
          ${status(s.claim)}
          <p class="small muted">
            ${s.claim.status === 'rejected' ? `Not selected: ${e(s.claim.reason)}` : s.claim.status === 'awaiting-sponsor' ? 'Your signed claim is queued for sponsor approval.' : s.claim.status === 'payment-reserved' ? 'The sponsor has reserved this payout.' : 'A transaction ID has been recorded. Check your wallet history.'}
          </p>
          ${s.claim.txid ? `<code class="fingerprint">${e(s.claim.txid)}</code>` : ''}
        `
            : (state.config.bounties?.find((b) => b.id === s.bountyId) || state.config.bounty)
                  .awardAvailable === false
              ? `
          <p class="muted small">This bounty's single award has already been claimed.</p>
        `
              : s.evidence?.merged
                ? `
          <form id="claim-form" data-id="${e(s.id)}">
            <label>
              Shielded testnet address
              <input name="address" required placeholder="ztestsapling1…" autocomplete="off" spellcheck="false"/>
            </label>
            <p class="small muted">Use a unified (utest1) or Sapling testnet address. The sponsor sees this address to authorize payment.</p>
            <button type="button" class="button secondary full" data-action="recipient-wallet">Use my Noir Wallet address</button>
            <button class="button primary full">${icon('key')} Review reward claim</button>
          </form>
        `
                : `
          <p class="muted small">Once the merge is verified, sign a claim with the identity that authored this patch.</p>
        `
        }
      </aside>
    </div>
  `;
}

export function sponsorView(state) {
  const heading = pageHeading(
    'Back the work that matters.',
    'Review verified merged contributions and authorize shielded testnet rewards.',
  );
  if (!state.sponsorToken && !state.maintainer)
    return `
      ${heading}
      <div class="sponsor-login panel">
        <span class="empty-icon">${icon('wallet')}</span>
        <h2>Sponsor Desk</h2>
        <p>Publish a bounty for your repository.</p>
        ${guidance('Maintainer setup', 'Sign in with your own GitHub account, install the bot on a repository you maintain, and publish a testnet bounty. Contributors use a separate Ghost identity; maintainers sign in with GitHub to manage repositories.')}
        ${state.config.maintainerConfigured ? '<a class="button primary full" href="/api/github/login">Continue with GitHub</a>' : '<p class="notice amber">GitHub sign-in is awaiting site configuration. The operator must add the GitHub App credentials in Netlify.</p>'}
        ${state.config.sponsorConfigured ? '<details><summary>Legacy operator access</summary><form id="sponsor-login"><label>Access key<input name="token" type="password" required autocomplete="off"/></label><button class="button secondary">Open operator desk</button></form></details>' : ''}
      </div>
    `;

  return `
    ${heading}
    ${
      state.maintainer
        ? maintainerSetup(state)
        : `    <section class="panel"><h2>Connect your GitHub repository</h2><p>Install GhostCommits on ${e(state.config.bounty.repository)} to let the bot open pull requests. Contributors keep their Ghost identities.</p><p>${badge(state.config.bounty.configured ? 'Repository connected' : 'Connection not checked', state.config.bounty.configured ? 'green' : 'neutral')}</p>${state.config.githubAppConfigured ? `<div class="form-actions"><button class="button secondary" data-action="connect-github">Connect GitHub</button><button class="button secondary" data-action="check-github">Check connection</button></div>${state.githubInstallUrl ? `<p>${link(state.githubInstallUrl, 'Continue on GitHub', 'button primary')}</p><p class="small muted">Choose the repository on GitHub, approve installation, then return here and check the connection.</p>` : ''}` : '<p>Server setup is required. Follow docs/GITHUB_APP_SETUP.md to register your GitHub App and configure its credentials.</p>'}</section>
`
    }
    <div class="sponsor-toolbar">
      <span>${badge(state.wallet ? 'Noir Wallet connected' : 'Wallet disconnected', state.wallet ? 'green' : 'neutral')}${state.walletBalance ? `<span class="small muted">Shielded balance: ${e(state.walletBalance.shielded)} testnet ZEC</span>` : ''}</span>
      <div class="sponsor-actions">
        <button class="button secondary" data-action="connect-wallet">${icon('wallet')} ${state.wallet ? 'Reconnect Noir Wallet' : 'Connect Noir Wallet'}</button>
        <button class="button secondary" data-action="refresh-sponsor">Refresh claims</button>
        <button class="text-button" data-action="lock-sponsor">Lock desk</button>
      </div>
    </div>
    <div class="notice">
      ${icon('info')}
      <p>Payments use shielded testnet funds and require confirmation in Noir Wallet. A reservation blocks repeat payment attempts in this app. After an interruption, reconcile wallet history before taking further action.</p>
    </div>
    ${
      state.claims.length
        ? state.claims
            .map(
              (claim) => `
      <article class="panel sponsor-claim">
        <div class="card-top">
          <h2>${e(claim.submission?.title || 'Contribution reward')}</h2>
          ${status(claim)}
        </div>
        <div class="sponsor-claim-grid">
          <div>
            ${repo(claim.submission.repository)}
            <p>Verified merged PR #${e(claim.submission.pr.number)}</p>
            ${link(claim.submission.pr.url, 'Review contribution on GitHub', 'quiet-link')}
            <label class="address-label">
              Receiving shielded address
              <code>${e(claim.address)}</code>
            </label>
          </div>
          <div>
            ${reward(claim.amount)}
            ${
              claim.status === 'awaiting-sponsor'
                ? `
              <button class="button primary full" data-action="pay" data-id="${e(claim.id)}" ${!state.wallet ? 'disabled' : ''}>
                ${icon('wallet')} Approve in wallet
              </button>
              <p class="small muted">Selecting reserves this bounty's only award, then opens Noir Wallet for approval.</p>
              <form class="reject-form" data-id="${e(claim.id)}"><label>Reason for declining<input name="reason" required maxlength="1000"/></label><button class="button secondary full">Decline claim</button></form>
            `
                : claim.status === 'payment-reserved'
                  ? `
              <form class="record-form" data-id="${e(claim.id)}">
                <label>
                  Transaction ID
                  <input name="txid" required pattern="[a-fA-F0-9]{64}" placeholder="64-character transaction ID" value="${e(state.pendingTx[claim.id] || '')}"/>
                </label>
                <button class="button secondary full">Record transaction</button>
                <p class="small muted">Record a transaction already broadcasted.</p>
              </form>
            `
                  : claim.status === 'rejected'
                    ? `<p>Not selected: ${e(claim.reason)}</p>`
                    : `
              <code class="fingerprint">${e(claim.txid)}</code>
              <p class="small muted">Recorded, not independently confirmed. Verify receipt in the recipient wallet.</p>
            `
            }
          </div>
        </div>
      </article>
    `,
            )
            .join('')
        : empty(
            'wallet',
            'No claims waiting',
            'Signed claims will appear here once contributors verify their merged pull requests.',
          )
    }
  `;
}

export function privacyView() {
  return `
    ${pageHeading('Privacy, with clear boundaries.', 'Understand exactly what is public on GitHub, what stays local in your browser, and who sees the rest.')}
    <div class="privacy-document panel">
      <h2>Public code. Cryptographic pseudonymity.</h2>
      <p>GhostCommits creates contributions through an authorized GitHub bot. Your personal GitHub account is not required. Code, file names, PR text, and commit diffs are visible to people with repository access, including everyone if the repository is public. Personal information embedded in your code could still identify you.</p>
      <div class="privacy-table">
        <div>
          <strong>Your browser</strong>
          <span>Your private signing key is stored locally in browser storage. A compromised browser or device can expose it. Recovery exports contain this private key in unencrypted form.</span>
        </div>
        <div>
          <strong>GhostCommits server</strong>
          <span>The server stores public keys, submitted drafts, merge evidence, and recipient testnet addresses. It can observe client IP addresses and timestamps.</span>
        </div>
        <div>
          <strong>GitHub</strong>
          <span>Pull requests are opened by the repository bot. Repository visibility controls access to source code, commits, and comments.</span>
        </div>
        <div>
          <strong>Bounty sponsor</strong>
          <span>The sponsor sees the verified patch, your signed claim, the reward amount, and the destination address to approve testnet payout.</span>
        </div>
        <div>
          <strong>Zcash network</strong>
          <span>The app requests a transfer from shielded testnet funds to a shielded testnet address through Noir Wallet. It does not independently verify broadcast, shielding, confirmation, or receipt. Check the wallet for payment evidence.</span>
        </div>
      </div>
      <h2>Identity persistence</h2>
      <p>Using the same Ghost key links your submissions in this workspace. Signatures prove control of that key, not original authorship of the code. History depends on the operator retaining server records; a recovery key alone does not restore those records. Public portfolios and independently verifiable credentials are not included. The operator, identifying code, or network information can still link activity to you.</p>
      <h2>Safe recovery practices</h2>
      <p>Always back up your recovery key file. If you switch browsers or clear your storage without an export, you lose control of that Ghost identity and any uncollected bounties.</p>
      <h2>Testnet environment</h2>
      <p>This software operates on Zcash testnet. Testnet ZEC has no monetary value. Treat this MVP as an experimental privacy-preserving developer workflow.</p>
    </div>
  `;
}

function maintainerSetup(state) {
  const mine = (state.config.bounties || []).filter((b) => b.maintainerId === state.maintainer.id);
  return `<section class="panel maintainer-setup"><h2>Welcome, ${e(state.maintainer.login)}</h2>
    ${guidance('Connect a repository to get started.', 'Install GhostCommits on a public repository where you have admin or maintainer access. Then refresh the list and publish a one-file task.')}
    <div class="form-actions"><button class="button secondary" data-action="connect-github">Install GitHub App</button><button class="button secondary" data-action="load-repositories">Refresh repositories</button></div>
    ${state.githubInstallUrl ? `<p>${link(state.githubInstallUrl, 'Continue installation on GitHub', 'button primary')}</p>` : ''}
    ${
      state.repositories?.length
        ? `<form id="bounty-form">
      <label>Repository<select name="repository" required>${state.repositories.map((r) => `<option value="${e(r.repository)}">${e(r.repository)}</option>`).join('')}</select></label>
      <label>Task title<input name="title" required maxlength="160" placeholder="Add a usage example to README.md"/></label>
      <label>Description<textarea name="description" required maxlength="6000" rows="3"></textarea></label>
      <label>Acceptance criteria (one per line)<textarea name="criteria" required maxlength="3000" rows="3"></textarea></label>
      <label>Testnet ZEC reward<input name="amount" type="number" min="0.00000001" max="100" step="0.00000001" value="0.01" required/></label>
      <p class="small muted">Terms are fixed when published. No funds are held in escrow.</p>
      ${guidance('How rewards are funded', 'You fund the reward from your Noir testnet wallet when selecting a merged contribution. Terms are fixed when published. No funds are held in escrow.')}
      <button class="button primary">Publish bounty</button>
    </form>`
        : '<p class="small muted">Install the app, then refresh repositories. Only active public repositories you maintain are shown.</p>'
    }
    ${mine.length ? `<h3>Your published bounties</h3>${mine.map((b) => `<p><a href="#bounty/${e(b.id)}">${e(b.title)}</a> · ${e(b.amount)} testnet ZEC</p>`).join('')}` : ''}
  </section>`;
}
