import { Component, inject, OnInit, ViewChild, ErrorHandler } from '@angular/core';
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
  IonSpinner,
  IonSearchbar,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonBadge,
  IonFooter,
  IonListHeader
} from '@ionic/angular/standalone';
import { ProductsApiService, Product } from '../shared/services/products-api/products-api.service';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { CartService } from '../shared/services/cart/cart.service';
import { DraftOrderItem } from '../store/draft-order/draft-order.state';

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
    IonSpinner,
    IonSearchbar,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    IonBadge,
    IonFooter,
    IonListHeader
  ],
})
export class HomePage implements OnInit {
  private readonly productsService = inject(ProductsApiService);
  public readonly cartService = inject(CartService); // Injecting Facade Service
  private readonly errorHandler = inject(ErrorHandler);

  @ViewChild('searchInput') searchInput: any;

  // Products State
  private allProducts$ = new BehaviorSubject<Product[]>([]);
  public searchQuery$ = new BehaviorSubject<string>('');

  public filteredProducts$: Observable<Product[]> = combineLatest([
    this.allProducts$,
    this.searchQuery$
  ]).pipe(
    map(([products, query]) => {
      if (!query) return products;
      const lowerQuery = query.toLowerCase();

      return products.filter(p => {
        const matchTitle = p.title?.toLowerCase().includes(lowerQuery);
        const matchDesc = p.description?.toLowerCase().includes(lowerQuery);
        const matchVariant = p.variants?.some(v =>
          v.barcode?.toLowerCase().includes(lowerQuery) ||
          v.sku?.toLowerCase().includes(lowerQuery)
        );
        return matchTitle || matchDesc || matchVariant;
      });
    })
  );

  ngOnInit() {
    this.productsService.getProducts().subscribe(products => {
      this.allProducts$.next(products);
    });
  }

  onSearchChange(event: any) {
    this.searchQuery$.next(event.detail.value || '');
  }

  onSearchEnter() {
    const query = this.searchQuery$.getValue().trim().toLowerCase();
    if (!query) return;

    const all = this.allProducts$.getValue();

    for (const product of all) {
      if (product.variants?.some(v => v.barcode?.toLowerCase() === query || v.sku?.toLowerCase() === query)) {
        this.cartService.addItem(product);

        // Clear search
        this.searchQuery$.next('');
        if (this.searchInput) {
          this.searchInput.value = '';
        }
        return;
      }
    }

    // If we get here, no product matched the barcode exactly
    this.errorHandler.handleError(new Error(`Barcode not found: ${query}`));
    
    // Clear the search input so they can scan again
    this.searchQuery$.next('');
    if (this.searchInput) {
      this.searchInput.value = '';
    }
  }

  addToCart(product: Product) {
    this.cartService.addItem(product);
  }

  removeFromCart(item: DraftOrderItem) {
    this.cartService.removeItem(item);
  }

  clearCart() {
    this.cartService.clearCart();
  }

  checkout() {
    this.cartService.checkout();
  }
}
