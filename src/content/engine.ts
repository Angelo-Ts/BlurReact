import { applies, OWN, MARK, type Store, type Rule } from '../shared';
import { Effects } from './effects';
import { isOwned, match, resolveRoot, compatible, candidates } from './identity';

export class Engine {
  store?: Store;
  bindings = new Map<string, Element>();
  status = new Map<string, string>();
  private pools = new Map<string, Set<Element>>();
  private poolRoots = new Map<string, Document | ShadowRoot>();
  private roots = new Set<Document | ShadowRoot>();
  private customHosts = new Set<Element>();
  private dirty = new Set<Element>();
  private attributes = new Set<Element>();
  private full = true;
  private timer?: number;
  private url = location.href;
  private effects = new Effects(`br-${crypto.randomUUID()}`);
  private observers = new Map<Document | ShadowRoot, MutationObserver>();
  onChange = () => {};
  get selectionRoots() { return [...this.roots].filter(root => root instanceof Document || root.host.isConnected); }
  constructor() {
    this.observe(document);
    addEventListener('popstate', () => this.navigate());
    addEventListener('hashchange', () => this.navigate());
    addEventListener('pageshow', () => this.navigate(true));
    // URL fallback also covers page-world history replacements without patching framework methods.
    setInterval(() => {
      this.navigate();
      for (const host of this.customHosts) {
        if (!host.isConnected) { this.customHosts.delete(host); continue; }
        if (host.shadowRoot && !this.roots.has(host.shadowRoot)) { this.discover(host.shadowRoot); this.full = true; this.schedule(); }
      }
    }, 700);
  }
  setStore(store: Store) { this.store = store; this.full = true; this.flush(); }
  navigate(force = false) {
    if (force || this.url !== location.href) { this.url = location.href; this.full = true; this.flush(); }
  }
  private observe(root: Document | ShadowRoot) {
    if (this.roots.has(root)) return;
    this.roots.add(root);
    const observer = new MutationObserver(records => {
      let changed = false;
      for (const record of records) {
        if (record.target instanceof Element && isOwned(record.target)) continue;
        if (record.type === 'attributes' && (record.attributeName === MARK || record.attributeName === 'data-blurreact-contents')) {
          // Only an external removal needs repair; our own writes must not create an observer loop.
          if (record.target instanceof Element && !record.target.hasAttribute(MARK) && [...this.bindings.values()].includes(record.target)) changed = true;
          continue;
        }
        if (record.type === 'childList') {
          const nodes = [...record.addedNodes, ...record.removedNodes];
          if (nodes.length && nodes.every(n => n instanceof Element && n.hasAttribute(OWN))) {
            if (record.removedNodes.length) changed = true;
            continue;
          }
          for (const node of record.addedNodes) if (node instanceof Element && !isOwned(node)) {
            this.dirty.add(node); this.discover(node);
          }
        }
        // Existing candidates remain in the pool and are rescored without subtree scans.
        // Scan only inserted subtrees; changes on body/root must not scan the entire page.
        if (record.type === 'attributes' && record.target instanceof Element) this.attributes.add(record.target);
        changed = true;
      }
      if (changed) this.schedule();
    });
    observer.observe(root, { subtree: true, childList: true, attributes: true, characterData: true });
    this.observers.set(root, observer);
    this.discover(root);
  }
  private discover(start: Element | Document | ShadowRoot) {
    const visit = (element: Element) => {
      if (isOwned(element)) return;
      // React or third-party code may clone an already masked node, including our marker.
      // A copied marker is not an identity and must never mask an unrelated duplicate.
      if (element.hasAttribute(MARK)) {
        const tokens = (element.getAttribute(MARK) || '').split(' ').filter(id => this.bindings.get(id) === element);
        if (!tokens.length) element.removeAttribute(MARK);
        else if (tokens.join(' ') !== element.getAttribute(MARK)) element.setAttribute(MARK, tokens.join(' '));
      }
      if (element.localName.includes('-')) this.customHosts.add(element);
      if (element.shadowRoot) this.observe(element.shadowRoot);
    };
    if (start instanceof Element) visit(start);
    for (const node of start.querySelectorAll('*')) visit(node);
  }
  private schedule() {
    if (this.timer !== undefined) return;
    // Microtask execution from MutationObserver keeps ordinary React commits masked before paint.
    // Cap repeated batches to one frame only when a page performs asynchronous mutation storms.
    this.timer = 1;
    queueMicrotask(() => { this.timer = undefined; this.flush(); });
  }
  flush() {
    if (!this.store || !document.documentElement) return;
    const url = new URL(location.href);
    // about:blank frames inherit origin but do not have a useful page scope.
    if (url.protocol === 'about:' && document.referrer) { try { url.href = document.referrer; } catch {} }
    const rules = this.store.rules.filter(r => applies(r, url));
    const ids = new Set(rules.map(r => r.id));
    for (const id of this.pools.keys()) if (!ids.has(id)) { this.pools.delete(id); this.poolRoots.delete(id); }
    for (const [root, observer] of this.observers) if (root instanceof ShadowRoot && !root.host.isConnected) {
      observer.disconnect(); this.observers.delete(root); this.roots.delete(root);
    }
    const next = new Map<string, Element>(); this.status.clear();
    for (const rule of rules) {
      const root = resolveRoot(rule.target);
      if (!root) { this.status.set(rule.id, 'In attesa del componente'); continue; }
      if (!this.roots.has(root)) this.observe(root);
      let pool = this.pools.get(rule.id);
      if (this.full || !pool || this.poolRoots.get(rule.id) !== root) {
        pool = new Set(candidates(rule.target.element, root)); this.pools.set(rule.id, pool); this.poolRoots.set(rule.id, root);
      } else {
        for (const node of pool) if (!node.isConnected || node.getRootNode() !== root || !compatible(rule.target.element, node)) pool.delete(node);
        for (const node of this.attributes) if (node.getRootNode() === root && compatible(rule.target.element, node)) pool.add(node);
        for (const changed of this.dirty) {
          if (!changed.isConnected || changed.getRootNode() !== root || isOwned(changed)) continue;
          if (compatible(rule.target.element, changed)) pool.add(changed);
          for (const node of candidates(rule.target.element, changed)) pool.add(node);
        }
      }
      const result = match(rule.target.element, pool);
      if (result.element) { next.set(rule.id, result.element); this.status.set(rule.id, 'Applicata'); }
      else this.status.set(rule.id, result.ambiguous ? 'Corrispondenza ambigua' : 'In attesa dell’elemento');
      if (this.store.settings.debug && this.bindings.get(rule.id) !== result.element) console.debug('[BlurReact]', rule.id, this.status.get(rule.id), result.confidence);
    }
    this.bindings = next;
    this.effects.render(rules, next);
    this.full = false; this.dirty.clear(); this.attributes.clear(); this.onChange();
  }
  preview(rule: Rule, element: Element) {
    if (!this.store) return;
    this.bindings.set(rule.id, element);
    this.effects.render([...this.store.rules.filter(r => r.id !== rule.id), rule], this.bindings);
  }
}
