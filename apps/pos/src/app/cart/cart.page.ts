import { Component, OnInit, inject } from '@angular/core';
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
  ViewWillEnter
} from '@ionic/angular/standalone';
import { CartFacade } from '../store/cart/cart.facade';

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
  ]
})
export class CartPage implements OnInit, ViewWillEnter {

  private readonly cartFacade = inject(CartFacade);

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.cartFacade.initializeCart();
  }
}
