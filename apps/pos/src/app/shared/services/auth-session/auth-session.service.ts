import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private accessToken: string | null = null;

  setAccessToken(token: string | null): void {
    this.accessToken = token;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  clear(): void {
    this.accessToken = null;
  }
}
