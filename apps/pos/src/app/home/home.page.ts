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
  IonButton,
  IonButtons,
} from '@ionic/angular/standalone';
import { CartFacade } from '../store/cart/cart.facade';
import { ProductsFacade } from '../store/products/products.facade';
import { NavigationService } from '../shared/services/navigation/navigation.service';
import { RegionSelectComponent } from '../components/region-select/region-select.component';

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
    IonButton,
    IonButtons,
    IonCol,
    RegionSelectComponent
  ],
})
export class HomePage implements OnInit {
  private readonly navigationService = inject(NavigationService);
  public readonly cartFacade = inject(CartFacade);
  public readonly productsFacade = inject(ProductsFacade);

  ngOnInit() {
    // No longer fetching the entire catalog on startup to save memory!
  }

  start() {
    this.navigationService.navigate('/cart');
  }

}
