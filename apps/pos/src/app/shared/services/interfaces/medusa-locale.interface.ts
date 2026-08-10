/**
 * Medusa Locale Interfaces
 * Based on Medusa.js Store API locale schema
 * @see https://docs.medusajs.com/api/store#locales_locale_schema
 */

export interface MedusaLocale {
  /**
   * Locale code in IETF BCP 47 format (e.g., "en-US", "pt-BR", "fr-FR")
   */
  code: string;

  /**
   * Display name of the locale (e.g., "English (United States)", "Portuguese (Brazil)")
   */
  name: string;
}

export interface MedusaLocalesResponse {
  /**
   * Array of supported locales
   */
  locales: MedusaLocale[];
}

