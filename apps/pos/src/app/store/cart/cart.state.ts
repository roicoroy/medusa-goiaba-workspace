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

  @Action(CartActions.AddItem)
  addItem(ctx: StateContext<CartStateModel>, action: CartActions.AddItem) {
    const state = ctx.getState();
    const cartId = state.cart?.id;
    
    if (!cartId) {
      // Option B approach: if no cart exists yet, we can create one on the fly, 
      // but for simplicity we should expect the user to have clicked 'Create Cart' first.
      ctx.patchState({ error: 'No active cart. Please create a cart first.' });
      return;
    }

    ctx.patchState({ loading: true, error: null });
    return this.medusaApi.addCartLineItem(cartId, action.product.variants?.[0]?.id || '', action.quantity).pipe(
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

  @Action(CartActions.RemoveItem)
  removeItem(ctx: StateContext<CartStateModel>, action: CartActions.RemoveItem) {
    const state = ctx.getState();
    const cartId = state.cart?.id;
    
    if (!cartId) return;

    ctx.patchState({ loading: true, error: null });
    return this.medusaApi.deleteCartLineItem(cartId, action.lineItemId).pipe(
      tap((res: any) => {
        // DELETE might return the updated cart or just success. 
        // We assume it returns the parent cart in res.parent or res.cart, 
        // otherwise we might need to fetch it again.
        ctx.patchState({
          cart: res.parent || res.cart || state.cart,
          loading: false
        });
        
        // If it doesn't return the full cart, we would want to retrieve it:
        // this.store.dispatch(new RefreshCart(cartId))
      }),
      catchError(error => {
        ctx.patchState({ loading: false, error: error.message });
        return throwError(() => error);
      })
    );
  }

  @Action(CartActions.UpdateItemQuantity)
  updateItemQuantity(ctx: StateContext<CartStateModel>, action: CartActions.UpdateItemQuantity) {
    const state = ctx.getState();
    const cartId = state.cart?.id;
    
    if (!cartId) return;

    ctx.patchState({ loading: true, error: null });
    return this.medusaApi.updateCartLineItem(cartId, action.lineItemId, action.quantity).pipe(
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
