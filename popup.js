const el = (id) => document.getElementById(id);

const nf = new Intl.NumberFormat('es');
const ago = (ms) => {
  const min = Math.round((Date.now() - ms) / 60000);
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  return h < 24 ? `hace ${h} h` : `hace ${Math.round(h / 24)} d`;
};

function normalize(value) {
  const host = value
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, '')
    .split(/[/?#]/)[0];
  return /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/.test(host) ? host : null;
}

function fail(message) {
  el('error').textContent = message;
  el('error').hidden = false;
}

function renderList(hosts) {
  el('customList').replaceChildren(
    ...hosts.map((host) => {
      const item = document.createElement('li');
      const label = document.createElement('span');
      const remove = document.createElement('button');

      label.className = 'mono';
      label.textContent = host;
      remove.textContent = '×';
      remove.setAttribute('aria-label', `Quitar ${host}`);
      remove.addEventListener('click', async () => {
        remove.disabled = true;
        await run({ type: 'remove', host });
      });

      item.append(label, remove);
      return item;
    })
  );
}

function render(s) {
  if (!s) return fail('El service worker no respondió. Mirá la consola de la extensión.');
  if (s.error) return fail(s.error);

  el('error').hidden = true;
  el('toggle').setAttribute('aria-checked', String(s.enabled));
  el('state').textContent = s.enabled
    ? `Bloqueando ${nf.format(s.own + s.subscribed + s.custom.length)} reglas`
    : 'Sin bloquear';
  el('counts').textContent =
    `${s.own} en rules.json · ${nf.format(s.subscribed)} de listas · ${s.custom.length} tuyas`;
  el('updated').textContent = s.updatedAt ? ago(s.updatedAt) : 'nunca';
  renderList(s.custom);
}

async function run(msg) {
  try {
    render(await chrome.runtime.sendMessage(msg));
  } catch (error) {
    fail(String(error));
  }
}

el('toggle').addEventListener('click', async () => {
  el('toggle').disabled = true;
  await run({ type: 'toggle' });
  el('toggle').disabled = false;
});

el('refresh').addEventListener('click', async () => {
  el('refresh').disabled = true;
  el('updated').textContent = '…';
  await run({ type: 'refresh' });
  el('refresh').disabled = false;
});

el('add').addEventListener('submit', async (e) => {
  e.preventDefault();
  const host = normalize(el('host').value);
  if (!host) return fail('Eso no es un dominio');

  el('host').value = '';
  await run({ type: 'add', host });
});

el('host').addEventListener('input', () => (el('error').hidden = true));

await run({ type: 'stats' });