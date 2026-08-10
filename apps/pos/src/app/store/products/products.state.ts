import { Injectable, inject } from '@angular/core';
import { State, Action, StateContext, Selector } from '@ngxs/store';
import { catchError, tap } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { ProductsActions } from './products.actions';
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
}
