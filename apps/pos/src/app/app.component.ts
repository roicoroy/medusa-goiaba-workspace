import { Component, inject, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet, ToastController } from '@ionic/angular/standalone';
import { Store } from '@ngxs/store';
import { IconsService } from './shared/services/icons/icons.service';
import { ScannerService } from './shared/services/scanner/scanner.service';
import { ProductsState } from './store/products/products.state';
import { CartActions } from './store/cart/cart.actions';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {

  private icons = inject(IconsService);
  private scannerService = inject(ScannerService);
  private store = inject(Store);
  private toastController = inject(ToastController);

  async ngOnInit(): Promise<void> {
    await this.initializeApp();

    this.scannerService.scannedBarcode$.subscribe(async (barcode) => {
      console.log('Scanned barcode:', barcode);
      
      const products = this.store.selectSnapshot(ProductsState.getProducts);
      let matchedVariant = null;

      // Search for variant by barcode
      for (const product of products) {
        if (product.variants) {
          const found = product.variants.find(v => v.barcode === barcode);
          if (found) {
            matchedVariant = found;
            break;
          }
        }
      }

      if (matchedVariant) {
        // Dispatch AddLineItem
        this.store.dispatch(new CartActions.AddLineItem(matchedVariant.id, 1));
        const toast = await this.toastController.create({
          message: `Added ${matchedVariant.title} to Cart`,
          duration: 2000,
          color: 'success'
        });
        toast.present();
      } else {
        const toast = await this.toastController.create({
          message: `Barcode ${barcode} not found`,
          duration: 2000,
          color: 'warning'
        });
        toast.present();
      }
    });
  }

  async initializeApp() {
    try {
      this.icons.initIcons();
    } catch (err) {
      console.log('This is normal in a browser', err);
    }
  }
}
