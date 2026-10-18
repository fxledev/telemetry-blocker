# telemetry blocker

Bloquea las analytics, los crash reporters, el session replay y los píxeles de ads que te siguen a todos lados. Nada más: la navegación, los CDN, las fuentes, las APIs y los pagos pasan.

Es MV3 con `declarativeNetRequest`. Las reglas de `rules.json` son estáticas y las de las listas se cargan como dinámicas desde un service worker. No hay contenido scripts ni trackers: la extensión solo intercepta requests.

## instalar

1. Abrí `chrome://extensions`
2. Activá el modo desarrollador
3. Cargar descomprimida y elegí esta carpeta

Después de un rato mirá la pestaña Network en DevTools: los requests bloqueados aparecen con el status `blocked`.

## el popup

El ícono de la barra abre un panel con:

- el switch, que apaga todo el bloqueo sin desinstalar nada, y cuántas reglas están activas
- de dónde salen las listas y cuándo se descargaron por última vez, con un botón para forzar la descarga
- un campo para agregar un dominio a mano. Acepta `tracker.com`, `https://tracker.com/x` o `tracker.com/path` y guarda solo el host

Cada dominio que agregás se convierte en una regla dinámica con prioridad más alta que las de las listas, así que gana sobre la suscripción. El id de esa regla sale de un hash del host, no de su posición, para que borrar uno del medio no mueva los demás.

## qué bloquea

- analytics: Google Analytics, Firebase, Mixpanel, Amplitude, Segment, Heap, Clarity, New Relic, Datadog, StatCounter, Histats, Yandex Metrica, CNZZ, WebEngage
- crash reporters: Sentry, Bugsnag, TrackJS, Raygun, Rollbar, Loggly
- session replay: Hotjar, FullStory, LogRocket, Mouseflow, Inspectlet, Crazy Egg, Quantcast
- píxeles y redes de ads: DoubleClick, Bing Ads, Criteo, Taboola, Rubicon, Pubmatic, Moat y unas 60 más
- telemetría de Google y Microsoft desde la web: Bing UET, los beacons de Microsoft 365 y Edge, el Insight Tag de LinkedIn

90 reglas en `rules.json`.

## las listas de siempre

`background.js` baja dos listas cada seis horas y las convierte a reglas dinámicas, así que la cobertura se actualiza sola:

- `filters/privacy.txt` de uBlock Origin, unos 150 hosts curados
- `easyprivacy.txt` de EasyList

Solo se toman las líneas `||host^` sin opciones raras. Cualquier cosa con `$domain=`, `$removeparam` o `$redirect` se descarta, porque son reglas atadas a un sitio o modifican la URL, y una regla que no se traduce exacta es una regla que no bloqueamos.

El límite de Chrome es 30.000 reglas dinámicas y EasyPrivacy da 47.000 hosts. Se cargan 28.000 y el resto se descarta, por eso la lista de uBlock va primera: los hosts curados nunca son los que se pierden. El service worker lo deja en la consola:

```
telemetria: 28000 reglas, 19206 descartadas por el limite
```

## qué no bloquea

Google Tag Manager, el píxel de Facebook, Intercom y los banners de cookies. Esos rompen login, checkout o el consentimiento en algunos sitios, y un bloqueador que rompe páginas termina desinstalado.

## la telemetría de chrome mismo

Una extensión no la toca. Chrome no pasa sus requests internos por `declarativeNetRequest`, así que el crash reporter y los pings de diagnóstico van aparte, por DNS.

`hosts.example` tiene los hosts que no rompen nada y los que sí, comentados. Copialo a `C:\Windows\System32\drivers\etc\hosts` como admin y apagá Secure DNS en `chrome://settings/security`, porque con DoH activo Chrome ignora el hosts.

## configurar

Editá `rules.json`, agregá la regla y tocá recargar en la tarjeta de la extensión. No hay build.

```json
{ "id": 67, "priority": 1, "action": { "type": "block" }, "condition": { "urlFilter": "||ejemplo.com", "resourceTypes": ["script", "xmlhttprequest", "image", "ping", "other"] } }
```

`resourceTypes` nunca puede incluir `main_frame` ni `sub_frame`, porque eso rompe la navegación. `check.js` lo rechaza:

```
node check.js
node check.js easyprivacy.txt
```

## bugs

Abrí un issue con el sitio y qué se rompió.

## licencia

MIT. Forkeala, cambiala y vendela si querés.

Los íconos no vienen de internet: `tools/icons.js` los dibuja con zlib y los escribe como PNG, porque Chrome no acepta SVG en los íconos de extensión. Corré `node tools/icons.js` si los cambiás.