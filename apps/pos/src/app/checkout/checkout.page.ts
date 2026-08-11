import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel
} from '@ionic/angular/standalone';
import { CartFacade } from '../store/cart/cart.facade';

@Component({
  selector: 'app-checkout',
  templateUrl: './checkout.page.html',
  styleUrls: ['./checkout.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonContent, IonHeader, IonTitle, IonToolbar, IonButtons, IonBackButton,
    IonGrid, IonRow, IonCol, IonButton, IonCard, IonCardHeader, IonCardTitle,
    IonCardContent, IonList, IonItem, IonLabel
  ]
})
export class CheckoutPage {
  private readonly cartFacade = inject(CartFacade);
  private readonly router = inject(Router);

  viewState$ = this.cartFacade.viewState$;
  selectedPaymentMethod = 'manual'; // In POS, manual (cash) is a common default

  selectMethod(method: string) {
    this.selectedPaymentMethod = method;
  }

  async completeOrder() {
    console.log('Completing order via Medusa with method:', this.selectedPaymentMethod);
    // Medusa Boilerplate steps to implement later:
    // 1. Create Payment Session for cart
    // 2. Select Payment Session (e.g. 'manual' provider)
    // 3. Complete Cart

    // For now, clear cart locally and return to home
    this.cartFacade.clearCart();
    this.router.navigate(['/home']);
  }
}
