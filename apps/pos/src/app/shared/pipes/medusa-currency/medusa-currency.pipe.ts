import { Pipe, PipeTransform, inject } from '@angular/core';
import { Store } from '@ngxs/store';
import { RegionsState } from 'src/app/store/regions/regions.state';

@Pipe({
    name: 'medusaCurrency',
    standalone: true,
})
export class MedusaCurrency implements PipeTransform {
    private store = inject(Store);

    /**
     * Transform Medusa price (in cents) to formatted currency string
     * @param value - Price in cents (e.g., 1000 = $10.00)
     * @param currency_code - Optional currency code override
     * @param locale - Optional locale override
     * @returns Formatted currency string
     */
    transform(value: any, currency_code?: string, locale?: string): string {
        // Handle null, undefined, or invalid values
        if (value === null || value === undefined || isNaN(Number(value))) {
            return 'Price not available';
        }

        const numericValue = Number(value);

        // Get the current selected region
        const currentRegion = this.store.selectSnapshot(RegionsState.getDefaultRegion);
        const regionCurrency = currentRegion?.currency_code || 'USD';

        // Use the provided currency_code if available, otherwise use the region's currency
        const currencyToUse = currency_code || regionCurrency;

        // Get appropriate locale for the currency
        const localeToUse = locale || this.getCurrencyLocale(currencyToUse);

        try {
            // Medusa stores prices in smallest currency unit (cents)
            // Convert to actual currency value
            const actualPrice = numericValue;

            // Format using Intl.NumberFormat for proper localization
            const formatter = new Intl.NumberFormat(localeToUse, {
                style: 'currency',
                currency: currencyToUse.toUpperCase(),
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });


            return formatter.format(actualPrice);
        } catch (error) {
            console.warn('Error formatting currency:', error);
            // Fallback to simple format
            return `${this.getCurrencySymbol(currencyToUse)}${(numericValue / 100).toFixed(2)}`;
        }
    }

    /**
     * Get appropriate locale for currency formatting
     */
    private getCurrencyLocale(currency: string): string {
        const currencyLocaleMap: { [key: string]: string } = {
            'USD': 'en-US',
            'EUR': 'de-DE',
            'GBP': 'en-GB',
            'JPY': 'ja-JP',
            'CAD': 'en-CA',
            'AUD': 'en-AU',
            'BRL': 'pt-BR',
            'INR': 'en-IN',
            'CNY': 'zh-CN',
            'KRW': 'ko-KR',
            'MXN': 'es-MX',
            'CHF': 'de-CH',
            'SEK': 'sv-SE',
            'NOK': 'nb-NO',
            'DKK': 'da-DK'
        };

        return currencyLocaleMap[currency.toUpperCase()] || 'en-US';
    }

    /**
     * Get currency symbol as fallback
     */
    private getCurrencySymbol(currency: string): string {
        const symbolMap: { [key: string]: string } = {
            'USD': '$',
            'EUR': '€',
            'GBP': '£',
            'JPY': '¥',
            'CAD': 'C$',
            'AUD': 'A$',
            'BRL': 'R$',
            'INR': '₹',
            'CNY': '¥',
            'KRW': '₩',
            'MXN': '$',
            'CHF': 'CHF',
            'SEK': 'kr',
            'NOK': 'kr',
            'DKK': 'kr'
        };

        return symbolMap[currency.toUpperCase()] || currency.toUpperCase() + ' ';
    }
}
