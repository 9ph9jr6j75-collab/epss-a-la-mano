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
const scriptUrl = html.match(/src="(app-v2\.js\?v=[^"]+)"/)[1];
assert.ok(worker.includes(`'${scriptUrl}'`), 'The current script must be precached for offline use');

function app() {
  const elements = new Map(), windowListeners = new Map(), storageWrites = [];
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
    addEventListener() {}
  };
  const guide = element('#install-btn'), modal = element('#install-modal', {}, true);
  const native = element('#native-install', {}, true);
  native.disabled = true;
  document.activeElement = guide;
  const window = {
    addEventListener(type, fn) {
      if (!windowListeners.has(type)) windowListeners.set(type, []);
      windowListeners.get(type).push(fn);
    }
  };
  const context = vm.createContext({
    document, window, navigator: {userAgent: 'Android'},
    localStorage: {getItem() { return null; }, setItem(...args) { storageWrites.push(args); }},
    setTimeout, clearTimeout, URL
  });
  vm.runInContext(source.replace(/\ninit\(\);\s*$/, ''), context);
  return {
    native, modal, document, storageWrites,
    status: () => element('#install-status').textContent,
    click: (selector) => element(selector).click(),
    offer(event) { for (const fn of windowListeners.get('beforeinstallprompt') || []) fn(event); },
    async checkGuide() {
      await element('#close-install').click();
      assert.ok(modal.classList.contains('hidden'));
      assert.equal(document.activeElement, guide);
      await guide.click();
      assert.ok(!modal.classList.contains('hidden'), 'Manual instructions must remain accessible');
      assert.ok(!element('panel:android').classList.contains('hidden'));
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

const unavailable = app();
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

console.log('Instalación verificada: cancelación, aceptación, errores, reintentos, doble clic y acceso permanente a instrucciones.');
