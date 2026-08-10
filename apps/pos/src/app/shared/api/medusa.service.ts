import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';
import { BaseHttpService } from './base-http.service';

/**
 * MedusaService
 * 
 * Handles all Medusa API interactions.
 * 
 * NOTE: Headers (publishable key, auth token, content-type) are automatically
 * added by MedusaInterceptor. Global error handling is done by ErrorInterceptor.
 * This service focuses on Medusa-specific business logic.
 */
@Injectable({
  providedIn: 'root'
})
export class MedusaService extends BaseHttpService {
  protected baseUrl = environment.MEDUSA_API_BASE_PATH;

}