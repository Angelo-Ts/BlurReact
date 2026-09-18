import { isOwned } from './identity';

/** Temporary hit surfaces: Edge's native media controls swallow page pointer/click events. */
export class MediaSelection {
  private surfaces = new Map<Element, HTMLDivElement>();
  private timer: number;
  constructor(
    private layer: ShadowRoot,
    private roots: () => Array<Document | ShadowRoot>,
    private hover: (element: Element) => void,
    private select: (element: Element) => void,
  ) {
    this.refresh();
    // Only tag queries, only during selection. Includes media added asynchronously by React.
    this.timer = window.setInterval(() => this.refresh(), 250);
  }
  private refresh() {
    const media = new Set(this.roots().flatMap(root => [...root.querySelectorAll('video[controls],audio[controls]')]));
    for (const [element, surface] of this.surfaces) if (!media.has(element) || !element.isConnected) { surface.remove(); this.surfaces.delete(element); }
    for (const element of media) {
      if (this.surfaces.has(element) || isOwned(element)) continue;
      const surface = document.createElement('div');
      surface.dataset.mediaSelection = element.localName;
      surface.style.cssText = 'all:initial;position:fixed;pointer-events:auto;cursor:crosshair;background:transparent;z-index:0;';
      const target = (event: MouseEvent) => {
        // Respect another page element overlapping the video instead of selecting through it.
        const root = element.getRootNode() as Document | ShadowRoot;
        return root.elementsFromPoint(event.clientX, event.clientY).find(e => !isOwned(e)) || element;
      };
      surface.addEventListener('pointermove', event => this.hover(target(event)));
      surface.addEventListener('pointerdown', event => { event.preventDefault(); event.stopPropagation(); });
      surface.addEventListener('click', event => {
        event.preventDefault(); event.stopPropagation(); this.select(target(event));
      });
      this.layer.prepend(surface); this.surfaces.set(element, surface);
    }
    this.position();
  }
  position() {
    for (const [element, surface] of this.surfaces) {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      let left = Math.max(0, rect.left), top = Math.max(0, rect.top);
      let right = Math.min(innerWidth, rect.right), bottom = Math.min(innerHeight, rect.bottom);
      let parent = element.parentElement;
      while (parent) {
        const css = getComputedStyle(parent); const bounds = parent.getBoundingClientRect();
        if (/(hidden|clip|scroll|auto)/.test(css.overflowX)) { left = Math.max(left, bounds.left); right = Math.min(right, bounds.right); }
        if (/(hidden|clip|scroll|auto)/.test(css.overflowY)) { top = Math.max(top, bounds.top); bottom = Math.min(bottom, bounds.bottom); }
        parent = parent.parentElement;
      }
      const visible = element.isConnected && style.visibility === 'visible' && Number(style.opacity) !== 0 && right > left && bottom > top;
      surface.style.display = visible ? 'block' : 'none';
      if (visible) { surface.style.left = left + 'px'; surface.style.top = top + 'px'; surface.style.width = (right-left) + 'px'; surface.style.height = (bottom-top) + 'px'; }
    }
  }
  stop() { clearInterval(this.timer); for (const surface of this.surfaces.values()) surface.remove(); this.surfaces.clear(); }
}
