type Cart = {
  productId: number;
  quantity: number;
};

type Preferences = {
  language: string;
};

export type SessionData = {
  cart: Cart[];
  preferences: Preferences;
};
