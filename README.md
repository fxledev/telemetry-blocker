# telemetry blocker

Chrome extension that blocks telemetry requests: analytics, crash reporters, session replay, ad pixels. Navigation and APIs get through.

MV3 with `declarativeNetRequest`. No build step, no dependencies. Requests are blocked by the browser, not read by JavaScript.

## install

1. Open `chrome://extensions`
2. Turn on developer mode
3. Load unpacked and pick this folder

To see what got blocked, open DevTools → Network. Blocked requests show up with status `blocked`.

## rules

`rules.json` has 90 hosts. The popup lets you add your own, and those get blocked before the ones coming from the lists.

Every six hours the service worker fetches uBlock Origin's `filters/privacy.txt` and EasyList's `easyprivacy.txt`, converts the `||host^` lines to dynamic rules and drops the old ones. Lines carrying options we can't translate, like `$domain=` or `$redirect=`, get skipped: they are scoped to one site or they rewrite the URL.

Chrome allows 30,000 dynamic rules and EasyPrivacy gives 43,000 hosts, so 28,000 load and the rest is dropped. That's why uBlock's list goes first: those 150 hosts are curated, and they're not the ones that get cut. The service worker logs it:

```
telemetria: 28000 reglas, 19206 descartadas por el limite
```

## what it doesn't block

Google Tag Manager, the Facebook pixel, Intercom and cookie banners. Sites use them for login, checkout and consent. Blocking those breaks the page.

Chrome's own telemetry never goes through `declarativeNetRequest`, so it has to go out through DNS instead. `hosts.example` lists the hosts that break nothing, plus the ones that do, commented out. With Secure DNS on, Chrome ignores the hosts file, so turn that off in `chrome://settings/security`.

## editing

Edit `rules.json` and reload the extension. Ids must be unique, and no `resourceTypes` entry can be `main_frame` or `sub_frame`.

```
node check.js
node check.js easyprivacy.txt
```

To package for the Chrome Web Store:

```
Compress-Archive -Path manifest.json,background.js,filter.js,rules.json,popup.html,popup.css,popup.js,icon16.png,icon32.png,icon48.png,icon128.png -DestinationPath telemetry-blocker-0.1.0.zip
```

## credits

The filter lists are not ours, and they are not in this repo:

- [uBlock Origin's `filters/privacy.txt`](https://github.com/uBlockOrigin/uAssets/blob/master/filters/privacy.txt), from [uAssets](https://github.com/uBlockOrigin/uAssets), GPL-3.0
- [`easyprivacy.txt`](https://github.com/easylist/easylist), from EasyList, dual licensed GPL-3.0 or CC BY-SA 3.0

Both are fetched at runtime and converted into rules, never redistributed, so the MIT licence on this repo stands. If either one ever gets committed here, that file is GPL and the repo licence has to change with it.

## license

MIT.

`tools/icons.js` draws the icons, and `node tools/icons.js` writes them.

If something breaks, open an issue with the site.