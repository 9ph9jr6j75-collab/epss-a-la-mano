#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Exercise the actual app listeners without requesting a browser installation.
const source = fs.readFileSync(new URL('../dist/app-v2.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
const worker = fs.readFileSync(new URL('../dist/sw.js', import.meta.url), 'utf8');
assert.match(source, /\ninit\(\);\s*$/);
assert.match(html, /id="native-install"[^>]*disabled/);
assert.match(html, /id="install-status"[^>]*role="status"/);
assert.match(html, /id="install-btn"[^>]*><span data-icon="phone"><\/span><span id="install-btn-label">/);
assert.match(html, /class="install-guide-btn hidden" id="install-help-btn">Cómo instalar/);
const scriptUrl = html.match(/src="(app-v2\.js\?v=[^"]+)"/)[1];
assert.ok(worker.includes(`'${scriptUrl}'`), 'The current script must be precached for offline use');

function app({standalone = false, iosStandalone = false, legacyMedia = false} = {}) {
  const elements = new Map(), windowListeners = new Map(), documentListeners = new Map(), mediaListeners = [], storageWrites = [];
  let document;
  function element(key, dataset = {}, hidden = false) {
    if (elements.has(key)) return elements.get(key);
    const classes = new Set(hidden ? ['hidden'] : []), listeners = new Map();
    const el = {
      dataset, disabled: false, isConnected: true, textContent: '', scrollTop: 0,
      classList: {
        add(name) { classes.add(name); },
        remove(name) { classes.delete(name); },
        contains(name) { return classes.has(name); },
        toggle(name, force) {
          const add = force ?? !classes.has(name);
          if (add) classes.add(name); else classes.delete(name);
          return add;
        }
      },
      addEventListener(type, fn) {
        if (!listeners.has(type)) listeners.set(type, []);
        listeners.get(type).push(fn);
      },
      async click() {
        for (const fn of listeners.get('click') || []) await fn({target: el});
      },
      focus() { document.activeElement = el; },
      setAttribute(name, value) { this[name] = value; },
      querySelectorAll() { return []; }
    };
    elements.set(key, el);
    return el;
  }
  const tabs = [...html.matchAll(/data-install-device="([^"]+)"/g)].map((m) => element('tab:' + m[1], {installDevice: m[1]}));
  const panels = [...html.matchAll(/data-install-panel="([^"]+)"/g)].map((m) => element('panel:' + m[1], {installPanel: m[1]}));
  assert.deepEqual(tabs.map((el) => el.dataset.installDevice), ['iphone', 'android', 'computer']);
  document = {
    activeElement: null, body: element('body'),
    querySelector: element,
    querySelectorAll(selector) {
      return selector === '[data-install-device]' ? tabs : selector === '[data-install-panel]' ? panels : [];
    },
    addEventListener(type, fn) {
      if (!documentListeners.has(type)) documentListeners.set(type, []);
      documentListeners.get(type).push(fn);
    }
  };
  const guide = element('#install-btn'), modal = element('#install-modal', {}, true);
  const help = element('#install-help-btn', {}, true);
  const native = element('#native-install', {}, true);
  native.disabled = true;
  document.activeElement = guide;
  const media = {matches: standalone};
  if (legacyMedia) media.addListener = (fn) => mediaListeners.push(fn);
  else media.addEventListener = (type, fn) => { assert.equal(type, 'change'); mediaListeners.push(fn); };
  const navigator = {userAgent: iosStandalone ? 'iPhone' : 'Android', standalone: iosStandalone};
  const window = {
    matchMedia(query) { assert.equal(query, '(display-mode: standalone)'); return media; },
    addEventListener(type, fn) {
      if (!windowListeners.has(type)) windowListeners.set(type, []);
      windowListeners.get(type).push(fn);
    }
  };
  const context = vm.createContext({
    document, window, navigator,
    localStorage: {getItem() { return null; }, setItem(...args) { storageWrites.push(args); }},
    setTimeout, clearTimeout, URL
  });
  vm.runInContext(source.replace(/\ninit\(\);\s*$/, ''), context);
  return {
    native, modal, guide, help, document, storageWrites,
    label: () => element('#install-btn-label').textContent,
    status: () => element('#install-status').textContent,
    click: (selector) => element(selector).click(),
    offer(event) { for (const fn of windowListeners.get('beforeinstallprompt') || []) fn(event); },
    dispatchWindow(type) { for (const fn of windowListeners.get(type) || []) fn({type}); },
    dispatchDocument(type) { for (const fn of documentListeners.get(type) || []) fn({type}); },
    setMode(value, notify = true) {
      media.matches = value;
      if (notify) for (const fn of mediaListeners) fn({matches: value});
    },
    setIOS(value) { navigator.standalone = value; },
    async checkGuide() {
      const opener = guide.disabled ? help : guide;
      await element('#close-install').click();
      assert.ok(modal.classList.contains('hidden'));
      assert.equal(document.activeElement, opener);
      opener.focus();
      await opener.click();
      assert.ok(!modal.classList.contains('hidden'), 'Manual instructions must remain accessible');
      assert.ok(!element(navigator.userAgent === 'iPhone' ? 'panel:iphone' : 'panel:android').classList.contains('hidden'));
    }
  };
}

function offer(prompt, userChoice) {
  const event = {calls: 0, prevented: 0, preventDefault() { this.prevented++; }, prompt() { this.calls++; return prompt(); }};
  if (userChoice) Object.defineProperty(event, 'userChoice', {get: userChoice});
  return event;
}

function checkOutcome(site) {
  assert.ok(!site.modal.classList.contains('hidden'), 'A result must leave the instructions open');
  assert.equal(site.storageWrites.length, 0, 'A prompt result must not persist an installed state');
  assert.doesNotMatch(site.status(), /instalada|instalado|instalación completada/i);
}

function checkHeader(site, installed) {
  assert.equal(site.guide.disabled, installed);
  assert.equal(site.label(), installed ? 'App instalada' : 'Instalar app');
  assert.equal(site.help.classList.contains('hidden'), !installed);
  assert.equal(site.storageWrites.length, 0, 'Display mode must not create a persistent installation flag');
  if (installed) {
    assert.ok(site.native.disabled);
    assert.ok(site.native.classList.contains('hidden'));
  }
}

const unavailable = app();
checkHeader(unavailable, false);
await unavailable.checkGuide();
await unavailable.click('#native-install');
assert.ok(unavailable.native.disabled);
assert.ok(unavailable.native.classList.contains('hidden'));

const cancelled = app();
await cancelled.checkGuide();
const cancelOffer = offer(async () => ({outcome: 'dismissed'}));
cancelled.offer(cancelOffer);
assert.equal(cancelOffer.prevented, 1);
assert.ok(!cancelled.native.disabled);
await cancelled.click('#native-install');
assert.equal(cancelOffer.calls, 1);
assert.match(cancelled.status(), /Se canceló/);
assert.ok(cancelled.native.disabled);
assert.ok(cancelled.native.classList.contains('hidden'));
checkOutcome(cancelled);
checkHeader(cancelled, false);
await cancelled.checkGuide();
await cancelled.click('#native-install');
assert.equal(cancelOffer.calls, 1, 'Reopening instructions must not reuse the consumed event');

const retryOffer = offer(async () => undefined, async () => ({outcome: 'accepted'}));
cancelled.offer(retryOffer);
assert.ok(!cancelled.native.disabled, 'A fresh browser event must allow retrying');
await cancelled.click('#native-install');
assert.equal(retryOffer.calls, 1);
assert.match(cancelled.status(), /^Solicitud aceptada\./);
checkOutcome(cancelled);
checkHeader(cancelled, false);
await cancelled.checkGuide();

const doubleClick = app();
await doubleClick.checkGuide();
let resolvePrompt;
const pending = offer(() => new Promise((resolve) => { resolvePrompt = resolve; }));
doubleClick.offer(pending);
const firstClick = doubleClick.click('#native-install');
assert.equal(pending.calls, 1);
assert.ok(doubleClick.native.disabled, 'The first click must disable the button before awaiting');
assert.ok(doubleClick.native.classList.contains('hidden'));
assert.equal(doubleClick.document.activeElement, doubleClick.document.querySelector('#close-install'));
await doubleClick.click('#native-install');
assert.equal(pending.calls, 1, 'Concurrent clicks must not call prompt twice');
const nextOffer = offer(async () => ({outcome: 'accepted'}));
doubleClick.offer(nextOffer);
assert.ok(doubleClick.native.disabled, 'A new offer must not enable concurrent prompts');
resolvePrompt({outcome: 'dismissed'});
await firstClick;
assert.ok(!doubleClick.native.disabled, 'An offer received while waiting must remain available');
await doubleClick.click('#native-install');
assert.equal(nextOffer.calls, 1);
checkOutcome(doubleClick);

for (const options of [{standalone: true}, {iosStandalone: true}, {standalone: true, legacyMedia: true}]) {
  const installed = app(options);
  checkHeader(installed, true);
  assert.equal(installed.document.activeElement, installed.help, 'A disabled header must yield focus to the help button');
  await installed.click('#install-btn');
  assert.ok(installed.modal.classList.contains('hidden'), 'The disabled installed control must not open the guide');
  await installed.checkGuide();
  const ignored = offer(async () => ({outcome: 'accepted'}));
  installed.offer(ignored);
  assert.equal(ignored.prevented, 1);
  await installed.click('#native-install');
  assert.equal(ignored.calls, 0, 'Standalone must not offer or request a second installation');
  checkHeader(installed, true);
  if (options.iosStandalone) {
    installed.setIOS(false);
    installed.dispatchDocument('visibilitychange');
  } else installed.setMode(false);
  checkHeader(installed, false);
  assert.ok(installed.native.disabled, 'Leaving standalone must not revive an ignored prompt');
  await installed.click('#close-install');
  assert.equal(installed.document.activeElement, installed.guide, 'A hidden help opener must yield focus to the browser control');
  await installed.checkGuide();
}

const changes = app();
await changes.checkGuide();
const staleOffer = offer(async () => ({outcome: 'accepted'}));
changes.offer(staleOffer);
changes.setMode(true, false);
changes.dispatchWindow('pageshow');
checkHeader(changes, true);
await changes.click('#native-install');
assert.equal(staleOffer.calls, 0, 'A mode change must block even a previously available prompt');
await changes.click('#close-install');
assert.equal(changes.document.activeElement, changes.help, 'Closing after a mode change must avoid the disabled opener');
changes.setMode(false, false);
changes.dispatchDocument('visibilitychange');
checkHeader(changes, false);
assert.equal(changes.document.activeElement, changes.guide);

for (const appinstalledFirst of [false, true]) {
  const browser = app();
  await browser.checkGuide();
  let resolveChoice;
  browser.offer(offer(() => new Promise((resolve) => { resolveChoice = resolve; })));
  const request = browser.click('#native-install');
  if (appinstalledFirst) browser.dispatchWindow('appinstalled');
  resolveChoice({outcome: 'accepted'});
  await request;
  if (!appinstalledFirst) browser.dispatchWindow('appinstalled');
  checkOutcome(browser);
  checkHeader(browser, false);
  await browser.checkGuide();
  browser.offer(offer(async () => ({outcome: 'accepted'})));
  browser.dispatchWindow('appinstalled');
  assert.ok(browser.native.disabled, 'appinstalled must consume an outstanding browser offer');
}

const duringRequest = app();
await duringRequest.checkGuide();
let resolveInstalledChoice;
duringRequest.offer(offer(() => new Promise((resolve) => { resolveInstalledChoice = resolve; })));
const opening = duringRequest.click('#native-install');
duringRequest.setMode(true);
resolveInstalledChoice({outcome: 'accepted'});
await opening;
checkHeader(duringRequest, true);
await duringRequest.checkGuide();

for (const [label, prompt, userChoice] of [
  ['synchronous prompt failure', () => { throw new Error('blocked'); }],
  ['asynchronous prompt failure', async () => { throw new Error('blocked'); }],
  ['userChoice failure', async () => undefined, async () => { throw new Error('blocked'); }]
]) {
  const failed = app();
  await failed.checkGuide();
  const failedOffer = offer(prompt, userChoice);
  failed.offer(failedOffer);
  await failed.click('#native-install');
  assert.equal(failedOffer.calls, 1, label);
  assert.match(failed.status(), /^No se pudo abrir/, label);
  assert.ok(failed.native.disabled, label);
  assert.ok(failed.native.classList.contains('hidden'), label);
  checkOutcome(failed);
  await failed.checkGuide();
  const freshOffer = offer(async () => ({outcome: 'accepted'}));
  failed.offer(freshOffer);
  await failed.click('#native-install');
  assert.equal(freshOffer.calls, 1, 'A failure must not block a fresh browser event');
  checkOutcome(failed);
}

console.log('Instalación verificada: modo independiente e iOS, encabezado y ayuda, foco, eventos sin falsas confirmaciones, cancelación, errores, reintentos y doble clic.');
