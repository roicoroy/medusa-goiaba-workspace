import { Component, inject, OnInit } from '@angular/core';
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
  IonButtons,
  IonNote
} from '@ionic/angular/standalone';
import { CartFacade } from '../store/cart/cart.facade';
import { NavigationService } from '../shared/services/navigation/navigation.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonNote,
    IonTitle,
    IonContent,
    IonButtons,
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
    IonFooter
  ],
})
export class HomePage implements OnInit {
  private readonly navigationService = inject(NavigationService);
  public readonly cartFacade = inject(CartFacade);

  ngOnInit() {
  }

  start() {
    this.navigationService.navigate('/cart');
  }

}
