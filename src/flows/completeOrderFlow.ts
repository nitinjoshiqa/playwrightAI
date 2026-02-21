import { ElementActions } from '../core/ElementActions';
import type { Pages } from '../pages';

export async function completeOrderFlow(actions: ElementActions, pages: Pages) {
  await actions.click(pages.checkoutOverview.finishButton);
  await actions.waitForVisible(pages.checkoutComplete.completeHeader);
}
