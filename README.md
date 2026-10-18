# telemetry blocker

Extensión de Chrome que bloquea requests de telemetría: analytics, crash reporters, session replay y píxeles de ads. La navegación y las APIs pasan.

MV3 con `declarativeNetRequest`. Sin build ni dependencias. La extensión no lee las requests, las bloquea.

## instalar

1. Abrí `chrome://extensions`
2. Activá el modo desarrollador
3. Cargar descomprimida y elegí esta carpeta

Para ver qué se bloqueó, DevTools → Network. Los requests bloqueados salen con status `blocked`.

## reglas

`rules.json` trae 90 hosts a mano. El popup deja agregar los tuyos, que se bloquean antes que los de las listas.

Cada seis horas el service worker baja `filters/privacy.txt` de uBlock Origin y `easyprivacy.txt` de EasyList, convierte las líneas `||host^` a reglas dinámicas y saca las viejas. Las líneas con opciones que no sabemos traducir, como `$domain=` o `$redirect`, se descartan: van atadas a un sitio o reescriben la URL.

Chrome permite 30.000 reglas dinámicas y EasyPrivacy da 43.000 hosts, así que entran 28.000 y el resto se descarta. Por eso la lista de uBlock se convierte primero: son 150 hosts curados y no son los que pierden. Queda en la consola del service worker:

```
telemetria: 28000 reglas, 19206 descartadas por el limite
```

## qué no bloquea

Google Tag Manager, el píxel de Facebook, Intercom y los banners de cookies. Se usan en login, checkout y consentimiento, y ahí bloquear rompe la página.

La telemetría interna de Chrome no pasa por `declarativeNetRequest`, así que va por DNS. `hosts.example` tiene los hosts que no rompen nada y los que sí, comentados. Con Secure DNS prendido Chrome ignora el hosts, así que hay que apagarlo en `chrome://settings/security`.

## editar

Editá `rules.json` y recargá la extensión. Los ids tienen que ser únicos y ningún `resourceTypes` puede ser `main_frame` ni `sub_frame`.

```
node check.js
node check.js easyprivacy.txt
```

## licencia

MIT.

Los íconos los dibuja `tools/icons.js` y se regeneran con `node tools/icons.js`.

Si algo se rompe, abrí un issue con el sitio.