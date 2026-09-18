import { MARK, OWN, amount, type Rule } from '../shared';
import { StyleOverrides } from './overrides';
const NS = 'http://www.w3.org/2000/svg';
export class Effects {
  private roots = new Map<Document | ShadowRoot, { style: HTMLStyleElement; svg: SVGSVGElement }>();
  private applied = new Map<string, Element>();
  private signatures = new Map<Document | ShadowRoot, string>();
  private overrides = new StyleOverrides();
  constructor(private prefix: string) {}
  private ensure(root: Document | ShadowRoot) {
    let entry = this.roots.get(root);
    const parent = root instanceof Document ? root.documentElement : root;
    if (!parent) return;
    if (!entry) {
      const style = document.createElement('style'); style.setAttribute(OWN, '');
      const svg = document.createElementNS(NS, 'svg'); svg.setAttribute(OWN, '');
      svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
      svg.style.cssText = 'position:absolute!important;width:0!important;height:0!important;pointer-events:none!important;';
      entry = { style, svg }; this.roots.set(root, entry);
    }
    if (!entry.style.isConnected) parent.append(entry.style);
    if (!entry.svg.isConnected) parent.append(entry.svg);
    return entry;
  }
  private filter(svg: SVGSVGElement, id: string, rule: Rule) {
    const filter = document.createElementNS(NS, 'filter');
    filter.id = id; filter.setAttribute('x', '0'); filter.setAttribute('y', '0');
    filter.setAttribute('width', '100%'); filter.setAttribute('height', '100%');
    filter.setAttribute('color-interpolation-filters', 'sRGB');
    const primitive = (name: string, attributes: Record<string, string>) => {
      const child = document.createElementNS(NS, name);
      for (const [k, v] of Object.entries(attributes)) child.setAttribute(k, v);
      filter.append(child);
    };
    if (rule.effect === 'blackout') primitive('feFlood', { 'flood-color': '#111827', 'flood-opacity': '1' });
    else {
      const size = amount(rule.intensity); const half = Math.floor(size / 2);
      primitive('feFlood', { x: String(half), y: String(half), width: '1', height: '1', 'flood-color': '#fff' });
      primitive('feComposite', { in2: 'SourceGraphic', operator: 'in', x: '0', y: '0', width: String(size), height: String(size) });
      primitive('feTile', { x: '0', y: '0', width: '100%', height: '100%', result: 'grid' });
      primitive('feComposite', { in: 'SourceGraphic', in2: 'grid', operator: 'in' });
      primitive('feMorphology', { operator: 'dilate', radius: String(Math.max(1, half)) });
    }
    svg.append(filter);
  }
  render(rules: Rule[], bindings: Map<string, Element>) {
    for (const [id, old] of this.applied) {
      if (bindings.get(id) !== old) this.unmark(old, id);
    }
    this.applied = new Map(bindings);
    const groups = new Map<Document | ShadowRoot, Rule[]>();
    for (const rule of rules) {
      const element = bindings.get(rule.id); if (!element) continue;
      const tokens = new Set((element.getAttribute(MARK) || '').split(' ').filter(Boolean));
      if (!tokens.has(rule.id)) { tokens.add(rule.id); element.setAttribute(MARK, [...tokens].join(' ')); }
      const root = element.getRootNode() as Document | ShadowRoot;
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root)!.push(rule);
    }
    for (const root of new Set([...groups.keys(), ...this.roots.keys()])) {
      if (root instanceof ShadowRoot && !root.host.isConnected) { this.roots.delete(root); this.signatures.delete(root); continue; }
      const entry = this.ensure(root); if (!entry) continue;
      const list = groups.get(root) || [];
      const signature = JSON.stringify(list.map(r => [r.id, r.effect, r.intensity]));
      if (this.signatures.get(root) === signature && entry.style.textContent) continue;
      this.signatures.set(root, signature); entry.svg.replaceChildren();
      entry.style.textContent = list.map(rule => {
        const selector = `[${MARK}~="${rule.id}"]`;
        const filterId = `${this.prefix}-${rule.id}`;
        let declaration: string;
        switch (rule.effect) {
          case 'blur': declaration = `filter:blur(${amount(rule.intensity)}px)!important;`; break;
          case 'strong': declaration = `filter:blur(${amount(rule.intensity) * 2.5}px)!important;`; break;
          case 'hide': return `${selector},${selector} *{visibility:hidden!important;}${selector},${selector}[data-blurreact-contents] > *{opacity:0!important;}`;
          default:
            this.filter(entry.svg, filterId, rule);
            declaration = `filter:url("#${filterId}")!important;`;
        }
        // display:contents has no rendering box: apply to each direct child's box.
        return `${selector}{${declaration}}${selector}[data-blurreact-contents] > *{${declaration}}`;
      }).join('\n');
    }
    for (const element of bindings.values()) {
      const contents = getComputedStyle(element).display === 'contents';
      if (contents && !element.hasAttribute('data-blurreact-contents')) element.setAttribute('data-blurreact-contents', '');
      if (!contents && element.hasAttribute('data-blurreact-contents')) element.removeAttribute('data-blurreact-contents');
    }
    const desired = new Map<Element, Map<string, string>>();
    const want = (element: Element, property: string, value: string) => {
      if (!desired.has(element)) desired.set(element, new Map());
      desired.get(element)!.set(property, value);
    };
    for (const rule of rules) {
      const element = bindings.get(rule.id); if (!element) continue;
      const targets = element.hasAttribute('data-blurreact-contents') ? [element, ...element.children] : [element];
      if (rule.effect === 'hide') {
        for (const child of [element, ...element.querySelectorAll('*')]) want(child, 'visibility', 'hidden');
        for (const target of targets) want(target, 'opacity', '0');
      } else {
        const filter = rule.effect === 'blur' ? `blur(${amount(rule.intensity)}px)`
          : rule.effect === 'strong' ? `blur(${amount(rule.intensity) * 2.5}px)` : `url("#${this.prefix}-${rule.id}")`;
        for (const target of targets) want(target, 'filter', filter);
      }
    }
    this.overrides.sync(desired);
  }
  private unmark(element: Element, id: string) {
    const tokens = (element.getAttribute(MARK) || '').split(' ').filter(t => t && t !== id);
    if (tokens.length) element.setAttribute(MARK, tokens.join(' '));
    else { element.removeAttribute(MARK); element.removeAttribute('data-blurreact-contents'); }
  }
}
