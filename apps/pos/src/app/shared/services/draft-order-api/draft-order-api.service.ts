import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DraftOrderApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.MEDUSA_API_BASE_PATH}/admin/draft-orders`;

  createDraftOrder(payload: { email: string; items: { variant_id: string; quantity: number }[] }): Observable<any> {
    const draftOrderPayload = {
      email: payload.email,
      items: payload.items,
      // For POS, we usually don't need a specific region right away if it's default, 
      // but in Medusa a region_id might be required. We'll leave it simple for now.
    };
    
    return this.http.post<any>(this.apiUrl, draftOrderPayload);
  }

  markAsPaid(draftOrderId: string): Observable<any> {
    // In Medusa, you would typically capture the payment or transition the draft order
    return this.http.post<any>(`${this.apiUrl}/${draftOrderId}/pay`, {});
  }
}
