import { ElementActions } from '../core/ElementActions';
import type { Pages } from '../pages';

export async function loginFlow(actions: ElementActions, pages: Pages, username: string, password: string) {
  await actions.waitForVisible(pages.login.usernameInput);
  await actions.type(pages.login.usernameInput, username);
  await actions.type(pages.login.passwordInput, password);
  await actions.click(pages.login.loginButton);
}
