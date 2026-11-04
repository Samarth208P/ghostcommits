import { test, expect } from '@playwright/test';

const bounty = {
  id: 'bounty-a',
  title: 'Add README usage example',
  description: 'Document a complete example.',
  criteria: ['Valid Markdown', 'One example'],
  repository: 'owner/demo',
  amount: '0.01',
  configured: true,
  awardAvailable: true,
  maintainerId: '1',
  maintainerLogin: 'demo-maintainer',
};
async function mockApi(page, user = null, items = [bounty]) {
  const calls = [];
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const data = route.request().postDataJSON();
    calls.push({ path, data });
    let result;
    if (path === '/api/config')
      result = { bounty, bounties: items, maintainerConfigured: true, githubAppConfigured: true };
    else if (path === '/api/maintainer') result = { user };
    else if (path === '/api/sponsor/claims' || path === '/api/submissions') result = [];
    else if (path === '/api/sponsor/repositories')
      result = [{ repository: 'owner/demo', baseBranch: 'main' }];
    else if (path === '/api/sponsor/bounties') {
      result = { ...bounty, ...data, criteria: data.criteria.split('\n'), id: 'new-bounty' };
      items.push(result);
    } else if (path === '/api/auth/challenge')
      result = { id: 'challenge', message: 'test login challenge' };
    else if (path === '/api/auth/verify') result = { token: 'test-session' };
    else if (path === '/api/maintainer/logout') result = { ok: true };
    else throw new Error(`Unexpected API request: ${path}`);
    await route.fulfill({ json: result });
  });
  return calls;
}

test('visitors see real bounties and GitHub sign-in', async ({ page }) => {
  await mockApi(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: bounty.title })).toBeVisible();
  await page.getByRole('link', { name: /Publish a bounty/ }).click();
  await expect(page.getByRole('link', { name: 'Continue with GitHub' })).toHaveAttribute(
    'href',
    '/api/github/login',
  );
  await expect(page.locator('input[name=token]')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText('Set SPONSOR_TOKEN');
});

test('maintainer publishes a bounty and logs out', async ({ page }) => {
  const calls = await mockApi(page, { id: '1', login: 'demo-maintainer' }, []);
  await page.goto('/#sponsor');
  await expect(page.getByRole('heading', { name: 'Welcome, demo-maintainer' })).toBeVisible();
  await page.getByRole('button', { name: 'Refresh repositories' }).click();
  await page.getByLabel('Task title').fill('Document the CLI');
  await page.getByLabel('Description', { exact: true }).fill('Add a runnable example.');
  await page.getByLabel('Acceptance criteria').fill('Runs successfully\nOnly README changes');
  await page.getByRole('button', { name: 'Publish bounty' }).click();
  await expect(page).toHaveURL(/#bounty\/new-bounty$/);
  await expect(page.getByRole('heading', { name: 'Document the CLI' })).toBeVisible();
  expect(calls.find((c) => c.path === '/api/sponsor/bounties').data.repository).toBe('owner/demo');
  await page.goto('/#sponsor');
  await page.getByRole('button', { name: 'Lock desk' }).click();
  await expect(page.getByRole('link', { name: 'Continue with GitHub' })).toBeVisible();
  expect(calls.some((c) => c.path === '/api/maintainer/logout')).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
});

test('Ghost creation and second-bounty draft preserve the target', async ({ page }) => {
  const second = {
    ...bounty,
    id: 'bounty-b',
    repository: 'other/project',
    title: 'Second repository task',
  };
  await mockApi(page, null, [bounty, second]);
  await page.goto('/#identity');
  await page.locator('[data-action="create-identity"]').click();
  await expect(page.getByRole('button', { name: 'Export recovery key' })).toBeVisible();
  await page.goto('/#bounty/bounty-b');
  await page.getByRole('link', { name: 'Start contribution' }).click();
  await expect(page).toHaveURL(/#submit\/bounty-b$/);
  await expect(page.locator('main')).toContainText('other/project');
  await page.locator('input[name="title"]').fill('My documentation patch');
  await page.locator('textarea[name="description"]').fill('Explain the usage.');
  await page.locator('input[name="path"]').fill('README.md');
  await page.locator('textarea[name="content"]').fill('# Example\nA complete example.');
  await page
    .locator('#contribution-form button[type="submit"], #contribution-form button:not([type])')
    .click();
  await expect(page.locator('#publish-form')).toBeVisible();
  await expect(page.locator('main')).toContainText('other/project');
  await expect(page.locator('main')).toContainText('A complete example.');
});
