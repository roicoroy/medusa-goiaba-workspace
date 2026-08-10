/**
 * Environment configuration interface for type safety
 */
export interface Environment {
  production: boolean;
  MEDUSA_API_BASE_PATH: string;
  MEDUSA_PUBLISHABLE_KEY: string;
  MEDUSA_BACKEND_URL?: string;

  // Optional API configurations
  API_TIMEOUT?: number;
  API_RETRY_ATTEMPTS?: number;

  // Feature flags
  ENABLE_LOGGING?: boolean;
  ENABLE_ANALYTICS?: boolean;
  ENABLE_ERROR_REPORTING?: boolean;

  // Third-party service keys
  GOOGLE_CLIENT_ID?: string;
  STRIPE_PUBLISHABLE_KEY?: string;
  PAYPAL_CLIENT_ID?: string;

  // App configuration
  APP_VERSION?: string;
  BUILD_TIMESTAMP?: string;
}

/**
 * Type guard to check if environment is properly configured
 */
export function isValidEnvironment(env: any): env is Environment {
  return (
    typeof env === 'object' &&
    typeof env.production === 'boolean' &&
    typeof env.MEDUSA_API_BASE_PATH === 'string' &&
    typeof env.MEDUSA_PUBLISHABLE_KEY === 'string' &&
    env.MEDUSA_API_BASE_PATH.length > 0 &&
    env.MEDUSA_PUBLISHABLE_KEY.length > 0
  );
}

/**
 * Default environment values
 */
export const DEFAULT_ENVIRONMENT: Partial<Environment> = {
  API_TIMEOUT: 30000,
  API_RETRY_ATTEMPTS: 3,
  ENABLE_LOGGING: true,
  ENABLE_ANALYTICS: false,
  ENABLE_ERROR_REPORTING: true,
};
