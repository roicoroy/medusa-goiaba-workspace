import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

/**
 * HTTP options interface for requests
 */
export interface HttpOptions {
  headers?: HttpHeaders;
  withCredentials?: boolean;
}

/**
 * Abstract base service providing common HTTP methods and utilities
 * All API services should extend this class to eliminate code duplication
 *
 * Note: This class does NOT handle authentication headers - that is delegated
 * to the Auth Interceptor for centralized header management
 */
@Injectable()
export abstract class BaseHttpService {
  /**
   * Base URL for API requests - must be defined by child classes
   */
  protected abstract baseUrl: string;

  /**
   * Injected HttpClient instance
   */
  protected http = inject(HttpClient);

  /**
   * Generic GET request with error handling
   * @param endpoint API endpoint (will be appended to baseUrl)
   * @param options Optional HTTP options (headers, credentials)
   * @returns Observable of type T
   */
  protected get<T>(endpoint: string, options?: HttpOptions): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${endpoint}`, options).pipe(
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Generic POST request with error handling
   * @param endpoint API endpoint (will be appended to baseUrl)
   * @param body Request body
   * @param options Optional HTTP options (headers, credentials)
   * @returns Observable of type T
   */
  protected post<T>(endpoint: string, body: any, options?: HttpOptions): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${endpoint}`, body, options).pipe(
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Generic PUT request with error handling
   * @param endpoint API endpoint (will be appended to baseUrl)
   * @param body Request body
   * @param options Optional HTTP options (headers, credentials)
   * @returns Observable of type T
   */
  protected put<T>(endpoint: string, body: any, options?: HttpOptions): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}${endpoint}`, body, options).pipe(
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Generic DELETE request with error handling
   * @param endpoint API endpoint (will be appended to baseUrl)
   * @param options Optional HTTP options (headers, credentials)
   * @returns Observable of type T
   */
  protected delete<T>(endpoint: string, options?: HttpOptions): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}${endpoint}`, options).pipe(
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Centralized error handling with user-friendly messages
   * Transforms HTTP errors into consistent error objects with userMessage property
   * @param error HttpErrorResponse from failed request
   * @returns Observable that throws enhanced error object
   */
  protected handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';
    let isNetworkError = false;

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      // Handle specific HTTP status codes
      switch (error.status) {
        case 0:
          // Network connectivity issues
          isNetworkError = true;
          if (error.url?.includes('localhost') || error.url?.includes('127.0.0.1')) {
            errorMessage = 'Backend server is not running. Please start the Medusa server on localhost:9000';
          } else {
            errorMessage = 'Network connection failed. Please check your internet connection.';
          }
          break;
        case 400:
          // Use server error message if available, otherwise generic message
          // Try multiple possible error message locations from the server response
          errorMessage = error.error?.error || error.error?.message || 'Bad Request: Please check your input';
          break;
        case 401:
          errorMessage = 'Unauthorized: Please log in again';
          break;
        case 403:
          errorMessage = 'Forbidden: You do not have permission';
          break;
        case 404:
          errorMessage = 'Not Found: The requested resource was not found';
          break;
        case 409:
          // Conflict errors - check for specific error types
          if (error.error?.error === 'DUPLICATE_REVIEW') {
            errorMessage = error.error.message || 'You have already submitted a review for this item.';
          } else {
            errorMessage = error.error?.message || error.error?.error || 'Conflict: This action conflicts with existing data';
          }
          break;
        case 422:
          errorMessage = 'Validation Error: Please check your input';
          break;
        case 500:
          // Try to get server error message first
          const serverError = error.error?.error || error.error?.message;
          if (serverError) {
            errorMessage = serverError;
          } else if (error.url?.includes('/store/carts')) {
            errorMessage = 'Cart service is experiencing issues. This may be due to server configuration problems.';
          } else {
            errorMessage = 'Server Error: Please try again later';
          }
          break;
        case 502:
          errorMessage = 'Bad Gateway: Server is temporarily unavailable';
          break;
        case 503:
          errorMessage = 'Service Unavailable: Server is temporarily down';
          break;
        case 504:
          errorMessage = 'Gateway Timeout: Server took too long to respond';
          break;
        default:
          errorMessage = `Server Error: ${error.status} - ${error.message}`;
          break;
      }
    }

    // Log only essential error info
    console.error(`HTTP ${error.status}: ${errorMessage}`);

    // Return enhanced error object with user-friendly message
    return throwError(() => ({
      ...error,
      userMessage: errorMessage,
      isNetworkError
    }));
  }

  /**
   * Build query string from parameters following Medusa API patterns
   * Supports arrays (key[]) and nested objects (key[nestedKey])
   *
   * Examples:
   * - { limit: 20 } => "limit=20"
   * - { status: ['pending', 'completed'] } => "status[]=pending&status[]=completed"
   * - { created_at: { gt: '2023-01-01' } } => "created_at[gt]=2023-01-01"
   *
   * @param params Object containing query parameters
   * @returns URL-encoded query string (without leading '?')
   */
  protected buildQueryString(params: Record<string, any>): string {
    const searchParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          // Handle array parameters like category_id[]
          value.forEach(item => {
            searchParams.append(`${key}[]`, item.toString());
          });
        } else if (typeof value === 'object') {
          // Handle nested objects like created_at: { gt: '2023-01-01' }
          Object.entries(value).forEach(([nestedKey, nestedValue]) => {
            if (nestedValue !== undefined && nestedValue !== null) {
              searchParams.append(`${key}[${nestedKey}]`, nestedValue.toString());
            }
          });
        } else {
          // Handle simple values
          searchParams.append(key, value.toString());
        }
      }
    });

    return searchParams.toString();
  }
}
