import { Product } from '../../shared/services/products-api/products-api.service';

export namespace CartActions {
  export class CreateCart {
    static readonly type = '[Cart] Create Cart';
    constructor(public regionId?: string) {}
  }

  export class AddLineItem {
    static readonly type = '[Cart] Add Line Item';
    constructor(public variantId: string, public quantity: number = 1) {}
  }

  export class RemoveLineItem {
    static readonly type = '[Cart] Remove Line Item';
    constructor(public lineItemId: string) {}
  }

  export class UpdateItemQuantity {
    static readonly type = '[Cart] Update Item Quantity';
    constructor(public lineItemId: string, public quantity: number) {}
  }

  export class ClearCart {
    static readonly type = '[Cart] Clear Cart';
  }

  export class InitializeCart {
    static readonly type = '[Cart] Initialize Cart';
  }
}
