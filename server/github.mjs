import { githubRequest, installationToken } from './github-app.mjs';
function client(submission) {
  const target = submission.repository;
  if (!/^[A-Za-z0-9][\w.-]*\/[A-Za-z0-9_][\w.-]*$/.test(target))
    throw new Error('Invalid repository.');
  return async (path, method = 'GET', body) =>
    githubRequest(`/repos/${target}${path}`, await installationToken(target), method, body);
}

export async function createPullRequest(submission) {
  const github = client(submission);
  const repository = submission.repository;
  const baseBranch = submission.baseBranch || process.env.GITHUB_BASE_BRANCH || 'main';
  const branch = `ghost/${submission.id}`;
  // Look up an existing PR first: retries must not create a second contribution.
  const existing = await github(
    `/pulls?state=all&head=${encodeURIComponent(repository.split('/')[0] + ':' + branch)}`,
  );
  if (existing.length) return { number: existing[0].number, url: existing[0].html_url };
  const head = await github(`/git/ref/heads/${encodeURIComponent(baseBranch)}`);
  const commit = await github(`/git/commits/${head.object.sha}`);
  const tree = await github('/git/trees', 'POST', {
    base_tree: commit.tree.sha,
    tree: [{ path: submission.path, mode: '100644', type: 'blob', content: submission.content }],
  });
  const identity = { name: 'GhostCommits Bot', email: 'ghostcommits@users.noreply.github.com' };
  const created = await github('/git/commits', 'POST', {
    message: submission.title,
    tree: tree.sha,
    parents: [head.object.sha],
    author: identity,
    committer: identity,
  });
  try {
    await github('/git/refs', 'POST', { ref: `refs/heads/${branch}`, sha: created.sha });
  } catch (error) {
    // A previous request may have created the branch before interruption.
    const ref = await github(`/git/ref/heads/${encodeURIComponent(branch)}`).catch(() => null);
    if (!ref) throw error;
  }
  const pr = await github('/pulls', 'POST', {
    title: submission.title,
    body: `${submission.description}\n\n---\nSubmitted through GhostCommits. Personal GitHub attribution is not required.`,
    head: branch,
    base: baseBranch,
  });
  return { number: pr.number, url: pr.html_url };
}

export async function verifyMerge(submission) {
  const github = client(submission);
  const repository = submission.repository;
  const baseBranch = submission.baseBranch || process.env.GITHUB_BASE_BRANCH || 'main';
  const pr = await github(`/pulls/${submission.pr.number}`);
  if (
    pr.base?.repo?.full_name?.toLowerCase() !== submission.repository.toLowerCase() ||
    pr.base.ref !== baseBranch ||
    pr.head?.repo?.full_name?.toLowerCase() !== submission.repository.toLowerCase() ||
    pr.head.ref !== `ghost/${submission.id}` ||
    (pr.merged && !/^[a-f0-9]{40}$/i.test(pr.merge_commit_sha || ''))
  )
    throw new Error('The PR does not match this submission.');
  return {
    merged: Boolean(pr.merged),
    closed: pr.state === 'closed',
    sha: pr.merged ? pr.merge_commit_sha : null,
    checkedAt: new Date().toISOString(),
  };
}

export async function revisePullRequest(submission, content) {
  const evidence = await verifyMerge(submission);
  if (evidence.merged || evidence.closed)
    throw Object.assign(new Error('Closed or merged PRs cannot be revised.'), { status: 409 });
  const github = client(submission);
  const branch = `ghost/${submission.id}`;
  const head = await github(`/git/ref/heads/${encodeURIComponent(branch)}`);
  const commit = await github(`/git/commits/${head.object.sha}`);
  const tree = await github('/git/trees', 'POST', {
    base_tree: commit.tree.sha,
    tree: [{ path: submission.path, mode: '100644', type: 'blob', content }],
  });
  const identity = { name: 'GhostCommits Bot', email: 'ghostcommits@users.noreply.github.com' };
  const created = await github('/git/commits', 'POST', {
    message: `Revise: ${submission.title}`,
    tree: tree.sha,
    parents: [head.object.sha],
    author: identity,
    committer: identity,
  });
  await github(`/git/refs/heads/${encodeURIComponent(branch)}`, 'PATCH', {
    sha: created.sha,
    force: false,
  });
  return created.sha;
}
