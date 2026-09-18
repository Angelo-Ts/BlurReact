import { OWN, effects, request, pagePath, type Rule, type Settings, type Effect } from '../shared';
import { targetFor, isOwned } from './identity';
import { Engine } from './engine';
import { MediaSelection } from './media-selection';

const CSS_UI = `:host{all:initial!important;position:fixed!important;inset:0!important;pointer-events:none!important;z-index:2147483647!important;font:14px system-ui!important;color:#edf2ff!important;color-scheme:dark!important}*{box-sizing:border-box}#panel{pointer-events:auto;position:fixed;bottom:20px;left:50%;transform:translateX(-50%);width:min(760px,96vw);background:#121827;border:1px solid #52617e;border-radius:16px;padding:14px 18px;box-shadow:0 12px 48px #0008}header,.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}header{justify-content:space-between;margin-bottom:10px}strong{font-size:16px}p{margin:9px 0 0;color:#b8c3d9;font-size:12px}button,select{font:inherit;color:inherit;background:#25314b;border:1px solid #536384;border-radius:8px;padding:7px 10px;cursor:pointer}button:hover{background:#384c76}button.primary{background:#6468ed;border-color:#9295ff}label{display:flex;gap:7px;align-items:center;font-size:12px}input{accent-color:#9194ff;width:110px}#outline{position:fixed;border:2px solid #9b8aff;background:#9b8aff18;box-shadow:0 0 0 1px #171525;pointer-events:none;border-radius:3px}#tag{position:absolute;top:0;left:0;transform:translateY(-100%);font:12px system-ui;background:#6551c7;color:white;padding:3px 7px;white-space:nowrap}#status{min-height:16px}#status.error{color:#ff9f9f}button:disabled{opacity:.5;cursor:default}`;
function make<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string) {
  const node = document.createElement(tag); if (text) node.textContent = text; return node;
}
export class Selection {
  private host?: HTMLElement;
  private current?: Element;
  private leaf?: Element;
  private outline?: HTMLElement;
  private tag?: HTMLElement;
  private status?: HTMLElement;
  private count?: HTMLElement;
  private frame = 0;
  private selected = new Set<string>();
  private settings!: Settings;
  private pending = 0;
  private media?: MediaSelection;
  constructor(private engine: Engine) {}
  configure(settings: Settings) { if (this.host) this.settings = { ...settings }; }
  start(settings: Settings) {
    this.stop(); this.settings = { ...settings }; this.selected.clear();
    const host = make('div'); host.setAttribute(OWN, 'selection'); this.host = host;
    const shadow = host.attachShadow({ mode: 'open' });
    const style = make('style'); style.textContent = CSS_UI; shadow.append(style);
    const panel = make('section'); panel.id = 'panel'; panel.setAttribute('aria-label', 'BlurReact selezione multipla');
    const header = make('header'); const title = make('strong', 'BlurReact'); this.count = make('span', '0 selezionati');
    const done = make('button', 'Fine · Esc'); done.className = 'primary'; done.onclick = () => this.finish();
    header.append(title, this.count, done); panel.append(header);
    const row = make('div'); row.className = 'row';
    const effect = make('select'); effect.setAttribute('aria-label', 'Effetto');
    for (const [value, label] of Object.entries(effects)) { const option = make('option', label); option.value = value; effect.append(option); }
    effect.value = settings.effect;
    const label = make('label', 'Intensità'); const input = make('input'); input.type = 'range'; input.min = '1'; input.max = '40'; input.value = String(settings.intensity);
    input.setAttribute('aria-label', 'Intensità'); const output = make('output', input.value); label.append(input, output);
    const scope = make('select'); scope.setAttribute('aria-label', 'Ambito dei nuovi oscuramenti');
    for (const [value, text] of [['page', 'Questa pagina'], ['site', 'Tutto il sito']]) { const option = make('option', text); option.value = value; scope.append(option); }
    scope.value = settings.scope;
    const up = make('button', '↑ Genitore'); up.onclick = () => this.ancestor(true);
    const down = make('button', '↓ Figlio'); down.onclick = () => this.ancestor(false);
    const apply = make('button', 'Oscura selezione'); apply.onclick = () => { if (this.current) void this.add(this.current); };
    row.append(effect, label, scope, up, down, apply); panel.append(row);
    effect.onchange = () => { this.settings.effect = effect.value as Effect; void this.update(); };
    input.oninput = () => { this.settings.intensity = Number(input.value); output.value = input.value; void this.update(); };
    scope.onchange = () => { this.settings.scope = scope.value as Settings['scope']; void request({ type: 'SETTINGS', settings: this.settings }).catch(e => this.message(e.message, true)); };
    panel.append(make('p', 'Clicca più elementi, senza tasti aggiuntivi. ↑ e ↓ cambiano livello. Effetto e intensità aggiornano gli elementi scelti in questa sessione.'));
    this.status = make('p', 'Le regole vengono salvate automaticamente.'); this.status.id = 'status'; this.status.setAttribute('role', 'status'); panel.append(this.status);
    this.outline = make('div'); this.outline.id = 'outline'; this.outline.hidden = true;
    this.tag = make('span'); this.tag.id = 'tag'; this.outline.append(this.tag);
    if (window.top !== window) panel.style.display = 'none';
    panel.style.zIndex = '2'; this.outline.style.zIndex = '1';
    shadow.append(this.outline, panel); document.documentElement.append(host);
    this.media = new MediaSelection(shadow, () => this.engine.selectionRoots, element => {
      if (element !== this.leaf) { this.leaf = element; this.current = element; }
    }, element => {
      const target = element === this.leaf ? this.current : element;
      if (target) void this.add(target);
    });
    document.addEventListener('pointermove', this.move, true);
    document.addEventListener('pointerdown', this.block, true);
    document.addEventListener('click', this.click, true);
    document.addEventListener('keydown', this.key, true);
    this.draw();
  }
  stop() {
    this.host?.remove(); this.host = undefined; this.current = undefined; this.leaf = undefined;
    this.media?.stop(); this.media = undefined;
    cancelAnimationFrame(this.frame);
    document.removeEventListener('pointermove', this.move, true);
    document.removeEventListener('pointerdown', this.block, true);
    document.removeEventListener('click', this.click, true);
    document.removeEventListener('keydown', this.key, true);
  }
  private finish() { void request({ type: 'CONTROL', tabId: -1, action: 'STOP' }).catch(() => this.stop()); }
  private owned(event: Event) { return event.composedPath().includes(this.host!); }
  private pick(event: Event): Element | undefined {
    let candidate = event.composedPath().find(n => n instanceof Element) as Element | undefined;
    if (!candidate || isOwned(candidate)) return;
    if (candidate.namespaceURI === 'http://www.w3.org/2000/svg') candidate = candidate.closest('svg') || candidate;
    while (candidate.parentElement && ['strong', 'em', 'b', 'i', 'small', 'path', 'tspan'].includes(candidate.localName)) candidate = candidate.parentElement;
    if (['html', 'body', 'script', 'style', 'head'].includes(candidate.localName)) return;
    return candidate;
  }
  private move = (event: PointerEvent) => {
    if (this.owned(event)) return;
    const candidate = this.pick(event);
    if (candidate !== this.leaf) { this.leaf = candidate; this.current = candidate; }
  };
  private block = (event: PointerEvent) => {
    if (this.owned(event)) return;
    event.preventDefault(); event.stopImmediatePropagation();
  };
  private click = (event: MouseEvent) => {
    if (this.owned(event)) return;
    event.preventDefault(); event.stopImmediatePropagation();
    const picked = this.pick(event);
    const target = picked === this.leaf ? this.current : picked;
    if (target) void this.add(target);
  };
  private key = (event: KeyboardEvent) => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); this.finish(); }
    if (!this.owned(event) && ['ArrowUp', 'ArrowDown'].includes(event.key)) { event.preventDefault(); event.stopImmediatePropagation(); this.ancestor(event.key === 'ArrowUp'); }
  };
  private ancestor(up: boolean) {
    if (!this.current) return;
    if (up) { const parent = this.current.parentElement; if (parent && !['body', 'html'].includes(parent.localName)) this.current = parent; }
    else if (this.leaf && this.current !== this.leaf) {
      let next = this.leaf;
      while (next.parentElement && next.parentElement !== this.current) next = next.parentElement;
      if (next.parentElement === this.current) this.current = next;
    }
  }
  private draw = () => {
    if (!this.host) return;
    this.media?.position();
    if (!this.host.isConnected && document.documentElement) document.documentElement.append(this.host);
    if (this.outline && this.current?.isConnected) {
      let rect = this.current.getBoundingClientRect();
      if (!rect.width && !rect.height && this.current.children.length) rect = this.current.children[0].getBoundingClientRect();
      this.outline.hidden = false;
      this.outline.style.cssText = `left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;`;
      if (this.tag) this.tag.textContent = this.current.localName.toUpperCase();
    } else if (this.outline) this.outline.hidden = true;
    this.frame = requestAnimationFrame(this.draw);
  };
  private message(text: string, error = false) { if (this.status) { this.status.textContent = text; this.status.className = error ? 'error' : ''; } }
  private async add(element: Element) {
    const existing = [...this.engine.bindings].find(([, node]) => node === element)?.[0];
    const url = new URL(location.protocol === 'about:' ? document.referrer : location.href);
    const rule: Rule = { id: existing || crypto.randomUUID(), origin: url.origin, path: pagePath(url), scope: this.settings.scope, effect: this.settings.effect, intensity: this.settings.intensity, target: targetFor(element), createdAt: Date.now() };
    this.pending++; this.message('Salvataggio…'); this.engine.preview(rule, element);
    try {
      await request({ type: 'ADD', rule }); this.selected.add(rule.id);
      if (this.count) this.count.textContent = `${this.selected.size} selezionati`;
      this.message('Salvato. Puoi selezionare altri elementi.');
    } catch (error) { this.engine.flush(); this.message(`Non salvato: ${(error as Error).message}`, true); }
    finally { this.pending--; }
  }
  private async update() {
    try {
      await request({ type: 'SETTINGS', settings: this.settings });
      if (this.selected.size) await request({ type: 'UPDATE', ids: [...this.selected], effect: this.settings.effect, intensity: this.settings.intensity });
    } catch (error) { this.message((error as Error).message, true); }
  }
}
