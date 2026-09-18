import { STORAGE_KEY, readStore, amount, effects, type Command, type Rule, type Store } from './shared';

// A single writer serializes mutations from tabs, frames and popup: no lost updates.
let queue: Promise<unknown> = Promise.resolve();
async function load(): Promise<Store> { return readStore((await chrome.storage.local.get(STORAGE_KEY))[STORAGE_KEY]); }
function validateRule(rule: Rule): void {
  if (!rule || !/^[a-f0-9-]{36}$/.test(rule.id) || !(rule.effect in effects) || !Number.isFinite(rule.intensity)
    || !['page', 'site'].includes(rule.scope) || !rule.target?.element?.tag || !Array.isArray(rule.target.hosts)
    || !/^https?:\/\//.test(rule.origin) || typeof rule.path !== 'string') throw new Error('Regola non valida');
}
async function handle(message: Command, sender: chrome.runtime.MessageSender): Promise<Store | undefined> {
  if (message.type === 'CONTROL') {
    const extensionPage = sender.url?.startsWith(chrome.runtime.getURL(''));
    if (!extensionPage && message.action !== 'STOP') throw new Error('Comando riservato al popup');
    const tabId = extensionPage ? message.tabId : sender.tab?.id;
    if (tabId === undefined) throw new Error('Scheda non disponibile');
    await chrome.tabs.sendMessage(tabId, { type: 'FRAME_CONTROL', action: message.action, settings: message.settings });
    return;
  }
  const store = await load();
  switch (message.type) {
    case 'GET': return store;
    case 'ADD': {
      validateRule(message.rule);
      const r = message.rule;
      const existing = store.rules.findIndex(x => x.id === r.id);
      const rule = { ...r, intensity: amount(r.intensity) };
      if (existing >= 0) store.rules[existing] = rule; else store.rules.push(rule);
      break;
    }
    case 'REMOVE': store.rules = store.rules.filter(r => !message.ids.includes(r.id)); break;
    case 'SET_ENABLED':
      if (typeof message.enabled !== 'boolean') throw new Error('Stato globale non valido');
      store.enabled = message.enabled; break;
    case 'UPDATE':
      if (!(message.effect in effects) || !Number.isFinite(message.intensity)) throw new Error('Effetto non valido');
      store.rules = store.rules.map(r => message.ids.includes(r.id) ? { ...r, effect: message.effect, intensity: amount(message.intensity) } : r); break;
    case 'SETTINGS':
      if (!(message.settings.effect in effects) || !Number.isFinite(message.settings.intensity) || !['site', 'page'].includes(message.settings.scope)) throw new Error('Impostazioni non valide');
      store.settings = { ...message.settings, intensity: amount(message.settings.intensity) }; break;
    default: throw new Error('Comando sconosciuto');
  }
  await chrome.storage.local.set({ [STORAGE_KEY]: store });
  return store;
}
chrome.runtime.onMessage.addListener((message: Command, sender, reply) => {
  if (sender.id !== chrome.runtime.id || ['FRAME_CONTROL', 'NAVIGATION'].includes(message?.type)) return;
  const task = queue.then(() => handle(message, sender));
  queue = task.catch(() => undefined);
  task.then(store => reply({ ok: true, store }), error => reply({ ok: false, error: String(error.message || error) }));
  return true;
});
function navigation(details: { tabId: number; frameId: number }) {
  chrome.tabs.sendMessage(details.tabId, { type: 'NAVIGATION' }, { frameId: details.frameId }).catch(() => {});
}
chrome.webNavigation.onHistoryStateUpdated.addListener(navigation);
chrome.webNavigation.onReferenceFragmentUpdated.addListener(navigation);
