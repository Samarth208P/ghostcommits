import { githubRequest, installationToken } from './github-app.mjs';
const repository = process.env.GITHUB_REPOSITORY || '';
const baseBranch = process.env.GITHUB_BASE_BRANCH || 'main';
async function github(path, method = 'GET', body) {
  return githubRequest(`/repos/${repository}${path}`, await installationToken(), method, body);
}

export async function createPullRequest(submission) {
  if (submission.repository.toLowerCase() !== repository.toLowerCase())
    throw new Error('This contribution belongs to a different configured repository.');
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
  if (submission.repository.toLowerCase() !== repository.toLowerCase())
    throw new Error('This contribution belongs to a different configured repository.');
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
