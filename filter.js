const TYPES = {
  script: 'script',
  image: 'image',
  xmlhttprequest: 'xmlhttprequest',
  stylesheet: 'stylesheet',
  ping: 'ping',
  font: 'font',
  media: 'media',
  websocket: 'websocket',
  other: 'other',
};

const DOMAIN_TYPE = {
  'third-party': 'thirdParty',
  '3p': 'thirdParty',
  '1p': 'firstParty',
  '~third-party': 'firstParty',
};

const LINE = /^\|\|([a-z0-9][a-z0-9.-]*\.[a-z]{2,})\^(\$[^,]+(,[^,]+)*)?\s*$/i;

// Las opciones que no conocemos ($domain=, $redirect=, $removeparam=) hacen
// que la linea se descarte en vez de bloquear a medias.
export function parse(text, alreadyBlocked = new Set()) {
  const seen = new Set();
  const rules = [];

  for (const raw of text.split('\n')) {
    const match = raw.trim().match(LINE);
    if (!match) continue;

    const host = match[1].toLowerCase();
    if (alreadyBlocked.has(host) || seen.has(host)) continue;

    const options = match[2] ? match[2].slice(1).split(',') : [];
    const resourceTypes = options.filter((o) => o in TYPES).map((o) => TYPES[o]);
    const domainTypes = options.filter((o) => o in DOMAIN_TYPE);
    if (options.length !== resourceTypes.length + domainTypes.length) continue;

    seen.add(host);

    const condition = { urlFilter: `||${host}` };
    if (resourceTypes.length) condition.resourceTypes = resourceTypes;
    if (domainTypes.length) condition.domainType = DOMAIN_TYPE[domainTypes[0]];

    rules.push({ id: rules.length, priority: 1, action: { type: 'block' }, condition });
  }

  return rules;
}