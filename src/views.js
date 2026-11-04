import { icon } from './icons.js';

export const escape = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );
const e = escape;
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
  'awaiting-sponsor': 'Awaiting sponsor',
  'payment-reserved': 'Payment reserved',
  'recorded-unverified': 'Transaction unverified',
};
export const badge = (label, tone = '') =>
  `<span class="badge ${tone}"><span class="status-dot"></span>${e(label)}</span>`;
const status = (item) =>
  badge(labels[item.status] || item.status, item.status === 'merged' ? 'green' : item.status === 'closed' ? 'neutral' : 'amber');
const link = (url, title, className = '') =>
  `<a href="${e(url)}" class="${className}" target="_blank" rel="noopener noreferrer">${e(title)}${icon('external')}</a>`;
const empty = (name, title, description, action = '') =>
  `<div class="empty-state"><span class="empty-icon">${icon(name)}</span><h3>${title}</h3><p>${description}</p>${action}</div>`;
const repo = (name) => `<span class="repository">${icon('book')}<span>${e(name)}</span></span>`;
const reward = (amount) =>
  `<div class="reward-wrap"><span class="reward-number">${e(amount)} <span class="reward-currency">ZEC</span></span><span class="muted small reward-note">Shielded testnet reward · no monetary value</span></div>`;
const pageHeading = (title, description, action = '') =>
  `<div class="page-heading"><div><h1>${title}</h1><p>${description}</p></div>${action}</div>`;
const privacyNote = () =>
  `<div class="privacy-note">${icon('shield')}<div><strong>Your work speaks for you.</strong><p>Your code is public. Your personal GitHub account isn't required. The operator can still associate submissions and payments.</p><a href="#privacy">Understand privacy boundaries ${icon('arrow')}</a></div></div>`;

export function shell(state, content) {
  const page = state.route.split('/')[0];
  const nav = (href, name, symbol, active) =>
    `<a href="#${href}" class="nav-item ${active ? 'active' : ''}" ${active ? 'aria-current="page"' : ''}>${icon(symbol)}<span>${name}</span>${href === 'contributions' && state.submissions.length ? `<span class="nav-count">${state.submissions.length}</span>` : ''}</a>`;
  return `
    <a class="skip-link" href="#main">Skip to content</a>
    <div class="app-shell">
      <aside class="sidebar">
        <a class="brand" href="#bounties">
          <div class="brand-gem-wrap">
            <img src="/ghost.svg" alt="" width="32" height="32"/>
            <div class="brand-gem"></div>
          </div>
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
          <div class="breadcrumb">
            <span>Workspace</span>
            <span class="breadcrumb-slash">/</span>
            <strong>${{ bounties: 'Discover', bounty: 'Bounty details', submit: 'New contribution', contributions: 'Contributions', identity: 'My Ghost', sponsor: 'Sponsor desk', privacy: 'Privacy dossier' }[page] || 'Discover'}</strong>
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
        <p>Submit one file through the repository bot, prove control of your Ghost identity, and request a sponsor-approved testnet reward.</p>
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
            <span>Shielded Sapling</span>
          </div>
          <div class="bounty-card-bottom">
            ${reward(b.amount)}
            <span class="card-arrow" aria-label="View bounty">${icon('arrow')}</span>
          </div>
        </a>
        <div class="subtle-callout">
          ${icon('info')}
          <p>${b.configured ? 'Rewards are subject to published criteria and sponsor approval. Only verified merged PRs are eligible for payout.' : 'This is a sample bounty from the product specification. Configure your GitHub repository to accept real contributions.'}</p>
        </div>
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
                <strong>Make it yours</strong>
                <p>Generate a local keypair. Keep the recovery file.</p>
              </div>
            </li>
            <li>
              <span>${icon('code')}</span>
              <div>
                <strong>Ship something useful</strong>
                <p>The bot opens your pull request without a personal GitHub login.</p>
              </div>
            </li>
            <li>
              <span>${icon('shield')}</span>
              <div>
                <strong>Let the work count</strong>
                <p>GitHub merge checks update your contribution history in this workspace.</p>
              </div>
            </li>
            <li>
              <span>${icon('wallet')}</span>
              <div>
                <strong>Claim your reward</strong>
                <p>Sign a cryptographic claim for a private testnet payout.</p>
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
        <h2>How your contribution is reviewed</h2>
        <p class="body-copy">A maintainer reviews your pull request on GitHub. Once it is merged, GhostCommits verifies the merge evidence. You can then prove ownership using your Ghost key and sign a reward claim. The sponsor reviews the claim before authorizing a shielded transfer.</p>
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
            <div><dt>Payment type</dt><dd>Shielded Sapling</dd></div>
            <div><dt>Awards</dt><dd>Single winner</dd></div>
            <div><dt>Verification</dt><dd>Maintainer merge evidence</dd></div>
          </dl>
          <a class="button primary full" href="#${state.identity ? 'submit' : 'identity'}">
            ${state.identity ? 'Start contribution' : 'Create Ghost to contribute'} ${icon('arrow')}
          </a>
          <p class="small muted">Your code and PR description are published under the bot. Repository visibility determines who can read them. Rewards require sponsor approval and are not held in escrow.</p>
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
          <div class="art-glow"></div>
          <img src="/ghost.svg" alt="" width="92" height="92"/>
          <div class="identity-orbit orbit-one"></div>
          <div class="identity-orbit orbit-two"></div>
          <span class="art-label">Your identity. Your signing key.</span>
        </div>
        <div class="onboarding-copy">
          <h2>Meet your Ghost.</h2>
          <p>A local asymmetric signing key is all you need to get started. No personal GitHub login. No email address. Your activity remains linked to your Ghost.</p>
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
    ${!state.identity.backedUp ? `
      <div class="notice amber">
        ${icon('key')}
        <div><strong>Keep a recovery copy.</strong> Losing this browser's key means losing access to your reputation and rewards.</div>
        <button class="button small-button secondary" data-action="export-key">Export key</button>
      </div>
    ` : ''}
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
        <h3>Identity & recovery</h3>
        <p>Your public-key fingerprint identifies this Ghost across bounties and claims. Safe to share publicly.</p>
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
    <a class="back-link" href="#bounty">${icon('back')} Bounty details</a>
    ${pageHeading('Make your contribution.', 'One file. A meaningful change. Published under the GitHub bot.')}
    <div class="step-tabs">
      <span class="${!state.review ? 'selected' : ''}"><b>1</b> Prepare contribution</span>
      <span class="${state.review ? 'selected' : ''}"><b>2</b> Review & publish</span>
    </div>
    <div class="editor-layout">
      <section class="panel editor-panel">
        ${state.review ? `
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
        ` : `
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
              <span class="small muted">Draft is stored locally in memory in this browser tab.</span>
              <button class="button primary">Review contribution ${icon('arrow')}</button>
            </div>
          </form>
        `}
      </section>
      <aside class="context-rail">
        <div class="submission-context panel">
          <h3>Target repository</h3>
          ${repo(state.config.bounty.repository)}
          <p class="target-title">${e(state.config.bounty.title)}</p>
          <hr/>
          <div class="privacy-columns">
            <h4>${icon('external')} Public on GitHub</h4>
            <p>Code patch, file path, title, PR description, bot commit attribution.</p>
            <h4>${icon('lock')} Kept confidential</h4>
            <p>Your private key stays in your browser. No personal GitHub login is required. The sponsor and operator can see your receiving address.</p>
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
      ${items.map((s) => `
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
      `).join('')}
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
      s.pr ? `PR #${s.pr.number} · bot attribution` : 'PR creation is pending. You can retry with the same submission.',
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
          ${steps.map(([title, done, description]) => `
            <li class="${done ? 'completed' : ''}">
              <span class="timeline-marker">${icon(done ? 'check' : 'clock')}</span>
              <div>
                <h3>${title}</h3>
                <p>${e(description)}</p>
              </div>
            </li>
          `).join('')}
        </ol>
        <div class="detail-actions">
          ${s.pr ? `<button class="button secondary" data-action="verify" data-id="${e(s.id)}">${icon('branch')} Check merge status</button>` : `<button class="button secondary" data-action="retry-pr" data-id="${e(s.id)}">Retry PR creation</button>`}
        </div>
        ${s.evidence?.sha ? `
          <details class="evidence">
            <summary>View recorded merge evidence</summary>
            <dl>
              <dt>Repository</dt><dd>${e(s.repository)}</dd>
              <dt>Merge commit SHA</dt><dd class="mono break-all">${e(s.evidence.sha)}</dd>
              <dt>Verified timestamp</dt><dd>${e(s.evidence.checkedAt)}</dd>
            </dl>
          </details>
        ` : ''}
      </section>
      <aside class="panel reward-panel">
        <h3>Contribution reward</h3>
        ${reward(state.config.bounty.amount)}
        <hr/>
        ${s.claim ? `
          ${status(s.claim)}
          <p class="small muted">
            ${s.claim.status === 'awaiting-sponsor' ? 'Your signed claim is queued for sponsor approval.' : s.claim.status === 'payment-reserved' ? 'The sponsor has reserved this payout.' : 'A transaction ID has been recorded. Check your wallet history.'}
          </p>
          ${s.claim.txid ? `<code class="fingerprint">${e(s.claim.txid)}</code>` : ''}
        ` : state.config.bounty.awardAvailable === false ? `
          <p class="muted small">This bounty's single award has already been claimed.</p>
        ` : s.evidence?.merged ? `
          <form id="claim-form" data-id="${e(s.id)}">
            <label>
              Shielded testnet address
              <input name="address" required placeholder="ztestsapling1…" autocomplete="off" spellcheck="false"/>
            </label>
            <p class="small muted">Use a Sapling testnet address. The sponsor sees this address to authorize payment.</p>
            <button class="button primary full">${icon('key')} Review reward claim</button>
          </form>
        ` : `
          <p class="muted small">Once the merge is verified, sign a claim with the identity that authored this patch.</p>
        `}
      </aside>
    </div>
  `;
}

export function sponsorView(state) {
  const heading = pageHeading(
    'Back the work that matters.',
    'Review verified merged contributions and authorize shielded testnet rewards.',
  );
  if (!state.sponsorToken)
    return `
      ${heading}
      <div class="sponsor-login panel">
        <span class="empty-icon">${icon('wallet')}</span>
        <h2>Sponsor Desk</h2>
        <p>Enter the sponsor access token configured on your server to manage claims and authorize payments.</p>
        <form id="sponsor-login">
          <label>
            Sponsor access key
            <input name="token" type="password" required autocomplete="off" placeholder="Enter your secret token"/>
          </label>
          <button class="button primary full">Open sponsor desk ${icon('arrow')}</button>
        </form>
        ${!state.config.sponsorConfigured ? '<p class="small muted">Set SPONSOR_TOKEN in your .env file to enable sponsor access.</p>' : ''}
      </div>
    `;

  return `
    ${heading}
    <section class="panel"><h2>Connect your GitHub repository</h2><p>Install GhostCommits on ${e(state.config.bounty.repository)} to let the bot open pull requests. Contributors keep their Ghost identities.</p><p>${badge(state.config.bounty.configured ? 'Repository connected' : 'Connection not checked', state.config.bounty.configured ? 'green' : 'neutral')}</p>${state.config.githubAppConfigured ? `<div class="form-actions"><button class="button secondary" data-action="connect-github">Connect GitHub</button><button class="button secondary" data-action="check-github">Check connection</button></div>${state.githubInstallUrl ? `<p>${link(state.githubInstallUrl, 'Continue on GitHub', 'button primary')}</p><p class="small muted">Choose the repository on GitHub, approve installation, then return here and check the connection.</p>` : ''}` : '<p>Server setup is required. Follow docs/GITHUB_APP_SETUP.md to register your GitHub App and configure its credentials.</p>'}</section>
    <div class="sponsor-toolbar">
      <span>${badge(state.wallet ? 'Noir Wallet connected' : 'Wallet disconnected', state.wallet ? 'green' : 'neutral')}</span>
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
    ${state.claims.length ? state.claims.map((claim) => `
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
              Receiving Sapling address
              <code>${e(claim.address)}</code>
            </label>
          </div>
          <div>
            ${reward(claim.amount)}
            ${claim.status === 'awaiting-sponsor' ? `
              <button class="button primary full" data-action="pay" data-id="${e(claim.id)}" ${!state.wallet ? 'disabled' : ''}>
                ${icon('wallet')} Approve in wallet
              </button>
              <p class="small muted">Approving signs a shielded transfer in Noir Wallet.</p>
            ` : claim.status === 'payment-reserved' ? `
              <form class="record-form" data-id="${e(claim.id)}">
                <label>
                  Transaction ID
                  <input name="txid" required pattern="[a-fA-F0-9]{64}" placeholder="64-character transaction ID" value="${e(state.pendingTx[claim.id] || '')}"/>
                </label>
                <button class="button secondary full">Record transaction</button>
                <p class="small muted">Record a transaction already broadcasted.</p>
              </form>
            ` : `
              <code class="fingerprint">${e(claim.txid)}</code>
              <p class="small muted">Recorded, not independently confirmed. Verify receipt in the recipient wallet.</p>
            `}
          </div>
        </div>
      </article>
    `).join('') : empty('wallet', 'No claims waiting', 'Signed claims will appear here once contributors verify their merged pull requests.')}
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
          <span>The app requests a transfer from shielded testnet funds to a Sapling testnet address through Noir Wallet. It does not independently verify broadcast, shielding, confirmation, or receipt. Check the wallet for payment evidence.</span>
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
