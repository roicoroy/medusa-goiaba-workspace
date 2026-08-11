import { Injectable, inject } from '@angular/core';
import { Action, Selector, State, StateContext, Store } from '@ngxs/store';
import { RegionsActions } from './regions.actions';
import { ProductsActions } from '../products/products.actions';
import { Observable, take, tap, catchError, throwError } from 'rxjs';
import { NewCountryListModel } from '../../shared/services/interfaces';
import { MedusaService } from '../../shared/api/medusa.service';

const DEFAULT_COUNTRY_CODE = 'it'; // Default country code - using Italy as it's available on the server

export interface RegionsStateStateModel {
  regionList: NewCountryListModel[];
  defaultRegion: NewCountryListModel;
  userSelectedCountry: string | null; // Store user's preferred country in state
}

@State<RegionsStateStateModel>({
  name: 'regions',
  defaults: {
    regionList: [],
    defaultRegion: {
      country: '',
      region_id: '',
      label: '',
      currency_code: '',
    },
    userSelectedCountry: null
  }
})
@Injectable()
export class RegionsState {
  private readonly medusaApi = inject(MedusaService);
  private store = inject(Store);

  @Selector()
  static getRegionList(state: RegionsStateStateModel): NewCountryListModel[] {
    return state.regionList;
  }

  @Selector()
  static getDefaultRegion(state: RegionsStateStateModel): NewCountryListModel {
    return state?.defaultRegion;
  }

  @Selector()
  static getUserSelectedCountry(state: RegionsStateStateModel): string | null {
    return state?.userSelectedCountry;
  }

  @Action(RegionsActions.GetCountries)
  getCountries(ctx: StateContext<RegionsStateStateModel>): Observable<any> {
    return this.medusaApi.regionsList().pipe(
      take(1),
      tap((res: any) => {
        // Handle nested regions structure: { regions: [...], count, offset, limit }
        const regions = res?.regions || [];

        const newCountryList: NewCountryListModel[] = regions
          .map((r: any) => {
            // Ensure countries array exists and is not empty
            if (!r.countries || !Array.isArray(r.countries) || r.countries.length === 0) {
              return [];
            }

            // Map each country in the region to a NewCountryListModel
            return r.countries.map((c: any) => ({
              currency_code: r.currency_code || '',
              country: c.iso_2 || '',
              region_id: r.id || '',
              label: c.display_name || c.name || '',
            }));
          })
          .flat()
          .filter((item: any) => item.country && item.label) // Filter out invalid entries
          .sort((a: any, b: any) => (a?.label ?? "").localeCompare(b?.label ?? ""))

        // Get user's stored region preference from state
        const currentState = ctx.getState();
        const storedCountry = currentState.userSelectedCountry;

        // Find the user's preferred region in the available regions
        let selectedRegion = null;
        if (storedCountry && newCountryList.length > 0) {
          selectedRegion = newCountryList.find(region => region.country === storedCountry);
        }

        // If user's preferred region is not found or not stored, use default
        if (!selectedRegion) {
          selectedRegion = newCountryList.find(region => region.country === DEFAULT_COUNTRY_CODE);
        }

        // If still no region found, use the first available region
        if (!selectedRegion && newCountryList.length > 0) {
          selectedRegion = newCountryList[0];
        }

        // If no regions available, create a fallback
        if (!selectedRegion) {
          selectedRegion = {
            country: DEFAULT_COUNTRY_CODE,
            region_id: '',
            label: 'Default',
            currency_code: 'usd'
          };
        }



        ctx.patchState({
          regionList: newCountryList,
          defaultRegion: selectedRegion,
        });
      }),
      catchError(error => {
        console.error('Error loading regions:', error);
        // Set a default region to prevent loading issues
        const defaultRegion: NewCountryListModel = {
          country: DEFAULT_COUNTRY_CODE,
          region_id: '',
          label: 'Default',
          currency_code: 'usd'
        };
        ctx.patchState({
          regionList: [],
          defaultRegion: defaultRegion,
        });
        return throwError(() => error);
      })
    );
  }

  @Action(RegionsActions.SetSelectedCountry)
  SetSelectedCountry(ctx: StateContext<RegionsStateStateModel>, { country }: RegionsActions.SetSelectedCountry) {
    try {
      const state = ctx.getState();
      const filtered = state.regionList.filter(value => value.country === country);
      if (filtered[0]) {
        // Store user's region preference in state (NGXS will persist it automatically)
        this.store.dispatch(new ProductsActions.FetchProducts());
        return ctx.patchState({
          defaultRegion: filtered[0],
          userSelectedCountry: country
        });
      }
    } catch (error) {
      console.log(error);
    }
  }

  @Action(RegionsActions.ClearSelectedCountry)
  clearSelectedCountry(ctx: StateContext<RegionsStateStateModel>) {
    ctx.patchState({
      defaultRegion: {
        country: '',
        region_id: '',
        label: '',
        currency_code: '',
      },
      userSelectedCountry: null
    });
  }

  @Action(RegionsActions.ClearCountryList)
  clearCountryList(ctx: StateContext<RegionsStateStateModel>) {
    ctx.patchState({
      regionList: []
    });
  }

  @Action(RegionsActions.LogOut)
  logout(ctx: StateContext<RegionsStateStateModel>) {
    // Clear user region preference from state (NGXS will persist the change automatically)
    ctx.patchState({
      regionList: [],
      defaultRegion: {
        country: '',
        region_id: '',
        label: '',
        currency_code: '',
      },
      userSelectedCountry: null
    });
  }


}
