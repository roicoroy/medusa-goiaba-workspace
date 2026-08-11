import { Component, inject, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { IconsService } from './shared/services/icons/icons.service';
import { ScannerService } from './shared/services/scanner/scanner.service';
import { ProductsFacade } from './store/products/products.facade';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit {

  private icons = inject(IconsService);
  private scannerService = inject(ScannerService);
  private productsFacade = inject(ProductsFacade);

  async ngOnInit(): Promise<void> {
    await this.initializeApp();

    this.scannerService.scannedBarcode$.subscribe(async (barcode) => {
      console.log('Hardware scanner scanned:', barcode);
      // Delegate hardware scans directly to our new backend API state pattern
      // This completely removes the need to download the entire catalog into memory!
      this.productsFacade.searchAndAddByBarcode(barcode);
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
