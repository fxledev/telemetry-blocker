import { readFileSync, existsSync } from 'node:fs';
import { parse } from './filter.js';

const TYPES = new Set(['main_frame', 'sub_frame', 'stylesheet', 'script', 'image', 'font', 'object', 'xmlhttprequest', 'ping', 'csp_report', 'media', 'websocket', 'other']);

function assertSafe(rule) {
  if (rule.action.type !== 'block') throw new Error(`id ${rule.id} no es block, revisalo a mano`);
  if (!rule.condition.urlFilter.startsWith('||')) throw new Error(`id ${rule.id} no esta anclado a un host`);
  for (const type of rule.condition.resourceTypes || []) {
    if (type === 'main_frame' || type === 'sub_frame') throw new Error(`id ${rule.id} puede bloquear navegacion`);
    if (!TYPES.has(type)) throw new Error(`id ${rule.id} tiene un resourceType que no existe`);
  }
  if (rule.condition.domainType && !['thirdParty', 'firstParty'].includes(rule.condition.domainType)) {
    throw new Error(`id ${rule.id} tiene un domainType raro`);
  }
}

const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
for (const icon of new Set([...Object.values(manifest.icons), ...Object.values(manifest.action.default_icon)])) {
  if (!existsSync(icon)) throw new Error(`falta el icono ${icon}, corré node tools/icons.js`);
}

const staticRules = JSON.parse(readFileSync('rules.json', 'utf8'));
const staticIds = new Set();
const staticHosts = new Set();

for (const rule of staticRules) {
  if (staticIds.has(rule.id)) throw new Error(`id ${rule.id} repetido`);
  staticIds.add(rule.id);
  staticHosts.add(rule.condition.urlFilter.replace(/^\|\|/, '').split('/')[0]);
  assertSafe(rule);
}
console.log(`${staticIds.size} reglas estaticas ok`);

const list = process.argv[2];
if (list) {
  const text = readFileSync(list, 'utf8');
  const converted = parse(text, staticHosts);

  const dynamicIds = new Set();
  for (const rule of converted) {
    if (dynamicIds.has(rule.id)) throw new Error(`id ${rule.id} repetido en la lista`);
    dynamicIds.add(rule.id);
    assertSafe(rule);
  }

  const lines = text.split('\n').filter((l) => l.trim() && !l.startsWith('!') && !l.startsWith('['));
  const overlap = converted.filter((r) => staticHosts.has(r.condition.urlFilter.slice(2))).length;
  console.log(`${converted.length} reglas convertidas de ${lines.length} lineas, ${overlap} repetidas de las estaticas`);
}