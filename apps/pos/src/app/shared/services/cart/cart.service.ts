import { Injectable, inject } from '@angular/core';
import { Store, Select } from '@ngxs/store';
import { Observable } from 'rxjs';
import { CartActions } from '../../../store/cart/cart.actions';
import { CartState } from '../../../store/cart/cart.state';
import { Product } from '../products-api/products-api.service';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly store = inject(Store);

  // Expose the state selectors as observables
  @Select(CartState.getCartItems) items$!: Observable<any[]>;
  @Select(CartState.getCartTotal) total$!: Observable<number>;
  @Select(CartState.getCart) cart$!: Observable<any>;
  @Select(CartState.isLoading) isLoading$!: Observable<boolean>;

  createCart() {
    this.store.dispatch(new CartActions.CreateCart());
  }

  addItem(product: Product): void {
    if (product.variants && product.variants.length > 0) {
      this.store.dispatch(new CartActions.AddItem(product, 1));
    }
  }

  removeItem(item: any): void {
    this.store.dispatch(new CartActions.RemoveItem(item.id));
  }

  clearCart(): void {
    this.store.dispatch(new CartActions.ClearCart());
  }

  checkout(): void {
    console.log('[CartService] Checkout process initiated (Server-Side Cart)');
    // We will integrate the checkout API here later!
  }
}
