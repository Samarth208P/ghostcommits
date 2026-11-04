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
  badge(labels[item.status] || item.status, item.status === 'merged' ? 'green' : 'amber');
const link = (url, title, className = '') =>
  `<a href="${e(url)}" class="${className}" target="_blank" rel="noopener noreferrer">${e(title)}${icon('external')}</a>`;
const empty = (name, title, description, action = '') =>
  `<div class="empty-state"><span class="empty-icon">${icon(name)}</span><h3>${title}</h3><p>${description}</p>${action}</div>`;
const repo = (name) => `<span class="repository">${icon('book')}<span>${e(name)}</span></span>`;
const reward = (amount) =>
  `<span class="reward-number">${e(amount)} <span>ZEC</span></span><span class="muted small">Testnet reward · no monetary value</span>`;
const pageHeading = (title, description, action = '') =>
  `<div class="page-heading"><div><h1>${title}</h1><p>${description}</p></div>${action}</div>`;
const privacyNote = () =>
  `<div class="privacy-note">${icon('shield')}<div><strong>Your work speaks for you.</strong><p>Your code is public. Your personal GitHub account isn't required. The operator can still associate submissions and payments.</p><a href="#privacy">Understand the privacy boundaries ${icon('arrow')}</a></div></div>`;

export function shell(state, content) {
  const page = state.route.split('/')[0];
  const nav = (href, name, symbol, active) =>
    `<a href="#${href}" class="nav-item ${active ? 'active' : ''}" ${active ? 'aria-current="page"' : ''}>${icon(symbol)}<span>${name}</span>${href === 'contributions' && state.submissions.length ? `<span class="nav-count">${state.submissions.length}</span>` : ''}</a>`;
  return `<a class="skip-link" href="#main">Skip to content</a><div class="app-shell"><aside class="sidebar"><a class="brand" href="#bounties"><img src="/ghost.svg" alt="" width="34" height="34"/><span>ghostcommits<span class="brand-period">.</span></span></a><div class="workspace-label">YOUR WORKSPACE</div><nav aria-label="Main navigation">${nav('bounties', 'Bounties', 'grid', ['bounties', 'bounty', 'submit'].includes(page))}${nav('contributions', 'My contributions', 'branch', page === 'contributions')}${nav('identity', 'My Ghost', 'ghost', page === 'identity')}</nav><div class="sidebar-divider"></div><nav aria-label="Resources">${nav('sponsor', 'Sponsor desk', 'wallet', page === 'sponsor')}${nav('privacy', 'Privacy & security', 'shield', page === 'privacy')}</nav><div class="sidebar-bottom"><div class="network-mini"><span class="status-dot"></span>Zcash testnet<span>v0.1</span></div><a href="#identity" class="sidebar-identity"><span class="avatar">${icon('ghost')}</span><div><strong>${state.identity ? `Ghost #${state.fingerprint.slice(0, 4)}` : 'Your next chapter'}</strong><span>${state.identity ? 'Local signing identity' : 'Create your Ghost identity'}</span></div>${icon('arrow')}</a></div></aside><div class="workspace"><header class="topbar"><div class="breadcrumb">Workspace <span>/</span> <strong>${{ bounties: 'Discover', bounty: 'Bounty details', submit: 'New contribution', contributions: 'Contributions', identity: 'My Ghost', sponsor: 'Sponsor desk', privacy: 'Privacy' }[page] || 'Discover'}</strong></div><div class="topbar-right">${badge('Testnet', 'neutral')}<a class="topbar-help" href="#privacy">${icon('lock')} Privacy by intention</a></div></header><main id="main" tabindex="-1">${state.error ? `<div class="notice error" role="alert">${icon('info')}<div>${e(state.error)} <button class="text-button" data-action="reload">Try again</button></div></div>` : ''}${content}</main><footer class="workspace-footer"><span>Build in public. Stay private.</span><span>Made for open source <span class="footer-dot">·</span> Powered by Zcash</span></footer></div></div>`;
}

export function bounties(state) {
  const b = state.config.bounty;
  return `${pageHeading('Good work. Quiet identity.', 'Find something worth building. Let your contribution do the talking.', `<a class="button secondary" href="#contributions">${icon('branch')} My contributions</a>`)}<div class="intro-strip"><div class="intro-mark">${icon('ghost')}</div><div><strong>Public contributions. Personal privacy.</strong><p>Submit through a bot, prove your work, and request a shielded reward.</p></div><a href="#identity">${state.identity ? 'View your Ghost' : 'Create your Ghost'} ${icon('arrow')}</a></div><div class="section-heading"><div class="tab-label">Available bounties <span>1</span></div><span class="muted small">${b.configured ? 'One repository. One meaningful contribution.' : 'Sample workspace · setup required'}</span></div><div class="discovery-grid"><div><a class="bounty-card" href="#bounty"><div class="card-top">${repo(b.repository)}${badge(b.configured ? 'Open' : 'Sample', b.configured ? 'green' : 'neutral')}</div><h2>${e(b.title)}</h2><p>${e(b.description)}</p><div class="tags"><span>Open source</span><span>Wallet infrastructure</span><span>Single award</span></div><div class="bounty-card-bottom"><div>${reward(b.amount)}</div><span class="card-arrow" aria-label="View bounty">${icon('arrow')}</span></div></a><div class="subtle-callout">${icon('info')}<p>${b.configured ? 'Rewards are subject to the published criteria and sponsor approval. Only verified merged work is eligible.' : 'This is a sample bounty from the product brief. Configure your GitHub repository to accept real contributions.'}</p></div><section class="recent-section"><div class="section-heading"><h2>Your contributions</h2><a class="quiet-link" href="#contributions">View all ${icon('arrow')}</a></div>${state.submissions.length ? contributionList(state.submissions.slice(0, 3)) : empty('branch', 'Your first contribution starts here', 'Pick up the bounty above. Your work will appear here once you submit it.', '<a class="text-button" href="#bounty">Explore the bounty ' + icon('arrow') + '</a>')}</section></div><aside class="context-rail"><section class="journey"><h3>A different way to contribute</h3><ol><li><span>${icon('ghost')}</span><div><strong>Make it yours</strong><p>Create an identity. Keep the key.</p></div></li><li><span>${icon('code')}</span><div><strong>Ship something useful</strong><p>A bot opens your GitHub PR.</p></div></li><li><span>${icon('shield')}</span><div><strong>Let the work count</strong><p>Verified merges build your record.</p></div></li><li><span>${icon('wallet')}</span><div><strong>Claim your reward</strong><p>Sign a claim for a private payout.</p></div></li></ol><a href="#privacy">How privacy works ${icon('arrow')}</a></section>${privacyNote()}</aside></div>`;
}

export function bountyDetail(state) {
  const b = state.config.bounty;
  return `<a class="back-link" href="#bounties">${icon('back')} All bounties</a>${pageHeading(e(b.title), 'A small contribution can make a real difference.')}<div class="detail-grid"><article class="panel bounty-detail"><div class="card-top">${repo(b.repository)}${badge(b.configured ? 'Open for contributions' : 'Sample bounty', b.configured ? 'green' : '')}</div><h2>The work</h2><p class="body-copy">${e(b.description)}</p><h2>Acceptance criteria</h2><ul class="criteria">${b.criteria.map((item) => `<li>${icon('check')}<span>${e(item)}</span></li>`).join('')}</ul><h2>How your contribution is reviewed</h2><p class="body-copy">A maintainer reviews your pull request on GitHub. Once it's merged, GhostCommits checks the merge evidence. You can then prove ownership and request the reward. The sponsor reviews the claim before authorizing a payment.</p><div class="detail-links">${b.configured ? link(`https://github.com/${b.repository}`, 'View repository', 'button secondary') : '<span class="muted small">Repository access has not been configured.</span>'}${b.issueUrl ? link(b.issueUrl, 'View issue', 'button secondary') : ''}</div></article><aside><div class="panel reward-panel"><div class="reward-label">Bounty reward</div>${reward(b.amount)}<hr/><dl><div><dt>Network</dt><dd>Zcash testnet</dd></div><div><dt>Payment</dt><dd>Shielded</dd></div><div><dt>Awards</dt><dd>One</dd></div><div><dt>Review</dt><dd>Repository maintainer</dd></div></dl><a class="button primary full" href="#${state.identity ? 'submit' : 'identity'}">${state.identity ? 'Start contribution' : 'Create identity to contribute'} ${icon('arrow')}</a><p class="small muted">Your code and PR description will be public on GitHub.</p></div>${privacyNote()}</aside></div>`;
}

export function identityView(state) {
  if (!state.identity)
    return `${pageHeading('A fresh identity. The same you.', 'Your contributions deserve a history. Your personal identity stays yours.')}<div class="onboarding panel"><div class="identity-art"><img src="/ghost.svg" alt="" width="88" height="88"/><div class="identity-orbit orbit-one"></div><div class="identity-orbit orbit-two"></div><span class="art-label">Your work, signed by you.</span></div><div class="onboarding-copy"><h2>Meet your Ghost.</h2><p>A local signing key is all you need to get started. No personal GitHub login. No email address.</p><ul class="criteria"><li>${icon('check')}<span>Prove ownership of your contributions</span></li><li>${icon('check')}<span>Build a verifiable contribution record</span></li><li>${icon('check')}<span>Sign claims for testnet rewards</span></li></ul><button class="button primary" data-action="create-identity">${icon('plus')} Create Ghost identity</button><label class="import-link">Already have a Ghost? <span>Import recovery key</span><input type="file" id="import-key" accept="application/json,.json"/></label><p class="small muted">Your key is stored in this browser. Export a recovery copy and keep it private. This identity is separate from your Zcash wallet.</p></div></div>`;
  const merged = state.submissions.filter((s) => s.evidence?.merged);
  return `${pageHeading('My Ghost', 'A record of what you build, without a personal GitHub profile.')}<div class="profile-header panel"><span class="large-avatar">${icon('ghost')}</span><div><h2>Ghost #${state.fingerprint.slice(0, 4)}</h2><p>Pseudonymous contributor <span class="footer-dot">·</span> Created ${date(state.identity.createdAt)}</p></div>${badge('Key stored locally', 'neutral')}</div>${!state.identity.backedUp ? `<div class="notice amber">${icon('key')}<div><strong>Keep a recovery copy.</strong> Losing this browser's key means losing access to your identity.</div><button class="button small-button secondary" data-action="export-key">Export key</button></div>` : ''}<div class="profile-stats"><div><strong>${merged.length}</strong><span>Verified merged PRs</span></div><div><strong>${new Set(merged.map((s) => s.repository)).size}</strong><span>Repositories contributed to</span></div><div><strong>${state.submissions.filter((s) => s.claim).length}</strong><span>Reward claims</span></div></div><div class="detail-grid"><section><div class="section-heading"><h2>Contribution record</h2></div>${state.submissions.length ? contributionList(state.submissions) : empty('branch', 'A blank page, full of possibility', 'Verified merged contributions will appear here. There are no quality scores or shortcuts.', '<a href="#bounties" class="button secondary">Find your first bounty ' + icon('arrow') + '</a>')}</section><aside class="panel key-panel"><h3>Identity & recovery</h3><p>Your public-key fingerprint identifies this Ghost. It is safe to share.</p><code class="fingerprint">${e(state.fingerprint.match(/.{1,8}/g).join(' '))}</code><button class="button secondary full" data-action="export-key">${icon('download')} Export recovery key</button><label class="import-link">Restore another identity<input type="file" id="import-key" accept="application/json,.json"/></label><p class="small muted">Importing replaces the active identity in this browser. Export your current key first. Reusing one identity links your contributions together.</p></aside></div>`;
}

export function submitView(state) {
  if (!state.identity) return identityView(state);
  const d = state.draft;
  return `<a class="back-link" href="#bounty">${icon('back')} Bounty details</a>${pageHeading('Make your contribution.', 'One file. A useful change. Your own private identity.')}<div class="step-tabs"><span class="${!state.review ? 'selected' : ''}"><b>1</b> Prepare contribution</span><span class="${state.review ? 'selected' : ''}"><b>2</b> Review & publish</span></div><div class="editor-layout"><section class="panel editor-panel">${state.review ? `<div class="editor-heading"><h2>${e(d.title)}</h2>${badge('Review', 'neutral')}</div><p class="body-copy">${e(d.description)}</p><div class="code-header">${icon('code')} ${e(d.path)} <span>Complete replacement contents</span></div><pre class="code-preview"><code>${e(d.content)}</code></pre><div class="notice amber">${icon('info')}<p>This replaces the selected file in a new branch. This preview shows your complete submitted file, not a diff against GitHub. Check names, emails, credentials, and identifying URLs.</p></div><form id="publish-form"><label class="checkbox-label"><input type="checkbox" required/> I reviewed the file and PR text for private information.</label><div class="form-actions"><button type="button" class="button secondary" data-action="edit-draft">${icon('back')} Back to editing</button><button class="button primary" ${!state.config.bounty.configured ? 'disabled' : ''}>Create GitHub PR ${icon('arrow')}</button></div></form>` : `<form id="contribution-form"><label>Pull request title<input name="title" required maxlength="160" placeholder="Improve reconnect handling during wallet sync" value="${e(d.title)}"/></label><label>Description<textarea name="description" rows="3" required maxlength="6000" placeholder="What changes, and why does it matter?">${e(d.description)}</textarea></label><label>Destination file<span class="field-hint">A relative path within the repository. Submit the complete file contents.</span><input name="path" class="mono" required maxlength="240" placeholder="src/sync/reconnect.ts" value="${e(d.path)}"/></label><label>File contents<textarea name="content" class="code-input" rows="14" required maxlength="120000" spellcheck="false" placeholder="// Your contribution begins here">${e(d.content)}</textarea></label><div class="form-actions"><span class="small muted">Draft stays in memory in this tab.</span><button class="button primary">Review contribution ${icon('arrow')}</button></div></form>`}</section><aside class="context-rail"><div class="submission-context"><h3>Contributing to</h3>${repo(state.config.bounty.repository)}<p>${e(state.config.bounty.title)}</p><hr/><div class="privacy-columns"><h4>${icon('external')} Public on GitHub</h4><p>Code, file path, title, description, bot attribution, and review history.</p><h4>${icon('lock')} Kept out of the PR</h4><p>Your signing key, personal GitHub account, and receiving address.</p></div></div>${!state.config.bounty.configured ? '<div class="notice amber">GitHub is not configured. You can prepare and review your work, but publishing is disabled.</div>' : ''}</aside></div>`;
}

function contributionList(items) {
  return `<div class="contribution-list">${items.map((s) => `<a class="contribution-row" href="#contributions/${e(s.id)}"><span class="row-icon ${s.evidence?.merged ? 'green' : ''}">${icon(s.evidence?.merged ? 'check' : 'branch')}</span><div class="row-content"><strong>${e(s.title)}</strong><span>${e(s.repository)} <span class="footer-dot">·</span> ${s.pr ? `#${s.pr.number}` : 'PR pending'} <span class="footer-dot">·</span> ${date(s.createdAt)}</span></div>${status(s)}${icon('arrow')}</a>`).join('')}</div>`;
}

export function contributionsView(state) {
  const id = state.route.split('/')[1];
  if (!id)
    return `${pageHeading('Your work, in the open.', 'Follow each contribution from the first submission to the reward claim.', '<a href="#bounties" class="button primary">' + icon('plus') + ' New contribution</a>')}${state.submissions.length ? contributionList(state.submissions) : empty('branch', 'Nothing submitted. Yet.', 'Your pull requests, merge evidence, and reward claims will all live here.', '<a class="button secondary" href="#bounties">Explore bounties ' + icon('arrow') + '</a>')}`;
  const s = state.submissions.find((item) => item.id === id);
  if (!s)
    return empty(
      'info',
      'Contribution not found',
      'Switch to the identity that submitted this contribution, or return to your list.',
      '<a class="button secondary" href="#contributions">View contributions</a>',
    );
  const steps = [
    ['Submitted through GhostCommits', true, date(s.createdAt)],
    [
      'Pull request created',
      Boolean(s.pr),
      s.pr
        ? `PR #${s.pr.number} · bot attribution`
        : 'Creation is pending. Retry with the same submission.',
    ],
    [
      'Merge verified',
      Boolean(s.evidence?.merged),
      s.evidence?.merged
        ? `Checked ${date(s.evidence.checkedAt)}`
        : s.status === 'closed'
          ? 'This PR was closed without merging.'
          : 'Awaiting a maintainer merge on GitHub.',
    ],
    [
      'Reward claim signed',
      Boolean(s.claim),
      s.claim ? 'Ownership signature verified.' : 'Available after merge verification.',
    ],
    [
      'Payment recorded',
      Boolean(s.claim?.txid),
      s.claim?.txid
        ? 'Transaction recorded. Confirmation has not been independently verified.'
        : 'Sponsor approval and a shielded testnet transfer are required.',
    ],
  ];
  return `<a class="back-link" href="#contributions">${icon('back')} My contributions</a>${pageHeading(e(s.title), e(s.repository), s.pr ? link(s.pr.url, 'View on GitHub', 'button secondary') : '')}<div class="detail-grid"><section class="panel"><div class="section-heading"><h2>Contribution progress</h2>${status(s)}</div><ol class="timeline">${steps.map(([title, done, description]) => `<li class="${done ? 'completed' : ''}"><span class="timeline-marker">${icon(done ? 'check' : 'clock')}</span><div><h3>${title}</h3><p>${e(description)}</p></div></li>`).join('')}</ol>${s.pr ? `<button class="button secondary" data-action="verify" data-id="${e(s.id)}">${icon('branch')} Check merge status</button>` : `<button class="button secondary" data-action="retry-pr" data-id="${e(s.id)}">Retry PR creation</button>`}${s.evidence?.sha ? `<details class="evidence"><summary>View merge evidence</summary><dl><dt>Repository</dt><dd>${e(s.repository)}</dd><dt>Merge commit</dt><dd class="mono">${e(s.evidence.sha)}</dd><dt>Checked at</dt><dd>${e(s.evidence.checkedAt)}</dd></dl></details>` : ''}</section><aside class="panel reward-panel"><h3>Contribution reward</h3>${reward(state.config.bounty.amount)}<hr/>${s.claim ? `${status(s.claim)}<p class="small muted">${s.claim.status === 'awaiting-sponsor' ? 'Your signed claim is waiting for sponsor review.' : s.claim.status === 'payment-reserved' ? 'The sponsor has reserved this payout. It may require reconciliation before recording.' : 'A transaction ID has been recorded. This is not proof that funds arrived. Check your receiving wallet.'}</p>${s.claim.txid ? `<code class="fingerprint">${e(s.claim.txid)}</code>` : ''}` : s.evidence?.merged ? `<form id="claim-form" data-id="${e(s.id)}"><label>Shielded testnet address<input name="address" required placeholder="ztestsapling1…" autocomplete="off" spellcheck="false"/></label><p class="small muted">Use a Sapling testnet address. The sponsor and service operator can see this address.</p><button class="button primary full">${icon('key')} Review reward claim</button></form>` : '<p class="muted">Once the merge is verified, sign a claim with the identity that submitted this work.</p>'}</aside></div>`;
}

export function sponsorView(state) {
  const heading = pageHeading(
    'Back the work that matters.',
    'Review verified contributions and authorize shielded testnet rewards.',
  );
  if (!state.sponsorToken)
    return `${heading}<div class="sponsor-login panel"><span class="empty-icon">${icon('wallet')}</span><h2>Your sponsor desk</h2><p>Use the sponsor access key configured on your server. It stays in memory for this tab.</p><form id="sponsor-login"><label>Sponsor access key<input name="token" type="password" required autocomplete="off" placeholder="Enter your sponsor key"/></label><button class="button primary full">Open sponsor desk ${icon('arrow')}</button></form>${!state.config.sponsorConfigured ? '<p class="small muted">Set SPONSOR_TOKEN in your .env file to enable access.</p>' : ''}</div>`;
  return `${heading}<div class="sponsor-toolbar"><span>${badge(state.wallet ? 'Testnet wallet connected' : 'Wallet not connected', state.wallet ? 'green' : 'neutral')}</span><div><button class="button secondary" data-action="connect-wallet">${icon('wallet')} ${state.wallet ? 'Reconnect wallet' : 'Connect Noir Wallet'}</button><button class="button secondary" data-action="refresh-sponsor">Refresh claims</button><button class="text-button" data-action="lock-sponsor">Lock desk</button></div></div><div class="notice">${icon('info')}<p>Payments use shielded funds and require approval in Noir Wallet. A reservation blocks repeat payment attempts. If a wallet operation is interrupted, reconcile its history before recording the transaction. No automatic retry sends funds.</p></div>${state.claims.length ? state.claims.map((claim) => `<article class="panel sponsor-claim"><div class="card-top"><h2>${e(claim.submission?.title || 'Contribution reward')}</h2>${status(claim)}</div><div class="sponsor-claim-grid"><div>${repo(claim.submission.repository)}<p>Verified merged PR #${claim.submission.pr.number}</p>${link(claim.submission.pr.url, 'Review contribution', 'quiet-link')}<label class="address-label">Receiving address<code>${e(claim.address)}</code></label></div><div>${reward(claim.amount)}${claim.status === 'awaiting-sponsor' ? `<button class="button primary full" data-action="pay" data-id="${e(claim.id)}" ${!state.wallet ? 'disabled' : ''}>${icon('wallet')} Approve in wallet</button><p class="small muted">By approving, you accept this work for the bounty. The wallet will show the destination and amount.</p>` : claim.status === 'payment-reserved' ? `<form class="record-form" data-id="${e(claim.id)}"><label>Transaction ID<input name="txid" required pattern="[a-fA-F0-9]{64}" placeholder="64-character transaction ID" value="${e(state.pendingTx[claim.id] || '')}"/></label><button class="button secondary full">Record transaction</button><p class="small muted">Record a transaction already sent. This does not verify confirmation.</p></form>` : `<code class="fingerprint">${e(claim.txid)}</code><p class="small muted">Recorded, not independently confirmed. Verify receipt in the recipient wallet.</p>`}</div></div></article>`).join('') : empty('wallet', 'No claims waiting', 'Signed claims appear here after contributors verify their merged work.')}`;
}

export function privacyView() {
  return `${pageHeading('Privacy, with clear boundaries.', 'Know what is public, what stays local, and who can see the rest.')}<div class="privacy-document panel"><h2>Public work. Pseudonymous attribution.</h2><p>GhostCommits creates contributions through a bot. Your personal GitHub account is not required, but the code, file names, PR description, review history, and merge history remain public. Names and other clues inside your changes can still identify you.</p><div class="privacy-table"><div><strong>Your browser</strong><span>Your private signing key stays in local browser storage. A compromised browser or device can expose it. Recovery exports contain the private key.</span></div><div><strong>GhostCommits operator</strong><span>The operator stores public keys, contributions, claims, and receiving addresses, and can observe network metadata. Operator anonymity is not provided.</span></div><div><strong>GitHub</strong><span>Changes use bot attribution. Source code, PR text, commit contents, and review activity are public.</span></div><div><strong>Bounty sponsor</strong><span>The sponsor sees the accepted contribution, signed claim, amount, and receiving address to authorize payment.</span></div><div><strong>Zcash</strong><span>The wallet requests shielded testnet funding to a shielded recipient. Transaction recording does not independently establish confirmation or receipt.</span></div></div><h2>Your identity is persistent</h2><p>Using the same Ghost across contributions links those activities. A verified merge count is a record of accepted work, not a quality score or a trustless proof of GitHub history.</p><h2>Keep your recovery key private</h2><p>Export a recovery copy before clearing browser storage or switching identities. Anyone with that file can sign as your Ghost. Do not send it to a maintainer, sponsor, or the service operator.</p><h2>A testnet MVP</h2><p>This application does not provide production anonymity, trustless escrow, zero-knowledge reputation, or mainnet payments. Protect sensitive source material and credentials before publishing.</p></div>`;
}
