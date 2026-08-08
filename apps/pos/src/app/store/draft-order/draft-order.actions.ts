export class AddDraftOrderItem {
  static readonly type = '[DraftOrder] Add Item';
  constructor(readonly payload: { variantId: string; quantity: number; unitPrice: number; title: string }) {}
}

export class RemoveDraftOrderItem {
  static readonly type = '[DraftOrder] Remove Item';
  constructor(readonly payload: { variantId: string }) {}
}

export class ClearDraftOrder {
  static readonly type = '[DraftOrder] Clear';
}
