import { Injectable, inject } from '@angular/core';
import { State, Action, StateContext, Selector, Store } from '@ngxs/store';
import { catchError, tap, switchMap } from 'rxjs/operators';
import { throwError, of } from 'rxjs';
import { CheckoutActions } from './checkout.actions';
import { CheckoutApiService } from '../../shared/services/checkout/checkout.api';
import { CartState } from '../cart/cart.state';
import { CartActions } from '../cart/cart.actions';

export interface CheckoutStateModel {
  paymentSessions: any[];
  selectedPaymentSession: string | null;
  loading: boolean;
  error: string | null;
}

@State<CheckoutStateModel>({
  name: 'checkout',
  defaults: {
    paymentSessions: [],
    selectedPaymentSession: null,
    loading: false,
    error: null
  }
})
@Injectable()
export class CheckoutState {
  private checkoutApi = inject(CheckoutApiService);
  private store = inject(Store);

  @Selector()
  static getPaymentSessions(state: CheckoutStateModel) {
    return state.paymentSessions;
  }

  @Selector()
  static getSelectedSession(state: CheckoutStateModel) {
    return state.selectedPaymentSession;
  }

  @Selector()
  static isLoading(state: CheckoutStateModel) {
    return state.loading;
  }

  @Selector()
  static getError(state: CheckoutStateModel) {
    return state.error;
  }

  @Action(CheckoutActions.InitializeCheckout)
  initializeCheckout(ctx: StateContext<CheckoutStateModel>) {
    ctx.patchState({ loading: true, error: null });

    const cart = this.store.selectSnapshot(CartState.getCart);
    if (!cart || !cart.id) {
      ctx.patchState({ loading: false, error: 'No active cart found' });
      return;
    }

    // Step 1: Fetch regions if cart has no region
    return this.checkoutApi.getRegions().pipe(
      switchMap((regions: any[]) => {
        if (!regions || regions.length === 0) {
          return throwError(() => new Error('No regions configured on the server'));
        }
        
        // Select first region for POS (or keep existing if present)
        const regionId = cart.region_id || regions[0].id;
        
        // Step 2: Update the cart with the region
        return this.checkoutApi.updateCart(cart.id, { region_id: regionId });
      }),
      switchMap((updatedCart) => {
        // Step 3: Create payment sessions
        return this.checkoutApi.createPaymentSessions(updatedCart.id);
      }),
      tap((cartWithSessions) => {
        // Update the cart state globally
        ctx.dispatch(new CartActions.InitializeCart()); // or we could add an UpdateCart action, but this fetches the fresh cart
        
        ctx.patchState({
          paymentSessions: cartWithSessions.payment_sessions || [],
          loading: false
        });
      }),
      catchError(error => {
        console.error('Checkout Init Error:', error);
        ctx.patchState({ loading: false, error: error.message });
        return throwError(() => error);
      })
    );
  }

  @Action(CheckoutActions.SelectPaymentSession)
  selectPaymentSession(ctx: StateContext<CheckoutStateModel>, { providerId }: CheckoutActions.SelectPaymentSession) {
    ctx.patchState({ loading: true, error: null });

    const cart = this.store.selectSnapshot(CartState.getCart);
    if (!cart || !cart.id) {
      ctx.patchState({ loading: false, error: 'No active cart found' });
      return;
    }

    return this.checkoutApi.setPaymentSession(cart.id, providerId).pipe(
      tap((updatedCart) => {
        ctx.patchState({
          selectedPaymentSession: providerId,
          loading: false
        });
      }),
      catchError(error => {
        ctx.patchState({ loading: false, error: error.message });
        return throwError(() => error);
      })
    );
  }

  @Action(CheckoutActions.CompleteOrder)
  completeOrder(ctx: StateContext<CheckoutStateModel>) {
    // The user specifically asked to skip the final completion for now.
    // We will simulate it and reset the cart.
    ctx.patchState({ loading: true, error: null });
    console.log('Would call completeCart API here, but skipping for now as per instructions.');
    
    // Simulate successful order completion
    return of({ success: true }).pipe(
      tap(() => {
        ctx.patchState({ loading: false });
        ctx.dispatch(new CartActions.ClearCart());
      })
    );
  }
}
