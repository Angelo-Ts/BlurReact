import { OWN, type Identity, type Target } from '../shared';
const stableNames = ['id', 'data-testid', 'data-test', 'data-qa', 'data-id', 'name', 'aria-label', 'role', 'type', 'alt'];
const strongNames = ['id', 'data-testid', 'data-test', 'data-qa', 'data-id'];
export const isOwned = (element: Element): boolean => element.hasAttribute(OWN) || !!element.closest(`[${OWN}]`);
export function hash(text: string): string {
  let n = 2166136261;
  for (const char of text) n = Math.imul(n ^ char.charCodeAt(0), 16777619);
  return (n >>> 0).toString(36);
}
function stable(value: string): boolean {
  return value.length < 160 && !/^(:r|:R|_r_|radix-|react-aria)/.test(value) && !/[a-f0-9]{12,}/i.test(value);
}
function attrs(element: Element): Record<string, string> {
  return Object.fromEntries(stableNames.flatMap(name => {
    const value = element.getAttribute(name);
    return value && stable(value) ? [[name, value]] : [];
  }));
}
function attributeSelector(tag: string, name: string, value: string): string {
  return `${tag}[${CSS.escape(name)}="${CSS.escape(value)}"]`;
}
function path(element: Element): string {
  const parts: string[] = [];
  let node: Element | null = element;
  while (node) {
    const a = attrs(node);
    const key = strongNames.find(k => a[k]);
    if (key) { parts.unshift(attributeSelector(node.localName, key, a[key])); break; }
    let part = node.localName;
    if (node.parentElement) {
      const siblings = [...node.parentElement.children].filter(s => s.localName === node!.localName);
      part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
    }
    parts.unshift(part);
    node = node.parentElement;
  }
  return parts.join(' > ');
}
export function identify(element: Element): Identity {
  const attributes = attrs(element);
  const tag = element.localName;
  return {
    tag, attrs: attributes,
    classes: [...element.classList].filter(c => stable(c) && !/^(css-|sc-|jsx-)/.test(c)).slice(0, 6),
    path: path(element), parent: element.parentElement ? path(element.parentElement) : '',
    structure: [...element.children].filter(e => !isOwned(e)).map(e => e.localName).slice(0, 30).join(','),
    // Never persist form values or plaintext from the page.
    textHash: hash((element.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 500)),
    selectors: Object.entries(attributes).map(([k, v]) => attributeSelector(tag, k, v)),
  };
}
export function targetFor(element: Element): Target {
  const hosts: Identity[] = [];
  let root = element.getRootNode();
  while (root instanceof ShadowRoot) { hosts.unshift(identify(root.host)); root = root.host.getRootNode(); }
  return { hosts, element: identify(element) };
}
export function compatible(identity: Identity, candidate: Element): boolean {
  return candidate.localName === identity.tag && !isOwned(candidate)
    && strongNames.every(name => !identity.attrs[name] || candidate.getAttribute(name) === identity.attrs[name]);
}
export function candidates(identity: Identity, root: Document | ShadowRoot | Element): Element[] {
  const key = strongNames.find(name => identity.attrs[name]);
  const selector = key ? attributeSelector(identity.tag, key, identity.attrs[key]) : identity.tag;
  return [...root.querySelectorAll(selector)].filter(e => compatible(identity, e));
}
export function score(identity: Identity, candidate: Element): number {
  if (!compatible(identity, candidate)) return -1000;
  const current = identify(candidate);
  let result = 10;
  for (const [key, value] of Object.entries(identity.attrs)) {
    if (current.attrs[key] === value) result += strongNames.includes(key) ? 110 : 32;
    else if (strongNames.includes(key)) return -1000;
    else result -= 18;
  }
  if (current.parent === identity.parent) result += 25;
  if (current.path === identity.path) result += 15;
  if (current.structure === identity.structure) result += 12;
  if (identity.textHash !== hash('') && current.textHash === identity.textHash) result += 24;
  result += identity.classes.filter(c => current.classes.includes(c)).length * 7;
  return result;
}
export function match(identity: Identity, candidates: Iterable<Element>): { element?: Element; confidence: number; ambiguous: boolean } {
  const ranked = [...candidates].filter(e => e.isConnected).map(element => ({ element, score: score(identity, element) })).sort((a, b) => b.score - a.score);
  const best = ranked[0];
  const ambiguous = !!best && !!ranked[1] && best.score - ranked[1].score < 20;
  return { element: best && best.score >= 62 && !ambiguous ? best.element : undefined, confidence: best?.score || 0, ambiguous };
}
export function resolveRoot(target: Target): Document | ShadowRoot | undefined {
  let root: Document | ShadowRoot = document;
  for (const host of target.hosts) {
    const result = match(host, candidates(host, root));
    if (!result.element?.shadowRoot) return;
    root = result.element.shadowRoot;
  }
  return root;
}
