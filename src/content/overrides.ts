type InlineElement = HTMLElement | SVGElement;
interface Override { value: string; priority: string; applied: string }
/** Only used when page !important styles defeat the extension stylesheet. */
export class StyleOverrides {
  private previous = new Map<InlineElement, Map<string, Override>>();
  sync(desired: Map<Element, Map<string, string>>) {
    for (const [element, properties] of this.previous) {
      for (const [property, saved] of properties) {
        if (desired.get(element)?.has(property)) continue;
        // Do not undo an unrelated site update made after our last write.
        if (element.style.getPropertyValue(property) === saved.applied && element.style.getPropertyPriority(property) === 'important') {
          if (saved.value) element.style.setProperty(property, saved.value, saved.priority);
          else element.style.removeProperty(property);
        }
        properties.delete(property);
      }
      if (!properties.size) this.previous.delete(element);
    }
    for (const [candidate, desiredProperties] of desired) {
      if (!(candidate instanceof HTMLElement || candidate instanceof SVGElement)) continue;
      const element = candidate;
      for (const [property, wanted] of desiredProperties) {
        let saved = this.previous.get(element)?.get(property);
        const current = element.style.getPropertyValue(property);
        const priority = element.style.getPropertyPriority(property);
        if (saved && (current !== saved.applied || priority !== 'important')) {
          saved.value = current; saved.priority = priority;
        }
        if (!saved && getComputedStyle(element).getPropertyValue(property) === wanted) continue;
        if (!saved) {
          saved = { value: current, priority, applied: wanted };
          if (!this.previous.has(element)) this.previous.set(element, new Map());
          this.previous.get(element)!.set(property, saved);
        }
        saved.applied = wanted;
        if (current !== wanted || priority !== 'important') element.style.setProperty(property, wanted, 'important');
      }
    }
  }
}
