import { Injectable, inject } from '@angular/core';
import { Store } from '@ngxs/store';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { ProductsState } from './products.state';
import { ProductsActions } from './products.actions';
import { Product } from '../../shared/services/products-api/products-api.service';

export interface IProductsFacadeState {
    products: Product[];
    loading: boolean;
    error: string | null;
}

@Injectable({
    providedIn: 'root'
})
export class ProductsFacade {
    private store = inject(Store);

    readonly viewState$: Observable<IProductsFacadeState>;

    constructor() {
        this.viewState$ = combineLatest([
            this.store.select(ProductsState.getProducts),
            this.store.select(ProductsState.isLoading),
            this.store.select(ProductsState.getError)
        ]).pipe(
            map(([products, loading, error]) => ({
                products,
                loading,
                error
            }))
        );
    }

    fetchProducts() {
        this.store.dispatch(new ProductsActions.FetchProducts());
    }

    searchAndAddByBarcode(barcode: string) {
        this.store.dispatch(new ProductsActions.SearchAndAddByBarcode(barcode));
    }
}
