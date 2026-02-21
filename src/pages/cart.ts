export const cartPage = {
  cartItem: (name: string) => `//div[@class='cart_item' and .//div[text()='${name}']]`,
  checkoutButton: '[data-test="checkout"]',
  removeButton: (name: string) => `//div[@class='cart_item' and .//div[text()='${name}']]//button`
} as const;
