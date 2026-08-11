import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ViewWillEnter } from '@ionic/angular';
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
import { CheckoutFacade } from '../store/checkout/checkout.facade';

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
export class CheckoutPage implements ViewWillEnter {
  private readonly cartFacade = inject(CartFacade);
  private readonly checkoutFacade = inject(CheckoutFacade);
  private readonly router = inject(Router);

  cartViewState$ = this.cartFacade.viewState$;
  checkoutViewState$ = this.checkoutFacade.viewState$;

  ionViewWillEnter() {
    this.checkoutFacade.initializeCheckout();
  }

  selectMethod(providerId: string) {
    this.checkoutFacade.selectPaymentSession(providerId);
  }

  async completeOrder() {
    this.checkoutFacade.completeOrder();
    this.router.navigate(['/home']);
  }
}
