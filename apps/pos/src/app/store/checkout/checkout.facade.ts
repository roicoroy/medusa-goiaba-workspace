import { Injectable, inject } from '@angular/core';
import { Store } from '@ngxs/store';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { CheckoutState } from './checkout.state';
import { CheckoutActions } from './checkout.actions';

export interface ICheckoutFacadeState {
  paymentSessions: any[];
  selectedPaymentSession: string | null;
  loading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class CheckoutFacade {
  private store = inject(Store);

  readonly viewState$: Observable<ICheckoutFacadeState>;

  constructor() {
    this.viewState$ = combineLatest([
      this.store.select(CheckoutState.getPaymentSessions),
      this.store.select(CheckoutState.getSelectedSession),
      this.store.select(CheckoutState.isLoading),
      this.store.select(CheckoutState.getError)
    ]).pipe(
      map(([paymentSessions, selectedPaymentSession, loading, error]) => ({
        paymentSessions,
        selectedPaymentSession,
        loading,
        error
      }))
    );
  }

  initializeCheckout() {
    this.store.dispatch(new CheckoutActions.InitializeCheckout());
  }

  selectPaymentSession(providerId: string) {
    this.store.dispatch(new CheckoutActions.SelectPaymentSession(providerId));
  }

  completeOrder() {
    this.store.dispatch(new CheckoutActions.CompleteOrder());
  }
}
