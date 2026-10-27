#!/usr/bin/env node
'use strict';

// Run the actual app navigation and Analytics code with a stub Google tag.
// No request is sent to Google and no production property is used by this check.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../dist/app-v2.js'), 'utf8');
assert.match(source, /\ninit\(\);\s*$/);
const appSource = source.replace(/\ninit\(\);\s*$/, '');
const indicator = {id:'07-02-2.0',code:'07-02-2.0',title:'Control óptimo de presión arterial en HTA',categoryId:'07',category:'Hipertensión arterial',kind:'evaluation',family:'07-02',sourceFile:'assets/fichas/example.pdf'};

function app(url, measurementId='G-TESTEPSS1') {
  const elements = new Map(), scripts = [], location = {};
  const updateLocation = value => {
    const parsed = new URL(value, location.href || url);
    Object.assign(location, {href:parsed.href,origin:parsed.origin,pathname:parsed.pathname,hash:parsed.hash,search:parsed.search});
  };
  updateLocation(url);
  const element = key => {
    if (!elements.has(key)) elements.set(key, {dataset:{},style:{setProperty(){}},classList:{add(){},remove(){},toggle(){},contains(){return false;}},addEventListener(){},focus(){},scrollIntoView(){},setAttribute(){},getClientRects(){return [];},querySelectorAll(){return [];}});
    return elements.get(key);
  };
  const document = {referrer:'https://source.example/private?email=secret@example.com#patient',activeElement:{isConnected:false},body:element('body'),querySelector:element,querySelectorAll(){return [];},addEventListener(){},createElement(){const value={addEventListener(type,fn){this[type]=fn;}};return value;},head:{append(script){scripts.push(script);}}};
  const window = {addEventListener(){},scrollTo(){}};
  const context = vm.createContext({window,document,location,history:{replaceState(state,title,value){updateLocation(value);}},navigator:{},localStorage:{getItem(){return null;},setItem(){}},URL,fetch:async()=>({json:async()=>({analyticsMeasurementId:measurementId})}),setTimeout,clearTimeout,renderFullDocument(){return '';}});
  vm.runInContext(appSource, context);
  context.item = indicator;
  vm.runInContext("all=[item];renderCatalog=()=>{};renderFavorites=()=>{};renderCodes=()=>{};quickSummary=()=>'';fichaCodes=()=>'';historyPanel=()=>'';relatedPanel=()=>'';", context);
  return {scripts,window,elements,run:code=>vm.runInContext(code,context),events(name){return (window.dataLayer||[]).map(args=>Array.from(args)).filter(args=>args[0]==='event'&&args[1]===name);}};
}

(async()=>{
  const unset = app('https://example.org/#mr', null);
  await unset.run('analytics()');
  assert.equal(unset.scripts.length, 0, 'An unset measurement ID must not load the tag');
  assert.equal(unset.events('page_view').length, 0);

  const site = app('https://example.org/?q=secret-patient&email=secret@example.com#untrusted');
  await site.run('analytics()');
  assert.equal(site.scripts.length, 1);
  assert.equal(site.scripts[0].src, 'https://www.googletagmanager.com/gtag/js?id=G-TESTEPSS1');
  assert.equal(site.events('page_view').length, 1, 'Exactly one initial pageview');
  let view = site.events('page_view')[0][2];
  assert.equal(view.page_location, 'https://example.org/#mr');
  assert.equal(view.page_referrer, 'https://source.example/');
  const initialConfig = Array.from(site.window.dataLayer.find(args=>args[0]==='config'));
  assert.equal(initialConfig[2].send_page_view, false);
  assert.equal(initialConfig[2].allow_google_signals, false);
  assert.equal(initialConfig[2].allow_ad_personalization_signals, false);

  site.run("setView('codigos')");
  assert.equal(site.events('page_view').length, 2);
  view = site.events('page_view').at(-1)[2];
  assert.equal(view.page_location, 'https://example.org/#codigos');
  assert.equal(view.page_referrer, 'https://example.org/#mr');
  site.run("setView('codigos')");
  assert.equal(site.events('page_view').length, 2, 'Repeated section must not inflate pageviews');
  site.run("openFicha('07-02-2.0')");
  assert.equal(site.events('page_view').length, 3);
  assert.equal(site.events('page_view').at(-1)[2].page_location, 'https://example.org/#ficha=07-02-2.0');
  assert.equal(site.events('open_indicator').at(-1)[2].indicator, '07-02-2.0');
  site.run("setDetailMode('full')");
  assert.equal(site.events('page_view').length, 3, 'Reading mode is an interaction, not an extra page');
  assert.equal(site.events('read_mode').at(-1)[2].mode, 'full');
  site.run('closeDetail()');
  assert.equal(site.events('page_view').length, 4);
  assert.equal(site.events('page_view').at(-1)[2].page_location, 'https://example.org/#codigos');
  site.run("location.hash='#ficha=07-02-2.0';useHash()");
  assert.equal(site.events('page_view').length, 5, 'Deep navigation must not emit an intermediate catalog page');
  assert.equal(site.events('page_view').at(-1)[2].page_location, 'https://example.org/#ficha=07-02-2.0');
  assert.doesNotMatch(JSON.stringify(site.window.dataLayer), /secret|untrusted|patient/, 'Payloads must not contain raw query, hash or referrer text');
  assert.ok(site.events('page_view').every(args=>args[2].send_to==='G-TESTEPSS1'));
  await site.run('analytics()');
  assert.equal(site.scripts.length, 1, 'Repeated initialization must not insert another tag');

  const pages = app('https://example.github.io/epss-a-la-mano/?q=secret#ficha=07-02-2.0');
  pages.run("useHash()");
  await pages.run('analytics()');
  assert.equal(pages.events('page_view').length, 1, 'A direct ficha link gets one initial view');
  assert.equal(pages.events('open_indicator').length, 1, 'Initial deep links must retain indicator statistics');
  assert.equal(pages.events('page_view')[0][2].page_location, 'https://example.github.io/epss-a-la-mano/#ficha=07-02-2.0');
  assert.doesNotMatch(JSON.stringify(pages.window.dataLayer), /secret/);
  console.log('Analytics verificado: vista inicial y navegación sin duplicados; fichas y modos separados; URLs sin consultas libres; destino exclusivo.');
})().catch(error=>{console.error(error);process.exitCode=1;});
