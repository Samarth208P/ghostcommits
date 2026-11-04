const repository = process.env.GITHUB_REPOSITORY || '';
const baseBranch = process.env.GITHUB_BASE_BRANCH || 'main';
export const githubReady = Boolean(process.env.GITHUB_TOKEN && /^[\w.-]+\/[\w.-]+$/.test(repository));

async function github(path, method = 'GET', body) {
  if (!githubReady) throw Object.assign(new Error('Configure GITHUB_TOKEN and GITHUB_REPOSITORY before submitting.'), { status: 503 });
  const response = await fetch(`https://api.github.com/repos/${repository}${path}`, {
    method,
    headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw Object.assign(new Error(`GitHub returned ${response.status}. Check repository access and branch configuration.`), { status: 502 });
  return response.json();
}

export async function createPullRequest(submission) {
  const branch = `ghost/${submission.id}`;
  // Look up an existing PR first: retries must not create a second contribution.
  const existing = await github(`/pulls?state=all&head=${encodeURIComponent(repository.split('/')[0] + ':' + branch)}`);
  if (existing.length) return { number: existing[0].number, url: existing[0].html_url };
  const head = await github(`/git/ref/heads/${encodeURIComponent(baseBranch)}`);
  const commit = await github(`/git/commits/${head.object.sha}`);
  const tree = await github('/git/trees', 'POST', { base_tree: commit.tree.sha, tree: [{ path: submission.path, mode: '100644', type: 'blob', content: submission.content }] });
  const identity = { name: 'GhostCommits Bot', email: 'ghostcommits@users.noreply.github.com' };
  const created = await github('/git/commits', 'POST', { message: submission.title, tree: tree.sha, parents: [head.object.sha], author: identity, committer: identity });
  try { await github('/git/refs', 'POST', { ref: `refs/heads/${branch}`, sha: created.sha }); }
  catch (error) {
    // A previous request may have created the branch before interruption.
    const ref = await github(`/git/ref/heads/${encodeURIComponent(branch)}`).catch(() => null);
    if (!ref) throw error;
  }
  const pr = await github('/pulls', 'POST', { title: submission.title, body: `${submission.description}\n\n---\nSubmitted through GhostCommits. Personal GitHub attribution is not required.`, head: branch, base: baseBranch });
  return { number: pr.number, url: pr.html_url };
}

export async function verifyMerge(submission) {
  const pr = await github(`/pulls/${submission.pr.number}`);
  if (pr.base.repo.full_name.toLowerCase() !== submission.repository.toLowerCase() || pr.head.ref !== `ghost/${submission.id}`) throw new Error('The PR does not match this submission.');
  return { merged: Boolean(pr.merged), closed: pr.state === 'closed', sha: pr.merged ? pr.merge_commit_sha : null, checkedAt: new Date().toISOString() };
}
