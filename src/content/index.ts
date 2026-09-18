import { STORAGE_KEY, readStore, defaults, type Command } from '../shared';
import { Engine } from './engine';
import { Selection } from './selection';
const engine = new Engine();
const selection = new Selection(engine);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes[STORAGE_KEY]) {
    try {
      const next = readStore(changes[STORAGE_KEY].newValue);
      const previous = engine.store?.settings;
      if (!previous || next.settings.effect !== previous.effect || next.settings.intensity !== previous.intensity || next.settings.scope !== previous.scope) selection.configure(next.settings);
      engine.setStore(next);
    }
    catch (error) { console.error('[BlurReact]', error); }
  }
});
chrome.storage.local.get(STORAGE_KEY).then(data => {
  // A storage event may have delivered a newer snapshot while this initial read was pending.
  if (!engine.store) engine.setStore(readStore(data[STORAGE_KEY]));
}).catch(error => console.error('[BlurReact] Impossibile caricare le regole', error));
chrome.runtime.onMessage.addListener((message: Command, _sender, reply) => {
  if (message.type === 'NAVIGATION') { engine.navigate(); reply({ ok: true }); }
  if (message.type === 'FRAME_CONTROL') {
    if (message.action === 'START') selection.start(message.settings || engine.store?.settings || defaults);
    else selection.stop();
    reply({ ok: true });
  }
});
