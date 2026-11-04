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

test('info help supports focus, hover, tap, and dismissal without leaving the viewport', async ({
  page,
  isMobile,
}) => {
  await mockApi(page);
  await page.goto('/');
  const trigger = page.getByRole('button', { name: 'How it works', exact: true });
  const tooltip = page.getByRole('tooltip');
  if (isMobile) await trigger.tap();
  else await trigger.hover();
  await expect(tooltip).toBeVisible();
  await expect(tooltip).toContainText('A merge does not guarantee a reward');
  await expect(trigger).toHaveAttribute('aria-describedby', 'context-help');
  expect(
    await tooltip.evaluate((element) => {
      const bounds = element.getBoundingClientRect();
      return (
        bounds.left >= 0 &&
        bounds.right <= innerWidth &&
        bounds.top >= 0 &&
        bounds.bottom <= innerHeight
      );
    }),
  ).toBe(true);
  if (!isMobile) {
    await tooltip.hover();
    await expect(tooltip).toBeVisible();
  }
  await page.keyboard.press('Escape');
  await expect(tooltip).not.toBeVisible();
  await expect(trigger).not.toHaveAttribute('aria-describedby');
  await page.getByRole('link', { name: 'Publish a bounty' }).focus();
  await trigger.focus();
  await expect(tooltip).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(tooltip).not.toBeVisible();
  await trigger.click();
  await expect(tooltip).toBeVisible();
  await trigger.click();
  await expect(tooltip).not.toBeVisible();
  await trigger.click();
  await page.locator('.page-heading h1').click();
  await expect(tooltip).not.toBeVisible();
  await trigger.click();
  await page.getByRole('link', { name: 'My Ghost', exact: true }).click();
  await expect(tooltip).not.toBeVisible();
  await expect(page.getByRole('heading', { name: 'Meet your Ghost.' })).toBeVisible();
});

test('the workspace stays still and respects reduced motion', async ({ page }) => {
  await mockApi(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#identity');
  await expect(page.getByRole('heading', { name: 'Meet your Ghost.' })).toBeVisible();
  await expect(page.locator('.fixed-bg, .identity-orbit, .art-glow')).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter((animation) => animation.effect.getTiming().iterations === Infinity).length,
    ),
  ).toBe(0);
  const trigger = page.getByRole('button', { name: 'No GitHub login. No email. Just your key.' });
  await trigger.click();
  await expect(page.getByRole('tooltip')).toBeVisible();
  expect(
    await page.getByRole('tooltip').evaluate((element) => getComputedStyle(element).transform),
  ).toBe('none');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('sidebar retracts, remembers its state, and preserves form input', async ({ page }) => {
  await mockApi(page);
  await page.goto('/');
  const sidebar = page.locator('#workspace-sidebar');
  await page.getByRole('button', { name: 'Collapse sidebar', exact: true }).click();
  const expand = page.getByRole('button', { name: 'Expand sidebar', exact: true });
  await expect(expand).toHaveAttribute('aria-expanded', 'false');
  await expect(sidebar).toHaveAttribute('inert');
  await expect(sidebar).toHaveAttribute('aria-hidden', 'true');
  await expect(page.locator('.topbar-brand')).toBeVisible();
  await expect(page.locator('.topbar-brand img')).toHaveCount(0);
  await page.reload();
  await expect(expand).toBeVisible();
  await expect(expand).toHaveAttribute('aria-expanded', 'false');
  await expand.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Collapse sidebar', exact: true })).toBeFocused();
  await expect(sidebar).not.toHaveAttribute('inert');
  await expect(page.getByRole('link', { name: 'My Ghost', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'My Ghost', exact: true }).click();
  await page.locator('[data-action="create-identity"]').click();
  await page.goto('/#submit/bounty-a');
  await page.locator('input[name="title"]').fill('Keep this unsaved draft');
  await page.locator('textarea[name="description"]').fill('Keep this description, too.');
  await page.getByRole('button', { name: 'Collapse sidebar', exact: true }).click();
  await expect(page.locator('input[name="title"]')).toHaveValue('Keep this unsaved draft');
  await page.getByRole('button', { name: 'Expand sidebar', exact: true }).click();
  await expect(page.locator('textarea[name="description"]')).toHaveValue(
    'Keep this description, too.',
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Collapse sidebar', exact: true }).click();
  await page.goto('/#privacy');
  await expect(page.getByRole('button', { name: 'Expand sidebar', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
