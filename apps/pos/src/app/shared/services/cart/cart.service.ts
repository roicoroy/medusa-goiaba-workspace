import { Injectable, inject } from '@angular/core';
import { Store, Select } from '@ngxs/store';
import { Observable } from 'rxjs';
import { AddDraftOrderItem, RemoveDraftOrderItem, ClearDraftOrder } from '../../../store/draft-order/draft-order.actions';
import { DraftOrderState, DraftOrderItem } from '../../../store/draft-order/draft-order.state';
import { Product } from '../products-api/products-api.service';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly store = inject(Store);

  // Expose the state selectors as observables
  @Select(DraftOrderState.items) items$!: Observable<DraftOrderItem[]>;
  @Select(DraftOrderState.total) total$!: Observable<number>;

  /**
   * Adds a product to the cart. 
   * Uses the first variant and its first price for simplicity.
   */
  addItem(product: Product): void {
    if (product.variants && product.variants.length > 0) {
      const variant = product.variants[0]; 
      const price = variant.prices?.[0]?.amount || 0;

      this.store.dispatch(new AddDraftOrderItem({
        variantId: variant.id,
        title: product.title,
        quantity: 1,
        unitPrice: price
      }));
    }
  }

  /**
   * Removes an item from the cart
   */
  removeItem(item: DraftOrderItem): void {
    this.store.dispatch(new RemoveDraftOrderItem({
      variantId: item.variantId
    }));
  }

  /**
   * Clears all items from the cart
   */
  clearCart(): void {
    this.store.dispatch(new ClearDraftOrder());
  }

  /**
   * Handles checkout process
   */
  checkout(): void {
    console.log('Checkout initiated via CartService');
    // Future: Call API to process payment/order
  }
}
