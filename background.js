import { parse } from './filter.js';

// La lista de uBlock va primera: son 150 hosts curados y nunca son los que se
// recortan por el limite.
const LISTS = [
  'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/privacy.txt',
  'https://easylist.to/easylist/easyprivacy.txt',
];

const RULESET = 'telemetry';
const FIRST_ID = 1000;
const CAP = 28000;
const BATCH = 5000;

// id estable derivado del host: si fuera la posicion en la lista, borrar una del
// medio cambiaba el id de todas las siguientes y quedaban huerfanas.
function customId(host) {
  let hash = 0;
  for (const char of host) hash = (hash * 31 + char.charCodeAt(0)) % 1_500_000_000;
  return hash + 1;
}

const customRule = (host) => ({
  id: customId(host),
  priority: 2,
  action: { type: 'block' },
  condition: { urlFilter: `||${host}` },
});

async function staticHosts() {
  const rules = await (await fetch(chrome.runtime.getURL('rules.json'))).json();
  return new Set(rules.map((r) => r.condition.urlFilter.replace(/^\|\|/, '').split('/')[0]));
}

async function applyLists() {
  const { enabled = true, ids = [] } = await chrome.storage.local.get(['enabled', 'ids']);
  if (!enabled) return;

  const blocked = await staticHosts();
  const converted = [];

  for (const url of LISTS) {
    const rules = parse(await (await fetch(url)).text(), blocked);
    for (const rule of rules) blocked.add(rule.condition.urlFilter.slice(2));
    converted.push(...rules.map((r, i) => ({ ...r, id: FIRST_ID + converted.length + i })));
  }

  const next = converted.slice(0, CAP);
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: ids });
  for (let i = 0; i < next.length; i += BATCH) {
    await chrome.declarativeNetRequest.updateDynamicRules({ addRules: next.slice(i, i + BATCH) });
  }

  await chrome.storage.local.set({ ids: next.map((r) => r.id), updatedAt: Date.now() });
  console.log(`telemetria: ${next.length} reglas, ${converted.length - next.length} descartadas por el limite`);
}

async function applyCustom() {
  const { enabled = true, custom = [] } = await chrome.storage.local.get(['enabled', 'custom']);
  if (enabled && custom.length) {
    await chrome.declarativeNetRequest.updateDynamicRules({ addRules: custom.map((host) => customRule(host)) });
  }
}

async function setEnabled(enabled) {
  const { ids = [], custom = [] } = await chrome.storage.local.get(['ids', 'custom']);
  await chrome.storage.local.set({ enabled });

  if (enabled) {
    await chrome.declarativeNetRequest.updateEnabledRulesets({ enableRuleSetIds: [RULESET] });
    await applyLists();
    await applyCustom();
  } else {
    await chrome.declarativeNetRequest.updateEnabledRulesets({ disableRulesetIds: [RULESET] });
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: [...ids, ...custom.map(customId)],
    });
  }
}

async function addCustom(host) {
  const { enabled = true, custom = [] } = await chrome.storage.local.get(['enabled', 'custom']);
  if (custom.includes(host)) return;

  if (enabled) await chrome.declarativeNetRequest.updateDynamicRules({ addRules: [customRule(host)] });
  await chrome.storage.local.set({ custom: [...custom, host] });
}

async function removeCustom(host) {
  const { enabled = true, custom = [] } = await chrome.storage.local.get(['enabled', 'custom']);
  if (enabled) await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [customId(host)] });
  await chrome.storage.local.set({ custom: custom.filter((h) => h !== host) });
}

async function stats() {
  const { enabled = true, custom = [], ids = [], updatedAt } = await chrome.storage.local.get([
    'enabled',
    'custom',
    'ids',
    'updatedAt',
  ]);
  const own = (await (await fetch(chrome.runtime.getURL('rules.json'))).json()).length;
  return { enabled, own, subscribed: ids.length, custom, updatedAt };
}

chrome.runtime.onMessage.addListener((msg, _, reply) => {
  const actions = {
    stats,
    toggle: () => stats().then((s) => setEnabled(!s.enabled)).then(stats),
    refresh: () => applyLists().then(stats),
    add: (host) => addCustom(host).then(stats),
    remove: (host) => removeCustom(host).then(stats),
  };

  try {
    const action = actions[msg.type];
    if (!action) throw new Error(`mensaje desconocido: ${msg.type}`);
    action(msg.host).then(reply, (error) => reply({ error: String(error) }));
  } catch (error) {
    reply({ error: String(error) });
  }
  return true;
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('refresh', { periodInMinutes: 360 });
  applyLists();
});

chrome.alarms.onAlarm.addListener(({ name }) => name === 'refresh' && applyLists());