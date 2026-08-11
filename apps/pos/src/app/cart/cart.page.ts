import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonGrid,
  IonRow,
  IonCol,
  IonButton,
  IonFooter,
  IonItem,
  IonInput,
  IonLabel,
  ViewWillEnter
} from '@ionic/angular/standalone';
import { CartFacade } from '../store/cart/cart.facade';
import { ProductsFacade } from '../store/products/products.facade';

@Component({
  selector: 'app-cart',
  templateUrl: './cart.page.html',
  styleUrls: ['./cart.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonFooter,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonGrid,
    IonRow,
    IonCol,
    IonButton,
    IonItem,
    IonInput,
    IonLabel
  ]
})
export class CartPage implements OnInit, ViewWillEnter {

  private readonly cartFacade = inject(CartFacade);
  private readonly productsFacade = inject(ProductsFacade);
  private readonly router = inject(Router);

  barcodeQuery = '';

  // Expose the states to the template
  viewState$ = this.cartFacade.viewState$;
  productsViewState$ = this.productsFacade.viewState$;

  ngOnInit() {
    this.viewState$.subscribe((vs) => console.log('Cart State:', vs));
  }

  ionViewWillEnter() {
    this.cartFacade.initializeCart();
  }

  testSearchBarcode() {
    if (!this.barcodeQuery.trim()) return;

    // Delegate to the Products state to handle the API call and the dispatch to Cart state
    this.productsFacade.searchAndAddByBarcode(this.barcodeQuery);

    // Clear the input so the cashier can immediately scan the next item
    this.barcodeQuery = '';
  }

  proceedToCheckout() {
    this.router.navigate(['/checkout']);
  }
}
