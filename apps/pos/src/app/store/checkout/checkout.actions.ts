export namespace CheckoutActions {
  export class InitializeCheckout {
    static readonly type = '[Checkout] Initialize Checkout';
  }

  export class SelectPaymentSession {
    static readonly type = '[Checkout] Select Payment Session';
    constructor(public providerId: string) {}
  }

  export class CompleteOrder {
    static readonly type = '[Checkout] Complete Order';
  }
}
