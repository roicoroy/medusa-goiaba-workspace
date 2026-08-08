import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface LoginInput {
  email: string;
  password?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

export interface AuthResponse {
  token: string;
  user: AdminUser;
}

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.MEDUSA_API_BASE_PATH;

  login(payload: LoginInput): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/user/emailpass`, {
      email: payload.email,
      password: payload.password
    }).pipe(
      map(response => response),
      catchError((error: HttpErrorResponse) => {
        const message = error.error?.message || 'Failed to login';
        return throwError(() => new Error(message));
      })
    );
  }

  logout(): Observable<{ success: boolean }> {
    // Medusa JWT tokens are usually cleared on the client side for POS
    return new Observable(subscriber => {
      subscriber.next({ success: true });
      subscriber.complete();
    });
  }

  getProfile(): Observable<AdminUser> {
    return this.http.get<{ user: AdminUser }>(`${this.apiUrl}/admin/users/me`).pipe(
      map(response => response.user)
    );
  }
}
