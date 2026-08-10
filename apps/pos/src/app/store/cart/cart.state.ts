import { State, Action, StateContext, Selector } from '@ngxs/store';
import { Injectable, inject } from '@angular/core';
import { catchError, tap } from 'rxjs/operators';
import { throwError } from 'rxjs';

import { CartActions } from './cart.actions';
import { MedusaService } from '../../shared/api/medusa.service';

export interface CartStateModel {
  cart: any | null;
  loading: boolean;
  error: string | null;
}

@State<CartStateModel>({
  name: 'cart',
  defaults: {
    cart: null,
    loading: false,
    error: null
  }
})
@Injectable()
export class CartState {
  private medusaApi = inject(MedusaService);

  @Selector()
  static getCart(state: CartStateModel) {
    return state.cart;
  }

  @Selector()
  static getCartItems(state: CartStateModel) {
    return state.cart?.items || [];
  }

  @Selector()
  static getCartTotal(state: CartStateModel) {
    return state.cart?.total || 0;
  }

  @Selector()
  static isLoading(state: CartStateModel) {
    return state.loading;
  }

  @Action(CartActions.CreateCart)
  createCart(ctx: StateContext<CartStateModel>, action: CartActions.CreateCart) {
    ctx.patchState({ loading: true, error: null });
    
    // In Medusa v2, you might need a valid region_id.
    // For now we pass the regionId from action or empty string to rely on backend defaults
    return this.medusaApi.cartsCreate(action.regionId || '', 'usd').pipe(
      tap((res: any) => {
        ctx.patchState({
          cart: res.cart,
          loading: false
        });
      }),
      catchError(error => {
        ctx.patchState({ loading: false, error: error.message });
        return throwError(() => error);
      })
    );
  }


  @Action(CartActions.AddLineItem)
  addLineItem(ctx: StateContext<CartStateModel>, { variantId, quantity }: CartActions.AddLineItem) {
    const state = ctx.getState();
    if (!state.cart?.id) return;

    ctx.patchState({ loading: true, error: null });
    
    return this.medusaApi.addCartLineItem(state.cart.id, variantId, quantity).pipe(
      tap((res: any) => {
        ctx.patchState({
          cart: res.cart,
          loading: false
        });
      }),
      catchError(error => {
        ctx.patchState({ error: error.message, loading: false });
        return throwError(() => error);
      })
    );
  }

  @Action(CartActions.RemoveLineItem)
  removeLineItem(ctx: StateContext<CartStateModel>, { lineItemId }: CartActions.RemoveLineItem) {
    const state = ctx.getState();
    if (!state.cart?.id) return;

    ctx.patchState({ loading: true, error: null });

    return this.medusaApi.deleteCartLineItem(state.cart.id, lineItemId).pipe(
      tap((res: any) => {
        ctx.patchState({
          cart: res.cart,
          loading: false
        });
      }),
      catchError(error => {
        ctx.patchState({ error: error.message, loading: false });
        return throwError(() => error);
      })
    );
  }

  @Action(CartActions.UpdateItemQuantity)
  updateItemQuantity(ctx: StateContext<CartStateModel>, { lineItemId, quantity }: CartActions.UpdateItemQuantity) {
    const state = ctx.getState();
    if (!state.cart?.id) return;

    ctx.patchState({ loading: true, error: null });

    return this.medusaApi.updateCartLineItem(state.cart.id, lineItemId, quantity).pipe(
      tap((res: any) => {
        ctx.patchState({
          cart: res.cart,
          loading: false
        });
      }),
      catchError(error => {
        ctx.patchState({ error: error.message, loading: false });
        return throwError(() => error);
      })
    );
  }

  @Action(CartActions.ClearCart)
  clearCart(ctx: StateContext<CartStateModel>) {
    ctx.patchState({
      cart: null,
      loading: false,
      error: null
    });
  }

  @Action(CartActions.InitializeCart)
  initializeCart(ctx: StateContext<CartStateModel>) {
    const state = ctx.getState();
    const cartId = state.cart?.id;

    if (!cartId) {
      return ctx.dispatch(new CartActions.CreateCart());
    }

    ctx.patchState({ loading: true, error: null });
    
    return this.medusaApi.retrieveCart(cartId).pipe(
      tap((res: any) => {
        ctx.patchState({
          cart: res.cart,
          loading: false
        });
      }),
      catchError(error => {
        // If retrieving fails (e.g. 404), the local cart is invalid/expired
        ctx.dispatch(new CartActions.ClearCart());
        return throwError(() => error);
      })
    );
  }
}
