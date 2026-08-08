import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent, 
  IonGrid, 
  IonRow, 
  IonCol, 
  IonCard, 
  IonCardHeader, 
  IonCardTitle, 
  IonCardSubtitle, 
  IonCardContent, 
  IonButton,
  IonImg,
  IonSpinner
} from '@ionic/angular/standalone';
import { ProductsApiService, Product } from '../shared/services/products-api/products-api.service';
import { Observable } from 'rxjs';
import { Store } from '@ngxs/store';
import { AddDraftOrderItem } from '../store/draft-order/draft-order.actions';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    CommonModule,
    IonHeader, 
    IonToolbar, 
    IonTitle, 
    IonContent,
    IonGrid, 
    IonRow, 
    IonCol, 
    IonCard, 
    IonCardHeader, 
    IonCardTitle, 
    IonCardSubtitle, 
    IonCardContent, 
    IonButton,
    IonImg,
    IonSpinner
  ],
})
export class HomePage {
  private readonly productsService = inject(ProductsApiService);
  private readonly store = inject(Store);
  
  public products$: Observable<Product[]> = this.productsService.getProducts();

  addToCart(product: Product) {
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
}
