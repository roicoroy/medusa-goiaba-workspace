import { Injectable } from '@angular/core';
import { Action, Selector, State, StateContext } from '@ngxs/store';
import { AddDraftOrderItem, RemoveDraftOrderItem, ClearDraftOrder } from './draft-order.actions';

export interface DraftOrderItem {
  variantId: string;
  quantity: number;
  unitPrice: number;
  title: string;
}

export interface DraftOrderStateModel {
  items: DraftOrderItem[];
  email: string;
}

@State<DraftOrderStateModel>({
  name: 'draftOrder',
  defaults: {
    items: [],
    email: 'pos@local.store'
  }
})
@Injectable()
export class DraftOrderState {
  @Selector()
  static items(state: DraftOrderStateModel): DraftOrderItem[] {
    return state.items;
  }

  @Selector()
  static total(state: DraftOrderStateModel): number {
    return state.items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
  }

  @Action(AddDraftOrderItem)
  addItem({ getState, patchState }: StateContext<DraftOrderStateModel>, { payload }: AddDraftOrderItem) {
    const state = getState();
    const existingItem = state.items.find(i => i.variantId === payload.variantId);
    
    if (existingItem) {
      patchState({
        items: state.items.map(i => i.variantId === payload.variantId ? { ...i, quantity: i.quantity + payload.quantity } : i)
      });
    } else {
      patchState({
        items: [...state.items, payload]
      });
    }
  }

  @Action(RemoveDraftOrderItem)
  removeItem({ getState, patchState }: StateContext<DraftOrderStateModel>, { payload }: RemoveDraftOrderItem) {
    const state = getState();
    patchState({
      items: state.items.filter(i => i.variantId !== payload.variantId)
    });
  }

  @Action(ClearDraftOrder)
  clear({ patchState }: StateContext<DraftOrderStateModel>) {
    patchState({
      items: []
    });
  }
}
