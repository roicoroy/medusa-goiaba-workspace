import { Injectable, inject } from '@angular/core';
import { State, Action, StateContext, Selector } from '@ngxs/store';
import { catchError, tap } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { ProductsActions } from './products.actions';
import { CartActions } from '../cart/cart.actions';
import { ProductsApiService, Product } from '../../shared/services/products-api/products-api.service';

export interface ProductsStateModel {
  products: Product[];
  loading: boolean;
  error: string | null;
}

@State<ProductsStateModel>({
  name: 'products',
  defaults: {
    products: [],
    loading: false,
    error: null
  }
})
@Injectable()
export class ProductsState {
  private productsApi = inject(ProductsApiService);

  @Selector()
  static getProducts(state: ProductsStateModel) {
    return state.products;
  }

  @Selector()
  static isLoading(state: ProductsStateModel) {
    return state.loading;
  }

  @Selector()
  static getError(state: ProductsStateModel) {
    return state.error;
  }

  @Action(ProductsActions.FetchProducts)
  fetchProducts(ctx: StateContext<ProductsStateModel>) {
    ctx.patchState({ loading: true, error: null });
    return this.productsApi.getProducts().pipe(
      tap((products: Product[]) => {
        ctx.patchState({
          products,
          loading: false
        });
      }),
      catchError(error => {
        ctx.patchState({ loading: false, error: error.message });
        return throwError(() => error);
      })
    );
  }

  @Action(ProductsActions.SearchAndAddByBarcode)
  searchAndAddByBarcode(ctx: StateContext<ProductsStateModel>, { barcode }: ProductsActions.SearchAndAddByBarcode) {
    ctx.patchState({ loading: true, error: null });
    
    return this.productsApi.getProductByBarcode(barcode).pipe(
      tap(product => {
        ctx.patchState({ loading: false });
        
        if (product) {
          const matchingVariant = product.variants?.find(v => v.barcode === barcode);
          if (matchingVariant) {
            // Dispatch to the Cart state to add the item!
            ctx.dispatch(new CartActions.AddLineItem(matchingVariant.id, 1));
          } else {
            // Edge case: product found but barcode didn't match any variant exactly in local check
            ctx.patchState({ error: 'Variant not found for barcode' });
          }
        } else {
          ctx.patchState({ error: `No product found for barcode ${barcode}` });
        }
      }),
      catchError(error => {
        ctx.patchState({ loading: false, error: error.message });
        return throwError(() => error);
      })
    );
  }
}
