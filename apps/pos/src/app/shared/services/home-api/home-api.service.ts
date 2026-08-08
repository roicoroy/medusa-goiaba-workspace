import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { HomeCategory, Product } from '@org/storefront-models';
import { CatalogApiService } from '../catalog-api/catalog-api.service';

@Injectable({ providedIn: 'root' })
export class HomeApiService {
  private readonly catalogApi = inject(CatalogApiService);

  getHomeCategories(): Observable<HomeCategory[]> {
    return this.catalogApi.getCategories().pipe(
      map((categories) =>
        categories
          .filter(
            (category) =>
              category.translation?.name && category.translation?.slug,
          )
          .sort((left, right) => (left.position ?? 0) - (right.position ?? 0))
          .slice(0, 8)
          .map((category) => ({
            id: category.id,
            numericId: category.numericId,
            name: category.translation?.name ?? '',
            slug: category.translation?.slug ?? '',
            logoUrl: category.logoUrl,
            position: category.position ?? 0,
          })),
      ),
    );
  }

  getFeaturedProducts(payload: {
    first?: number;
    channel?: string;
    locale?: string;
    filter?: string;
  }): Observable<Product[]> {
    return this.catalogApi
      .getProducts({
        first: payload.first,
        channel: payload.channel,
        locale: payload.locale,
        filter: payload.filter,
      })
      .pipe(map((response) => response.items));
  }
}
