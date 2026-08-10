import { Injectable, inject } from '@angular/core';
import { Store } from '@ngxs/store';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { CartState } from './cart.state';
import { CartActions } from './cart.actions';

export interface ICartFacadeState {
    cart: any;
    loading: boolean;
    error: string | null;
}

@Injectable({
    providedIn: 'root'
})
export class CartFacade {
    private store = inject(Store);

    readonly viewState$: Observable<ICartFacadeState>;

    constructor() {
        this.viewState$ = combineLatest([
            this.store.select(CartState.getCart),
            this.store.select(CartState.isLoading),
            this.store.select((state: any) => state.cart.error) // direct access for now
        ]).pipe(
            map(([cart, loading, error]) => ({
                cart,
                loading,
                error
            }))
        );
    }

    createCart() {
        this.store.dispatch(new CartActions.CreateCart());
    }
}
