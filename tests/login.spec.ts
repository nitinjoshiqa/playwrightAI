import { test, expect } from '../src/fixtures/testFixtures';
import { loginFlow } from '../src/flows/loginFlow';

test.describe('Login', () => {
  test('valid login', async ({ actions, pages }) => {
    await actions.page.goto('/');
    await loginFlow(actions, pages, 'standard_user', 'secret_sauce');
    await actions.waitForVisible(pages.inventory.itemList);
    await expect(actions.page).toHaveURL(/inventory.html/);
  });

  test('invalid login shows error', async ({ actions, pages }) => {
    await actions.page.goto('/');
    await loginFlow(actions, pages, 'invalid', 'wrong');
    await actions.waitForVisible(pages.login.errorMessage);
    const text = await actions.getText(pages.login.errorMessage);
    expect(text.length).toBeGreaterThan(0);
  });
});
