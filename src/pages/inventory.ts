export const inventoryPage = {
  itemList: '.inventory_list',
  itemCard: (name: string) => `//div[@class='inventory_item' and .//div[text()='${name}']]`,
  addToCartButton: (name: string) => `//div[@class='inventory_item' and .//div[text()='${name}']]//button`,
  cartBadge: '.shopping_cart_badge',
  cartButton: '.shopping_cart_link'
} as const;
