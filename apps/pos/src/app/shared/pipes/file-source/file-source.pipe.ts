import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Capacitor } from '@capacitor/core';

@Pipe({ name: 'fileSource' })
export class FileSourcePipe implements PipeTransform {
  private readonly domSanitizer = inject(DomSanitizer);

  // Allowed URL patterns for security
  private readonly allowedProtocols = ['http:', 'https:', 'file:', 'content:', 'capacitor:'];
  private readonly dangerousPatterns = ['javascript:', 'data:', 'vbscript:', 'file://'];

  public transform(value: string | Blob): SafeUrl | string {
    if (typeof value === 'string') {
      // Validate URL before sanitizing
      if (!this.isValidUrl(value)) {
        console.error('FileSourcePipe: Invalid or potentially dangerous URL detected:', value);
        return '';
      }
      
      const fileSrc = Capacitor.convertFileSrc(value);
      // Additional validation after Capacitor conversion
      if (!this.isValidUrl(fileSrc)) {
        console.error('FileSourcePipe: Invalid URL after Capacitor conversion:', fileSrc);
        return '';
      }
      
      return this.domSanitizer.bypassSecurityTrustUrl(fileSrc);
    } else {
      // Blob URLs are safe as they're created by the browser
      return URL.createObjectURL(value);
    }
  }

  /**
   * Validates that a URL is safe to use
   * @param url The URL to validate
   * @returns true if the URL is safe, false otherwise
   */
  private isValidUrl(url: string): boolean {
    if (!url || typeof url !== 'string') {
      return false;
    }

    // Check for dangerous patterns
    const lowerUrl = url.toLowerCase().trim();
    for (const pattern of this.dangerousPatterns) {
      if (lowerUrl.startsWith(pattern)) {
        return false;
      }
    }

    // For relative paths or Capacitor file paths, allow them (they're converted by Capacitor)
    if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
      return true;
    }

    // For absolute URLs, validate protocol
    try {
      const urlObj = new URL(url);
      return this.allowedProtocols.includes(urlObj.protocol);
    } catch {
      // If URL parsing fails, it might be a relative path which is acceptable
      // after Capacitor conversion
      return true;
    }
  }
}
