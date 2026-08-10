import { Product } from '../../shared/services/products-api/products-api.service';

export namespace CartActions {
  export class CreateCart {
    static readonly type = '[Cart] Create Cart';
    constructor(public regionId?: string) {}
  }

  export class AddItem {
    static readonly type = '[Cart] Add Item';
    constructor(public product: Product, public quantity: number = 1) {}
  }

  export class RemoveItem {
    static readonly type = '[Cart] Remove Item';
    constructor(public lineItemId: string) {}
  }

  export class UpdateItemQuantity {
    static readonly type = '[Cart] Update Item Quantity';
    constructor(public lineItemId: string, public quantity: number) {}
  }

  export class ClearCart {
    static readonly type = '[Cart] Clear Cart';
  }
}
