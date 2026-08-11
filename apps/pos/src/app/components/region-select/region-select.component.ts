import { CommonModule } from '@angular/common';
import { Component, inject, ViewChild } from '@angular/core';
import { 
  IonPopover, 
  IonItem, 
  IonLabel, 
  IonIcon, 
  IonContent, 
  IonList, 
  IonListHeader, 
  IonSkeletonText
} from '@ionic/angular/standalone';
import { Store } from '@ngxs/store';
import { Observable } from 'rxjs';
import { NewCountryListModel } from 'src/app/shared/services/interfaces';
import { RegionsActions } from 'src/app/store/regions/regions.actions';
import { RegionsState } from 'src/app/store/regions/regions.state';

@Component({
  selector: 'app-region-select',
  templateUrl: './region-select.component.html',
  styleUrls: ['./region-select.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonPopover,
    IonItem,
    IonLabel,
    IonIcon,
    IonContent,
    IonList,
    IonListHeader,
    IonSkeletonText
  ]
})
export class RegionSelectComponent {
  @ViewChild('regionPopover') regionPopover!: IonPopover;

  private store = inject(Store);

  // Observables for region data
  currentRegion$: Observable<NewCountryListModel> = this.store.select(RegionsState.getDefaultRegion);
  regionList$: Observable<NewCountryListModel[]> = this.store.select(RegionsState.getRegionList);

  constructor() {
    // Load regions if not already loaded
    this.loadRegions();
  }

  loadRegions() {
    this.store.dispatch(new RegionsActions.GetCountries());
  }

  changeRegion(region: NewCountryListModel) {
    this.store.dispatch(new RegionsActions.SetSelectedCountry(region.country));
  }

  presentRegionPopover() {
    this.regionPopover.present();
  }

  getCurrencySymbol(currencyCode: string): string {
    switch (currencyCode.toLowerCase()) {
      case 'gbp':
        return '£';
      case 'eur':
        return '€';
      case 'usd':
        return '$';
      case 'brl':
        return 'R$';
      default:
        return currencyCode.toUpperCase();
    }
  }
}
