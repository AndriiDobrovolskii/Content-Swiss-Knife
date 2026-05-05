import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'safeHtml',
  standalone: true
})
export class SafeHtmlPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string): SafeHtml {
    // Bypasses security checks to allow iframes, scripts, and styles.
    // Only use this for content you explicitly trust.
    return this.sanitizer.bypassSecurityTrustHtml(value);
  }
}