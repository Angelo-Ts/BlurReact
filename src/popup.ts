import { applies, effects, request, defaults, readStore, type Effect, type Store, type Settings, STORAGE_KEY } from './shared';
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
let tabId: number | undefined;
let urls: URL[] = [];
let store: Store;
const effect = $<HTMLSelectElement>('effect');
const intensity = $<HTMLInputElement>('intensity');
const scope = $<HTMLSelectElement>('scope');
function status(text: string, error = false) { $('status').textContent = text; $('status').className = error ? 'error' : ''; }
function settings(): Settings { return { effect: effect.value as Effect, intensity: Number(intensity.value), scope: scope.value as Settings['scope'], debug: store?.settings.debug || false }; }
function hint() {
  const solid = ['blackout', 'hide'].includes(effect.value);
  intensity.disabled = solid;
  $('effect-hint').textContent = solid ? 'Copertura completa. Questo effetto non richiede intensità.' : 'Seleziona più elementi con clic consecutivi.';
  $<HTMLOutputElement>('value').value = solid ? '—' : intensity.value;
}
async function saveSettings() {
  hint();
  try { await request({ type: 'SETTINGS', settings: settings() }); }
  catch (e) { status((e as Error).message, true); }
}
function relevant() { return store.rules.filter(r => urls.some(url => r.origin === url.origin)); }
function render() {
  if (document.activeElement instanceof HTMLInputElement && document.activeElement.type === 'range') return;
  const list = $('rules'); list.replaceChildren();
  const rules = relevant(); $('count').textContent = String(rules.length);
  if (!rules.length) { const p = document.createElement('p'); p.className = 'empty'; p.textContent = 'Nessun oscuramento salvato per questo sito.'; list.append(p); }
  for (const rule of rules) {
    const row = document.createElement('article'); row.className = 'rule'; row.dataset.ruleId = rule.id;
    const header = document.createElement('header');
    const name = document.createElement('strong'); name.textContent = rule.target.element.tag.toUpperCase();
    const info = document.createElement('small'); info.textContent = `${new URL(rule.origin).hostname} · ${rule.scope === 'site' ? 'Tutto il sito' : rule.path}`;
    header.append(name, info); row.append(header);
    const controls = document.createElement('div'); controls.className = 'controls';
    const select = document.createElement('select'); select.setAttribute('aria-label', `Effetto ${name.textContent}`);
    for (const [value, text] of Object.entries(effects)) { const option = document.createElement('option'); option.value = value; option.textContent = text; select.append(option); }
    select.value = rule.effect;
    const range = document.createElement('input'); range.type = 'range'; range.min = '1'; range.max = '40'; range.value = String(rule.intensity); range.setAttribute('aria-label', `Intensità ${name.textContent}`); range.disabled = ['hide', 'blackout'].includes(rule.effect);
    const update = async () => {
      try { await request({ type: 'UPDATE', ids: [rule.id], effect: select.value as Effect, intensity: Number(range.value) }); status('Modifica salvata.'); }
      catch (e) { status((e as Error).message, true); }
    };
    select.onchange = update; range.oninput = update;
    range.onblur = () => render();
    const remove = document.createElement('button'); remove.textContent = 'Ripristina'; remove.onclick = () => restore([rule.id]);
    controls.append(select, range, remove); row.append(controls); list.append(row);
  }
  $<HTMLButtonElement>('restore-page').disabled = !rules.some(r => urls.some(u => applies(r, u)));
  $<HTMLButtonElement>('restore-site').disabled = !rules.length;
}
async function restore(ids: string[]) {
  try { await request({ type: 'REMOVE', ids }); status('Ripristino salvato.'); }
  catch (e) { status((e as Error).message, true); }
}
$('start').onclick = async () => {
  if (tabId === undefined) return;
  try { await request({ type: 'SETTINGS', settings: settings() }); await request({ type: 'CONTROL', tabId, action: 'START', settings: settings() }); window.close(); }
  catch { status('Pagina non accessibile. Ricarica la scheda dopo l’installazione. Edge, store e PDF possono impedire l’accesso.', true); }
};
$('stop').onclick = async () => {
  if (tabId === undefined) return;
  try { await request({ type: 'CONTROL', tabId, action: 'STOP' }); status('Selezione terminata. Gli oscuramenti restano salvati.'); }
  catch { status('Nessuna pagina accessibile.', true); }
};
effect.onchange = saveSettings; intensity.oninput = saveSettings; intensity.onblur = () => render(); scope.onchange = saveSettings;
$('restore-page').onclick = () => restore(relevant().filter(r => urls.some(u => applies(r, u))).map(r => r.id));
$('restore-site').onclick = () => restore(relevant().map(r => r.id));
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[STORAGE_KEY]) { store = readStore(changes[STORAGE_KEY].newValue); render(); }
});
async function init() {
  try {
    store = (await request({ type: 'GET' }))!;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    tabId = tab?.id;
    if (tab?.url) urls.push(new URL(tab.url));
    if (tabId !== undefined) {
      const frames = await chrome.webNavigation.getAllFrames({ tabId });
      for (const frame of frames || []) { try { const url = new URL(frame.url); if (['http:', 'https:'].includes(url.protocol)) urls.push(url); } catch {} }
    }
    $('site').textContent = urls[0]?.hostname || 'Pagina non accessibile';
    const initial = store.settings || defaults;
    effect.value = initial.effect; intensity.value = String(initial.intensity); scope.value = initial.scope;
    hint(); render();
    $<HTMLButtonElement>('start').disabled = !urls.some(u => ['https:', 'http:'].includes(u.protocol));
  } catch (e) { status((e as Error).message, true); }
}
void init();
