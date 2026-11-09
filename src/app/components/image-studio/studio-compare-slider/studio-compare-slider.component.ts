import { ChangeDetectionStrategy, Component, signal, input } from '@angular/core';
import { studioText, type StudioLanguage, type StudioTextParams } from '../../../../utils/image-studio/studio-texts';

/** One side of the comparison: the version number it is labelled with, its image source and its alt text. */
export interface CompareSide {
  number: number;
  src: string;
  alt: string;
}

const MIN = 0;
const MAX = 100;
const STEP = 5;
const START = 50;

/**
 * The before/after slider of the full view (US-10.5 FR-10, plan DD-10). Both images are fitted uncropped
 * (`object-contain`) in one frame; the after image is clipped to the divider. The divider is the one
 * `role="slider"` (0..100, start 50): ArrowLeft / ArrowRight move it by 5, Home / End jump to the bounds, and the
 * value is always clamped. Dragging with a pointer is a usability extra (it is not a specification requirement).
 */
@Component({
  selector: 'app-studio-compare-slider',
  standalone: true,
  templateUrl: './studio-compare-slider.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioCompareSliderComponent {
  readonly lang = input.required<StudioLanguage>();
  readonly before = input.required<CompareSide>();
  readonly after = input.required<CompareSide>();

  /** The divider position in percent of the frame width: the before image shows left of it, the after image right of it. */
  protected readonly value = signal(START);
  private dragging = false;

  protected tx(id: string, params?: StudioTextParams): string {
    return studioText(id, this.lang(), params);
  }

  protected onKeydown(event: KeyboardEvent): void {
    let next: number;
    switch (event.key) {
      case 'ArrowLeft':
        next = this.value() - STEP;
        break;
      case 'ArrowRight':
        next = this.value() + STEP;
        break;
      case 'Home':
        next = MIN;
        break;
      case 'End':
        next = MAX;
        break;
      default:
        return;
    }
    event.preventDefault();
    this.value.set(clamp(next));
  }

  protected onPointerDown(event: PointerEvent): void {
    const frame = event.currentTarget as HTMLElement;
    if (frame.getBoundingClientRect().width <= 0) return;
    this.dragging = true;
    frame.setPointerCapture?.(event.pointerId);
    this.moveTo(event, frame);
  }

  protected onPointerMove(event: PointerEvent): void {
    if (this.dragging) this.moveTo(event, event.currentTarget as HTMLElement);
  }

  protected onPointerEnd(event: PointerEvent): void {
    this.dragging = false;
    (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
  }

  private moveTo(event: PointerEvent, frame: HTMLElement): void {
    const rect = frame.getBoundingClientRect();
    if (rect.width <= 0) return;
    this.value.set(clamp(Math.round(((event.clientX - rect.left) / rect.width) * 100)));
  }
}

function clamp(n: number): number {
  return Math.min(MAX, Math.max(MIN, n));
}
