import { ElementActions } from '../core/ElementActions';
import type { Pages } from '../pages';
import { loginFlow } from '../flows/loginFlow';

export async function userLoggedIn(actions: ElementActions, pages: Pages, username = 'standard_user', password = 'secret_sauce') {
  await actions.page.goto('/');
  await loginFlow(actions, pages, username, password);
}
