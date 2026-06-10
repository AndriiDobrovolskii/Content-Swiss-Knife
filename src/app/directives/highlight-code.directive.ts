import { Directive, ElementRef, Input, OnChanges, inject } from '@angular/core';
import hljs from 'highlight.js/lib/core';
import xml from 'highlight.js/lib/languages/xml';

hljs.registerLanguage('xml', xml);

@Directive({ selector: '[appHighlightCode]', standalone: true })
export class HighlightCodeDirective implements OnChanges {
  @Input() appHighlightCode = '';
  private el = inject(ElementRef);

  ngOnChanges() {
    const result = hljs.highlight(this.appHighlightCode, { language: 'xml' });
    this.el.nativeElement.innerHTML = result.value;
  }
}
