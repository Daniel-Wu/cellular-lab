export class TouchUtils {
  static readonly MIN_TOUCH_TARGET_SIZE = 44;

  static preventZoom(): void {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 
        'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
      );
    }
  }

  static restoreZoom(): void {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      viewport.setAttribute('content', 
        'width=device-width, initial-scale=1.0'
      );
    }
  }

  static normalizeTouch(event: TouchEvent): { x: number; y: number } | null {
    if (event.touches.length !== 1) return null;
    
    const touch = event.touches[0];
    if (!touch) return null;
    return {
      x: touch.clientX,
      y: touch.clientY
    };
  }

  static getTouchTarget(event: TouchEvent): Element | null {
    if (event.touches.length !== 1) return null;
    
    const touch = event.touches[0];
    if (!touch) return null;
    return document.elementFromPoint(touch.clientX, touch.clientY);
  }

  static calculateDistance(
    touch1: { x: number; y: number },
    touch2: { x: number; y: number }
  ): number {
    const dx = touch2.x - touch1.x;
    const dy = touch2.y - touch1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  static isTouchTargetSizeValid(element: Element): boolean {
    const rect = element.getBoundingClientRect();
    return rect.width >= this.MIN_TOUCH_TARGET_SIZE && 
           rect.height >= this.MIN_TOUCH_TARGET_SIZE;
  }

  static addTouchTargetPadding(element: HTMLElement): void {
    const rect = element.getBoundingClientRect();
    if (rect.width < this.MIN_TOUCH_TARGET_SIZE) {
      const paddingX = (this.MIN_TOUCH_TARGET_SIZE - rect.width) / 2;
      element.style.paddingLeft = `${paddingX}px`;
      element.style.paddingRight = `${paddingX}px`;
    }
    if (rect.height < this.MIN_TOUCH_TARGET_SIZE) {
      const paddingY = (this.MIN_TOUCH_TARGET_SIZE - rect.height) / 2;
      element.style.paddingTop = `${paddingY}px`;
      element.style.paddingBottom = `${paddingY}px`;
    }
  }

  static debounce<T extends (...args: unknown[]) => void>(
    func: T,
    wait: number
  ): T {
    let timeout: number;
    return ((...args: unknown[]) => {
      clearTimeout(timeout);
      timeout = window.setTimeout(() => func.apply(null, args), wait);
    }) as T;
  }

  static createTouchSafeHandler<T extends Event>(
    handler: (event: T) => void,
    options: { preventDefault?: boolean; stopPropagation?: boolean } = {}
  ): (event: T) => void {
    return (event: T) => {
      if (options.preventDefault) {
        event.preventDefault();
      }
      if (options.stopPropagation) {
        event.stopPropagation();
      }
      handler(event);
    };
  }
}