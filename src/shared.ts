export const STORAGE_KEY = 'blurreact.v1';
export const MARK = 'data-blurreact';
export const OWN = 'data-blurreact-ui';
export type Effect = 'blur' | 'strong' | 'pixel' | 'blackout' | 'hide';
export type Scope = 'page' | 'site';
export interface Identity {
  tag: string; attrs: Record<string, string>; classes: string[];
  path: string; parent: string; structure: string; textHash: string;
  selectors: string[];
}
export interface Target { hosts: Identity[]; element: Identity }
export interface Rule {
  id: string; origin: string; path: string; scope: Scope;
  effect: Effect; intensity: number; target: Target; createdAt: number;
}
export interface Settings { effect: Effect; intensity: number; scope: Scope; debug: boolean }
export interface Store { version: 1; enabled: boolean; rules: Rule[]; settings: Settings }
export const defaults: Settings = { effect: 'blur', intensity: 12, scope: 'page', debug: false };
export const effects: Record<Effect, string> = { blur: 'Blur', strong: 'Strong Blur', pixel: 'Pixel', blackout: 'Oscura', hide: 'Nascondi' };
export type Command =
  | { type: 'GET' }
  | { type: 'ADD'; rule: Rule }
  | { type: 'REMOVE'; ids: string[] }
  | { type: 'UPDATE'; ids: string[]; effect: Effect; intensity: number }
  | { type: 'SET_ENABLED'; enabled: boolean }
  | { type: 'SETTINGS'; settings: Settings }
  | { type: 'CONTROL'; tabId: number; action: 'START' | 'STOP'; settings?: Settings }
  | { type: 'FRAME_CONTROL'; action: 'START' | 'STOP'; settings?: Settings }
  | { type: 'NAVIGATION' };
export type Reply = { ok: true; store?: Store } | { ok: false; error: string };
export function emptyStore(): Store { return { version: 1, enabled: true, rules: [], settings: { ...defaults } }; }
export function pagePath(url: URL): string { return url.pathname + url.search + url.hash; }
export function applies(rule: Rule, url: URL): boolean {
  return rule.origin === url.origin && (rule.scope === 'site' || rule.path === pagePath(url));
}
export function amount(n: number): number { return Math.min(40, Math.max(1, Math.round(n))); }
export async function request(message: Command): Promise<Store | undefined> {
  const response: Reply = await chrome.runtime.sendMessage(message);
  if (!response?.ok) throw new Error(response?.error || 'Estensione non disponibile. Ricarica la pagina.');
  return response.store;
}
export function readStore(raw: unknown): Store {
  if (raw === undefined) return emptyStore();
  const value = raw as Store;
  const identity = (x: Identity) => x && /^[a-z][a-z0-9-]*$/i.test(x.tag)
    && x.attrs && Object.values(x.attrs).every(a => typeof a === 'string')
    && Array.isArray(x.classes) && x.classes.every(c => typeof c === 'string')
    && typeof x.path === 'string' && typeof x.parent === 'string'
    && typeof x.structure === 'string' && typeof x.textHash === 'string';
  if (!value || value.version !== 1 || !Array.isArray(value.rules) || !value.settings
    || (value.enabled !== undefined && typeof value.enabled !== 'boolean')
    || !(value.settings.effect in effects) || !Number.isFinite(value.settings.intensity)
    || !['page', 'site'].includes(value.settings.scope)
    || !value.rules.every(r => r && /^[a-f0-9-]{36}$/.test(r.id) && typeof r.origin === 'string'
      && typeof r.path === 'string' && ['page', 'site'].includes(r.scope) && r.effect in effects
      && Number.isFinite(r.intensity) && r.target && Array.isArray(r.target.hosts)
      && r.target.hosts.every(identity) && identity(r.target.element))) {
    throw new Error('Formato delle regole non supportato. I dati sono stati conservati.');
  }
  // Migration for beta.1 stores: existing rules remain active by default.
  return { ...value, enabled: typeof value.enabled === 'boolean' ? value.enabled : true };
}
