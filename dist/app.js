'use strict';

const ICONS = {
  book:'<path d="M12 6c-2-2-5-2-9-2v15c4 0 7 0 9 2m0-15c2-2 5-2 9-2v15c-4 0-7 0-9 2V6Z"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  refresh:'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 6.1a8 8 0 0 1 13 2.9M4.9 15a8 8 0 0 0 13 2.9"/>',
  file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm0 0v6h6M8 13h8m-8 4h6"/>',
  shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18m-13 4h3m2 0h3"/>',
  phone:'<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 18h4m-2-12v7m-3-3 3 3 3-3"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
  check:'<path d="m5 12 4 4L20 5"/>',
  close:'<path d="m6 6 12 12M6 18 18 6"/>',
  download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>',
  copy:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  codes:'<path d="m8 7-5 5 5 5m8-10 5 5-5 5M14 4l-4 16"/>',
  print:'<path d="M7 8V3h10v5M7 16H4V8h16v8h-3M7 13h10v8H7z"/>',
};
const svg = (name, cls='') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]||ICONS.file}</svg>`;
const $ = s => document.querySelector(s);
const esc = s => String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm = s => String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const textOf = s => Array.isArray(s) ? s.join('\n') : typeof s==='object'&&s ? Object.values(s).map(textOf).join('\n') : String(s??'');
const present = v => textOf(v).trim().length>0;
const compact = s => norm(s).replace(/[^a-z0-9]/g,'');
const matches = (value,tokens) => tokens.every(t=>norm(value).includes(t)||(/\d/.test(t)&&compact(value).includes(compact(t))));
const COLOR = {'01':'#16847b','02':'#7660a3','03':'#3d7bb3','04':'#9a752e','05':'#b86b42','06':'#267c99','07':'#ae5571','09':'#7566a3','11':'#537665'};
const SHORT = {'01':'Materno infantil','02':'Salud bucodental','03':'Niñez y adolescencia','04':'Persona adulta mayor','05':'Obesidad y síndrome metabólico','06':'Diabetes mellitus tipo 2','07':'Hipertensión arterial','09':'Cáncer','11':'Eficiencia productiva'};
const TITLES = {
 '01-01-1.0':'Atención temprana de menores de un año','01-02-2.0':'Atención temprana en el posparto','01-03-1.0':'Atención temprana de embarazadas','01-04-2.0':'Paquete básico durante el embarazo','01-05-2.0':'Tratamiento oportuno de sífilis en el embarazo',
 '02-01-1.0':'Salud oral de 20 a 64 años','02-02-1.0':'Salud oral en personas de 65 años y más','02-03-1.0':'Educación en salud oral de 0 a 9 años','02-04-1.0':'Educación en salud oral de 10 a 19 años','02-05-1.0':'Educación en salud oral de 20 a 64 años','02-06-1.0':'Educación en salud oral de 65 años y más',
 '03-01-2.0':'Tamizaje oportuno de anemia en lactantes','03-02-1.0':'Anemia resuelta de 6 a menos de 24 meses','03-03-2.0':'Anemia resuelta en niñas de 10 años','03-04-1.0':'Tamizaje de dislipidemia de 9 a 11 años','03-05-1.0':'Perfil lipídico en menores con obesidad','04-01-1.0':'Énfasis de atención a la persona adulta mayor',
 '05-01-1.0':'Atención de personas con obesidad','05-02-1.0':'Referencia a Nutrición por obesidad','05-03-1.0':'Consulta grupal de Nutrición por obesidad','05-04-1.0':'Triglicéridos normales tras atención del síndrome metabólico','05-05-1.0':'Reducción de peso tras atención del síndrome metabólico',
 '06-01-1.0':'Cobertura de atención de DM2','06-02-1.0':'Control glicémico óptimo en DM2','06-03-1.0':'Control de presión arterial en DM2','06-04-1.0':'Control lipídico óptimo en DM2','07-01-1.0':'Cobertura de atención de hipertensión','07-02-1.0':'Control óptimo de presión arterial',
 '09-01-2.0':'Tamizaje cervicouterino de 20 a 29 años','09-02-2.0':'Tamizaje cervicouterino de 30 a 64 años','09-03-2.0':'Mamografía de 40 a 74 años','11-01-1.0':'Gasto en sueldos para cargos fijos','11-02-2.0':'Gasto en tiempos extraordinarios'
};
const STORE='epss-dripssha-consulta-v1';
let saved; try { saved=JSON.parse(localStorage.getItem(STORE)||'{}'); } catch { saved={}; }
let favorites=new Set(Array.isArray(saved.favorites)?saved.favorites:[]), recent=Array.isArray(saved.recent)?saved.recent:[];
let all=[],categories=[],changes=[],notes=[],activeTopic='all',activeView='explorar',activeId=null,lastFocus=null,installPrompt=null;
let codeGroups=[],codeEntries=[],codeNotes=[],quickSummaries=new Map(),codeLoadFailed=false;
let toastTimer;
const persist=()=>{try{localStorage.setItem(STORE,JSON.stringify({favorites:[...favorites],recent}));}catch{toast('Este navegador no permite guardar favoritos.');}};
const toast=s=>{$('#toast').textContent=s;$('#toast').classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.add('hidden'),2600);};

function catKey(item){ const id=String(item.categoryId||item.code?.slice(0,2)||''); return id.match(/\d{2}/)?.[0]||id; }
function categoryLabel(item){return SHORT[catKey(item)]||item.category||'Primer nivel';}
function fillIcons(root=document){root.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=svg(el.dataset.icon);});}
function summary(v,max=150){const s=textOf(v).replace(/\s+/g,' ').trim();return s.length>max?s.slice(0,max).replace(/\s\S*$/,'')+'…':s;}
function sourceUrl(item){return `assets/diseno-epss-2024-2028.pdf#page=${item.pageStart||item.pages?.[0]||11}`;}
function relatedChanges(item){return changes.filter(u=>u.baseCodes?.includes(item.code));}
function metaText(item){const dental={'02-01-1.0':'11 %','02-02-1.0':'11 %','02-03-1.0':'80 %','02-04-1.0':'80 %','02-05-1.0':'75 %','02-06-1.0':'73 %'};if(dental[item.code])return dental[item.code];const v=textOf(item.target).replace(/\s+/g,' ').trim();return v||'Indicador de apoyo';}
function updateSource(u){return u.sourceId==='hta-lineamiento-2025'?{file:'assets/lineamiento-hta-2025.pdf',label:'Lineamiento HTA 2025'}:{file:'assets/informe-epss-pna-2025.pdf',label:'Informe 2025'};}

function relatedCodes(item){
 return codeEntries.filter(entry=>(entry.indicatorIds||[]).includes(item.id));
}
function codeSource(entry){
 if(entry.sourceId==='hta-lineamiento-2025')return {file:'assets/lineamiento-hta-2025.pdf',label:'Lineamiento HTA 2025'};
 if(entry.sourceId==='informe-2025')return {file:'assets/informe-epss-pna-2025.pdf',label:'Informe 2025'};
 return {file:'assets/diseno-epss-2024-2028.pdf',label:'Diseño base 2024'};
}
function codeEntry(entry,detail=false){
 const source=codeSource(entry),pages=entry.pages||[],related=all.filter(item=>(entry.indicatorIds||[]).includes(item.id));
 return `<article class="code-entry ${detail?'detail-code-entry':''}"><div class="code-entry-head"><button class="copy-code" data-copy-code="${esc(entry.code)}" aria-label="Copiar código ${esc(entry.code)}">${esc(entry.code)} ${svg('copy')}</button><span class="code-role">${esc(entry.role||'Registro según ficha')}</span></div><h3>${esc(entry.label)}</h3>${entry.criteria?`<p>${esc(entry.criteria)}</p>`:''}<div class="code-entry-foot"><a class="source-link" href="${source.file}#page=${pages[0]||1}" target="_blank" rel="noopener">${svg('file')}${source.label}${pages.length?' · p. '+esc(pages.join(', ')):''} <span aria-hidden="true">↗</span></a>${!detail?`<div class="code-related">${related.map(item=>`<button class="text-link" data-open="${esc(item.id)}">${esc(item.code||'Complementario · '+summary(item.name,52))} ${svg('arrow')}</button>`).join('')}</div>`:''}</div></article>`;
}
function renderCodes(){
 const tokens=norm($('#code-search').value).trim().split(/\s+/).filter(Boolean);
 let count=0;
 const groups=codeGroups.map(group=>{
  const entries=(group.entries||[]).filter(entry=>matches([entry.code,entry.label,entry.role,entry.criteria,group.title,(entry.indicatorCodes||[]).join(' '),(entry.indicatorIds||[]).join(' ')].join(' '),tokens));
  count+=entries.length;
  return entries.length?`<section class="code-group"><h2>${esc(group.title)}</h2><div class="code-entry-grid">${entries.map(entry=>codeEntry(entry)).join('')}</div></section>`:'';
 }).join('');
 $('#code-count').textContent=codeLoadFailed?'Códigos no disponibles en esta sesión':`${count} ${count===1?'referencia':'referencias'} de códigos${tokens.length?' para su búsqueda':''}`;
 $('#code-groups').innerHTML=groups||`<div class="empty-state">${svg('search')}<h2>${codeLoadFailed?'No se pudieron cargar los códigos':'No encontramos ese código'}</h2><p>${codeLoadFailed?'Vuelva a cargar la aplicación para intentarlo de nuevo. Las fichas y sus fuentes siguen disponibles.':'Pruebe con el diagnóstico, el número del indicador o el código sin punto.'}</p></div>`;
}
function quickSummary(item){
 const brief=quickSummaries.get(item.code);if(!brief)return `<section class="quick-summary detail-section"><div class="eyebrow">LECTURA RÁPIDA</div><h3>${item.kind==='evaluation'?'Qué debe revisar':'Qué aporta este indicador'}</h3><p>${esc(textOf(item.definition||item.name))}</p><p class="summary-fallback">Consulte la versión Full para revisar los criterios y el registro completo de esta ficha.</p><button class="text-link" data-detail-mode="full">Abrir versión Full ${svg('arrow')}</button></section>`;
 const list=(title,values,cls='')=>values?.length?`<div class="quick-block ${cls}"><h4>${title}</h4><ul>${values.map(value=>`<li>${esc(value)}</li>`).join('')}</ul></div>`:'';
 return `<section class="quick-summary detail-section"><div class="eyebrow">RESUMEN DE CONSULTA</div><h3>${item.kind==='evaluation'?'Lo indispensable para cumplir':'Lectura rápida'}</h3>${brief.population?`<p class="quick-population"><b>A quién aplica</b>${esc(brief.population)}</p>`:''}${list('Qué debe hacerse',brief.requiredActions,'quick-actions')}${list('En qué plazo',brief.timing)}${list('Cómo debe quedar registrado',brief.recording)}${brief.successCriterion?`<div class="success-criterion"><span>${svg('check')}</span><div><b>Criterio de cumplimiento</b><p>${esc(brief.successCriterion)}</p></div></div>`:''}${list('No omitir',brief.pitfalls,'quick-pitfalls')}${brief.calculation?`<div class="quick-calculation"><h4>Cómo se cuenta</h4><p>${esc(brief.calculation)}</p></div>`:''}${list('Precisiones que también aplican',brief.essentialNotes,'quick-precisions')}<div class="quick-meta"><span>Meta del indicador · diseño base</span><strong>${esc(metaText(item))}</strong><small>La meta institucional y el criterio de cada caso o registro se leen por separado.</small></div><a class="source-link" href="assets/diseno-epss-2024-2028.pdf#page=${brief.sourcePages?.[0]||item.pageStart}" target="_blank" rel="noopener">${svg('file')}Comprobar en la ficha original${brief.sourcePages?.length?' · p. '+esc(brief.sourcePages.join(', ')):''} <span aria-hidden="true">↗</span></a></section>`;
}
function codesForFicha(item){
 const entries=relatedCodes(item),note=codeNotes.find(entry=>entry.indicatorId===item.id);
 const groups=new Map();entries.forEach(entry=>{const key=[entry.groupTitle,entry.role,entry.criteria].join('|');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(entry);});
 const content=[...groups.values()].map(group=>{const first=group[0],source=codeSource(first);return `<div class="ficha-code-group"><div class="ficha-code-heading"><h4>${esc(first.groupTitle)}</h4><span class="code-role">${esc(first.role)}</span></div><p>${esc(first.criteria)}</p><div class="ficha-code-list">${group.map(entry=>`<div><button class="copy-code" data-copy-code="${esc(entry.code)}" aria-label="Copiar código ${esc(entry.code)}">${esc(entry.code)} ${svg('copy')}</button><span>${esc(entry.label)}</span></div>`).join('')}</div><a class="source-link" href="${source.file}#page=${first.pages?.[0]||1}" target="_blank" rel="noopener">${svg('file')}${source.label} · p. ${esc(first.pages?.join(', '))} ↗</a></div>`;}).join('');
 return `<section class="detail-section ficha-codes"><h3>Códigos CIE-10 y uso en esta ficha</h3>${note?.notes?.length?`<div class="code-indicator-note">${note.notes.map(text=>`<p>${esc(text)}</p>`).join('')}</div>`:''}${entries.length?content:note?.notes?.length?'':`<p>${codeLoadFailed?'Los códigos no se pudieron cargar en esta sesión. Consulte la ficha original.':'No se identificó un código CIE-10 explícito para esta ficha en las fuentes revisadas. El cálculo puede depender de edad, resultados, procedimientos u otros criterios: consulte la versión Full.'}</p>`}<button class="text-link" data-view="codigos">Ver todos los códigos CIE-10 ${svg('arrow')}</button></section>`;
}

function renderTopics(){
 const ids=[...new Set(all.map(catKey))];
 $('#side-topics').innerHTML=ids.map(id=>`<button data-topic="${esc(id)}"><span class="topic-dot" style="--topic:${COLOR[id]||'#537665'}"></span>${esc(SHORT[id]||id)}</button>`).join('');
 $('#topic-chips').innerHTML=`<button class="chip active" data-topic="all">Todos los temas</button>`+ids.map(id=>`<button class="chip" data-topic="${esc(id)}">${esc(SHORT[id]||id)}</button>`).join('');
}
function card(item){
 const title=TITLES[item.code]||item.name||item.sharedName||'Ficha complementaria';
 const updates=relatedChanges(item),favorite=favorites.has(item.id);
 return `<article class="ficha-card ${item.kind==='complementary'?'complementary-card':'principal-card'}" data-id="${esc(item.id)}" style="--topic:${COLOR[catKey(item)]||'#537665'}" tabindex="0" role="button" aria-label="Abrir ${esc(title)}"><div class="card-top"><span class="code">${esc(item.code||'COMPLEMENTARIO')}</span><button class="favorite-btn ${favorite?'saved':''}" data-favorite="${esc(item.id)}" aria-label="${favorite?'Quitar de favoritas':'Guardar en favoritas'}: ${esc(title)}" aria-pressed="${favorite}">${svg('star')}</button></div><span class="card-type-label">${item.kind==='evaluation'?'PRINCIPAL · EVALUACIÓN':'COMPLEMENTARIO · APOYO'}</span><span class="topic-label"><span class="topic-dot"></span>${esc(categoryLabel(item))}</span><h3>${esc(title)}</h3><p>${esc(summary(item.definition||item.name,150))}</p>${updates.length?`<span class="change-pill">${svg('refresh')} ${updates.some(u=>u.appliesFrom==='2026')?'Nota de actualización 2026':'Precisión documentada 2025'}</span>`:''}<div class="card-footer"><div><span class="meta-label">${item.kind==='evaluation'?'META DEL DISEÑO BASE':'TIPO DE INDICADOR'}</span><span class="meta-value">${esc(summary(metaText(item),66))}</span></div><span class="card-open" aria-hidden="true">${svg('arrow')}</span></div></article>`;
}
function renderCards(){
 const q=norm($('#search').value).trim(),tokens=q.split(/\s+/).filter(Boolean),type=$('#type-filter').value;
 let result=all.filter(item=>(activeTopic==='all'||catKey(item)===activeTopic)&&(type==='all'||(type==='evaluation'?item.kind==='evaluation':item.kind==='complementary'))&&matches(item.searchText,tokens));
 const sort=$('#sort-filter').value;
 if(sort==='name')result.sort((a,b)=>(TITLES[a.code]||a.name).localeCompare(TITLES[b.code]||b.name,'es'));
 else if(sort==='updates')result.sort((a,b)=>relatedChanges(b).length-relatedChanges(a).length||a.pageStart-b.pageStart);
 else result.sort((a,b)=>a.pageStart-b.pageStart||(a.code||a.id).localeCompare(b.code||b.id));
 $('#results-heading').textContent=(type==='complementary'?'Indicadores complementarios':'Indicadores principales')+(activeTopic!=='all'?' · '+(SHORT[activeTopic]||'Tema'):'');
 $('#result-count').textContent=`${result.length} ${result.length===1?'resultado':'resultados'}${q?' para su búsqueda':''}`;
 $('#cards').innerHTML=result.length?result.map(card).join(''):`<div class="empty-state">${svg('search')}<h3>No encontramos esa ficha</h3><p>Pruebe con otra palabra o quite los filtros.</p><button class="btn ghost" data-reset>Ver todas las fichas</button></div>`;
 document.querySelectorAll('[data-topic]').forEach(el=>{el.classList.toggle('active',el.dataset.topic===activeTopic);el.setAttribute('aria-pressed',String(el.dataset.topic===activeTopic));});
 $('#total-side').textContent=all.filter(i=>i.kind==='evaluation').length;$('#favorites-count').textContent=favorites.size;
 $('#hero-total').textContent=all.filter(i=>i.kind==='evaluation').length;document.querySelectorAll('[data-type]').forEach(el=>{el.classList.toggle('active',el.dataset.type===type);el.setAttribute('aria-pressed',String(el.dataset.type===type));});
 renderFavorites();
}
function renderFavorites(){
 const fav=all.filter(i=>favorites.has(i.id));
 $('#favorite-cards').innerHTML=fav.length?fav.map(card).join(''):`<div class="empty-state">${svg('star')}<h3>Su selección empieza aquí</h3><p>Toque la estrella de una ficha para encontrarla rápidamente en esta sección.</p><button class="btn primary" data-view="explorar">Explorar fichas</button></div>`;
 const rec=recent.map(id=>all.find(i=>i.id===id)).filter(Boolean).slice(0,6);
 $('#recent-cards').innerHTML=rec.map(card).join('');$('#recent-section').classList.toggle('hidden',!rec.length);
}
function toggleFavorite(id){
 const item=all.find(x=>x.id===id);if(!item)return;
 if(favorites.has(id)){favorites.delete(id);toast('Ficha retirada de favoritas.');}else{favorites.add(id);toast('Ficha guardada en favoritas.');}
 persist();renderCards();
 if(activeId===id){const b=$('#detail-body [data-favorite]');if(b){b.setAttribute('aria-pressed',String(favorites.has(id)));b.innerHTML=svg('star')+(favorites.has(id)?'Guardada':'Guardar ficha');}}
}
function renderUpdates(){
 $('#updates').innerHTML=changes.map(updateCard).join('');
 $('#interpretation-notes').innerHTML=notes.map(n=>`<article class="update-card note-card"><h3>${esc(n.title)}</h3><p>${esc(n.summary)}</p><p class="update-limit">${esc(n.limitations)}</p><a class="source-link" href="assets/informe-epss-pna-2025.pdf#page=${n.reportPdfPages?.[0]||1}" target="_blank" rel="noopener">${svg('file')}Informe 2025 · página ${esc(n.reportPrintedPages?.[0]||'')} <span aria-hidden="true">↗</span></a></article>`).join('');
}
function updateCard(u,compact=false){
 const related=all.filter(i=>u.baseCodes?.includes(i.code));
 const source=updateSource(u),table=u.comparisonTable;
 return `<article class="update-card ${compact?'compact':''}"><div class="update-top"><span class="pill">${esc(u.appliesFrom)}</span><span class="update-kind">${esc(u.status)}</span></div><h3>${esc(u.title)}</h3><p>${esc(u.summary)}</p>${table?`<div class="table-scroll"><table><thead><tr>${table.columns.map(x=>`<th scope="col">${esc(x)}</th>`).join('')}</tr></thead><tbody>${table.rows.map(r=>`<tr>${r.map(x=>`<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:''}${u.baseContrast?`<p class="base-contrast"><b>Diseño base:</b> ${esc(u.baseContrast)}</p>`:''}<details><summary>Alcance de esta nota</summary><ul>${(u.limitations||[]).map(l=>`<li>${esc(l)}</li>`).join('')}</ul></details><div class="update-links"><a class="source-link" href="${source.file}#page=${u.reportPdfPages?.[0]||1}" target="_blank" rel="noopener">${svg('file')}${source.label} · p. ${esc(u.reportPrintedPages?.join(', '))} <span aria-hidden="true">↗</span></a>${!compact?related.map(i=>`<button class="text-link" data-open="${esc(i.id)}">${esc(i.code)} ${svg('arrow')}</button>`).join(''):''}</div></article>`;
}
function setView(view,options={}){
 if(!['explorar','codigos','favoritas','cambios','fuentes'].includes(view))view='explorar';
 activeView=view;document.querySelectorAll('.view').forEach(el=>el.classList.toggle('hidden',el.id!==`view-${view}`));
 document.querySelectorAll('[data-view]').forEach(el=>{el.classList.toggle('active',el.dataset.view===view);if(el.closest('nav'))el.setAttribute('aria-current',el.dataset.view===view?'page':'false');});
 if(!options.noHash)history.replaceState(null,'',`#${view}`);
 if(!options.noScroll)window.scrollTo({top:0,behavior:'instant'});
 if(view==='favoritas')renderFavorites();
}
function fieldBlock(label,value,mode='text'){
 if(!present(value))return '';
 const s=textOf(value).trim();
 let body;
 if(mode==='formula'){
  const fraction=s.split(/\n[x×]\s*100\s*\n/i);
  if(fraction.length===2)body=`<div class="formula-layout"><div class="fraction"><span>${esc(fraction[0])}</span><span>${esc(fraction[1])}</span></div><span class="multiplier">× 100</span></div>`;
  else {const item=all.find(x=>x.id===activeId);body=`<a class="source-link" href="${sourceUrl(item)}" target="_blank" rel="noopener">${svg('file')}Ver disposición matemática en el PDF original <span aria-hidden="true">↗</span></a><details class="formula-transcript"><summary>Transcripción del contenido</summary><div class="formula-text">${esc(s)}</div></details>`;}
 }
 else body=`<div class="field-text">${esc(s).replace(/\n/g,'<br>')}</div>`;
 return `<div class="definition-item"><dt>${label}</dt><dd>${body}</dd></div>`;
}
function openFicha(id,options={}){
 const item=all.find(x=>x.id===id);if(!item)return;
 lastFocus=document.activeElement;activeId=id;
 recent=[id,...recent.filter(v=>v!==id)].slice(0,8);persist();renderFavorites();
 const updates=relatedChanges(item),title=TITLES[item.code]||item.name;
 const code=item.code||'Indicador complementario';
 $('#detail-category').innerHTML=`<span class="topic-dot" style="--topic:${COLOR[catKey(item)]||'#537665'}"></span>${esc(categoryLabel(item))}`;
 $('#detail-body').innerHTML=`<span class="detail-kind pill">${item.kind==='evaluation'?'Indicador principal de evaluación':'Indicador complementario de apoyo'}</span><div class="detail-code">${esc(code)}</div><div class="ficha-initiative"><b>Iniciativa de la DRIPSSHA</b><span>Dirección de Red Integrada de Prestación de Servicios de Salud Huetar Atlántica</span></div><h2 id="detail-title" class="detail-title">${esc(title)}</h2><div class="detail-actions"><button class="btn ghost" data-favorite="${esc(id)}" aria-pressed="${favorites.has(id)}">${svg('star')}${favorites.has(id)?'Guardada':'Guardar ficha'}</button><button class="icon-btn" data-copy="${esc(id)}" aria-label="Copiar enlace de esta ficha" title="Copiar enlace">${svg('copy')}</button><button class="icon-btn" data-print aria-label="Imprimir esta ficha" title="Imprimir">${svg('print')}</button><a class="btn primary" href="${sourceUrl(item)}" target="_blank" rel="noopener">Original PDF ${svg('arrow')}</a></div><div class="detail-mode-switch" role="group" aria-label="Versión de la ficha"><button data-detail-mode="resumen" class="active" aria-pressed="true"><b>Resumen</b><span>Lo indispensable</span></button><button data-detail-mode="full" aria-pressed="false"><b>Full</b><span>Todos los criterios</span></button></div>${updates.length?`<section class="detail-section"><div class="eyebrow">NOTAS POSTERIORES AL DISEÑO</div>${updates.map(u=>updateCard(u,true)).join('')}</section>`:''}<div id="detail-summary">${quickSummary(item)}</div><div id="detail-full" class="full-criteria hidden"><div class="base-version-label">${svg('calendar')}Criterios del diseño base · noviembre de 2024</div><section class="detail-section"><h3>Qué evalúa</h3>${item.name!==title?`<p class="official-name">${esc(item.name)}</p>`:''}<div class="field-text">${esc(textOf(item.definition||item.name)).replace(/\n/g,'<br>')}</div>${item.dimension?`<div class="inline-tags"><span class="pill">${esc(item.dimension)}</span>${item.classification?`<span class="pill">${esc(item.classification)}</span>`:''}</div>`:''}</section><section class="detail-section"><h3>Cálculo y metas</h3><dl class="definition-list">${fieldBlock('Fórmula de cálculo',item.formula,'formula')}${fieldBlock('Meta del diseño',item.target)}${fieldBlock('Línea base',item.baseline)}${fieldBlock('Periodicidad de medición',item.periodicity)}</dl></section>${present(item.includes)||present(item.excludes)||present(item.variables)?`<section class="detail-section"><h3>Población y criterios</h3><dl class="definition-list">${fieldBlock('Incluye',item.includes)}${fieldBlock('Excluye',item.excludes)}${fieldBlock('Variables utilizadas',item.variables)}</dl></section>`:''}<section class="detail-section"><h3>Registro y fuente</h3><dl class="definition-list">${fieldBlock('Fuente de información',item.sources)}${fieldBlock('Comentarios de la ficha',item.comments)}</dl><a class="source-link" href="${sourceUrl(item)}" target="_blank" rel="noopener">${svg('file')}Diseño general · ${item.pageStart===item.pageEnd?'página '+item.pageStart:'páginas '+item.pageStart+' a '+item.pageEnd} <span aria-hidden="true">↗</span></a></section>${item.sharedCodes?.length>1?`<div class="notice small"><span>${svg('info')}</span><p>La fuente agrupa esta ficha con los códigos ${esc(item.sharedCodes.join(', '))}. Los criterios compartidos se conservan completos.</p></div>`:''}<details class="original-text"><summary>Texto completo de la ficha</summary><pre>${esc(item.fullText)}</pre></details></div>${codesForFicha(item)}<p class="detail-footnote">Consulta documental EPSS. Para indicaciones asistenciales, utilice el protocolo clínico aplicable. <button class="text-link" data-go-sources>Ver fuentes y versiones</button></p>`;
 $('#detail-modal').classList.remove('hidden');document.body.classList.add('modal-open');$('.detail-panel').scrollTop=0;$('#close-detail').focus();
 if(!options.noHash)history.replaceState(null,'',`#ficha=${encodeURIComponent(id)}`);
}
function setDetailMode(mode){
 const full=mode==='full';$('#detail-summary')?.classList.toggle('hidden',full);$('#detail-full')?.classList.toggle('hidden',!full);
 document.querySelectorAll('[data-detail-mode]').forEach(button=>{button.classList.toggle('active',button.dataset.detailMode===(full?'full':'resumen'));button.setAttribute('aria-pressed',String(button.dataset.detailMode===(full?'full':'resumen')));});
}
function closeDetail(){
 $('#detail-modal').classList.add('hidden');activeId=null;document.body.classList.remove('modal-open');history.replaceState(null,'',`#${activeView}`);if(lastFocus?.isConnected)lastFocus.focus();
}
function useHash(){const h=location.hash.slice(1);if(h.startsWith('ficha=')){setView('explorar',{noHash:true,noScroll:true});openFicha(decodeURIComponent(h.slice(6)),{noHash:true});}else{if(activeId)closeDetail();setView(h||'explorar',{noHash:true});}}
function reset(){activeTopic='all';$('#search').value='';$('#type-filter').value='evaluation';$('#sort-filter').value='code';renderCards();}

document.addEventListener('click',async e=>{
 const el=e.target.closest('button,a,[data-id]');if(!el)return;
 if(el.dataset.detailMode){setDetailMode(el.dataset.detailMode);return;}
 if(el.dataset.copyCode){try{await navigator.clipboard.writeText(el.dataset.copyCode);toast('Código '+el.dataset.copyCode+' copiado.');}catch{toast('Código: '+el.dataset.copyCode);}return;}
 if(el.dataset.favorite){e.stopPropagation();toggleFavorite(el.dataset.favorite);return;}
 if(el.dataset.view){if(activeId)closeDetail();setView(el.dataset.view);return;}
 if(el.dataset.type){$('#type-filter').value=el.dataset.type;setView('explorar');renderCards();return;}
 if(el.dataset.topic){activeTopic=el.dataset.topic;setView('explorar');renderCards();return;}
 if(el.hasAttribute('data-search')){activeTopic='all';$('#type-filter').value='evaluation';$('#search').value=el.dataset.search;renderCards();$('#search').focus();return;}
 if(el.hasAttribute('data-reset')){reset();return;}
 if(el.dataset.open||el.dataset.id){openFicha(el.dataset.open||el.dataset.id);return;}
 if(el.dataset.copy){const url=new URL(location.href);url.hash=`ficha=${encodeURIComponent(el.dataset.copy)}`;try{await navigator.clipboard.writeText(url.href);toast('Enlace de la ficha copiado.');}catch{toast('Puede copiar la dirección de esta ficha desde el navegador.');}return;}
 if(el.hasAttribute('data-print')){window.print();return;}
 if(el.hasAttribute('data-go-sources')){closeDetail();setView('fuentes');return;}
});
$('#code-search').addEventListener('input',renderCodes);
$('#search').addEventListener('input',renderCards);$('#type-filter').addEventListener('change',renderCards);$('#sort-filter').addEventListener('change',renderCards);
$('#close-detail').addEventListener('click',closeDetail);
$('#detail-modal').addEventListener('click',e=>{if(e.target===$('#detail-modal'))closeDetail();});
function closeInstall(){$('#install-modal').classList.add('hidden');document.body.classList.remove('modal-open');$('#install-btn').focus();}
$('#install-btn').addEventListener('click',()=>{$('#install-modal').classList.remove('hidden');document.body.classList.add('modal-open');$('#close-install').focus();});$('#close-install').addEventListener('click',closeInstall);
$('#install-modal').addEventListener('click',e=>{if(e.target===$('#install-modal'))closeInstall();});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){if(!$('#install-modal').classList.contains('hidden'))closeInstall();else if(activeId)closeDetail();}
 if(e.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){e.preventDefault();if(activeId)closeDetail();setView(activeView==='codigos'?'codigos':'explorar');$(activeView==='codigos'?'#code-search':'#search').focus();}
 if((e.key==='Enter'||e.key===' ')&&document.activeElement.matches('.ficha-card')){e.preventDefault();openFicha(document.activeElement.dataset.id);}
 if(e.key==='Tab'){
  const modal=!$('#install-modal').classList.contains('hidden')?$('#install-modal'):!$('#detail-modal').classList.contains('hidden')?$('#detail-modal'):null;
  if(modal){const f=[...modal.querySelectorAll('button,a[href],input,select,summary,[tabindex="0"]')].filter(x=>x.getClientRects().length);if(f.length){if(e.shiftKey&&document.activeElement===f[0]){e.preventDefault();f[f.length-1].focus();}else if(!e.shiftKey&&document.activeElement===f[f.length-1]){e.preventDefault();f[0].focus();}}}
 }
});
window.addEventListener('hashchange',()=>{if(all.length)useHash();});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('#native-install').classList.remove('hidden');});
$('#native-install').addEventListener('click',async()=>{if(!installPrompt)return;await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;closeInstall();});

async function setupOffline(){
 if(!('serviceWorker'in navigator)){ $('#offline-btn').disabled=true;$('#offline-status').textContent='Este navegador no permite guardar la aplicación sin conexión.';return; }
 try{await navigator.serviceWorker.register('sw.js');await navigator.serviceWorker.ready;}
 catch{$('#offline-status').textContent='La consulta funciona en línea. El guardado sin conexión no está disponible en esta sesión.';}
}
$('#offline-btn').addEventListener('click',async()=>{
 const btn=$('#offline-btn');btn.disabled=true;$('#offline-status').textContent='Guardando aplicación y documentos…';
 try{
  const reg=await navigator.serviceWorker.ready;if(!reg.active)throw Error('Sin servicio activo');
  const channel=new MessageChannel();const result=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Tiempo de espera agotado')),90000);channel.port1.onmessage=e=>{clearTimeout(timer);e.data.ok?resolve(e.data):reject(Error(e.data.error));};});
  reg.active.postMessage({type:'CACHE_DOCUMENTS'},[channel.port2]);await result;
  $('#offline-status').textContent='Aplicación y los tres documentos guardados para consultar en este dispositivo sin conexión.';toast('Documentos guardados.');
 }catch{$('#offline-status').textContent='No se completó el guardado. Compruebe la conexión e intente de nuevo.';}finally{btn.disabled=false;}
});

async function init(){
 fillIcons();
 try{
  const extraData=Promise.allSettled([fetch('assets/codigos-cie10.json').then(r=>{if(!r.ok)throw Error('Códigos no disponibles');return r.json();}),fetch('assets/resumenes-cumplimiento.json').then(r=>{if(!r.ok)throw Error('Resúmenes no disponibles');return r.json();})]);
  const [r1,r2]=await Promise.all([fetch('assets/indicadores.json'),fetch('assets/actualizaciones.json')]);if(!r1.ok||!r2.ok)throw Error('Fallo de carga');
  const data=await r1.json(),updates=await r2.json();
  categories=data.categories||[];changes=updates.updates||[];notes=updates.interpretationNotes||[];
  all=[...(data.indicators||[]).map(i=>({...i,kind:'evaluation'})),...(data.complementaries||[]).map(i=>({...i,kind:'complementary'}))];
  const extras=await extraData;
  codeLoadFailed=extras[0].status!=='fulfilled';codeGroups=codeLoadFailed?[]:(extras[0].value.groups||[]);codeNotes=codeLoadFailed?[]:(extras[0].value.indicatorNotes||[]);codeEntries=codeGroups.flatMap(group=>(group.entries||[]).map(entry=>({...entry,groupTitle:group.title})));
  quickSummaries=new Map(extras[1].status==='fulfilled'?(extras[1].value.items||[]).map(item=>[item.code,item]):[]);
  all.forEach(item=>{item.id=item.id||item.code;item.pageStart=item.pageStart||item.pages?.[0]||11;item.pageEnd=item.pageEnd||item.pages?.at(-1)||item.pageStart;item.searchText=norm([item.code,item.name,TITLES[item.code],item.category,SHORT[catKey(item)],item.definition,item.includes,item.excludes,item.fullText,relatedCodes(item).map(entry=>[entry.code,entry.label,entry.role,entry.criteria].join(' ')).join(' '),catKey(item)==='06'?'diabetes DM2 azúcar glicemia HbA1c':'',catKey(item)==='01'?'captación prenatal posparto puerperio embarazo':''].map(textOf).join(' '));});
  const valid=new Set(all.map(i=>i.id));favorites=new Set([...favorites].filter(id=>valid.has(id)));recent=recent.filter(id=>valid.has(id));
  renderTopics();renderCards();renderCodes();renderUpdates();useHash();setupOffline();
 }catch(err){$('#cards').innerHTML=`<div class="empty-state"><h3>No se pudo cargar el contenido</h3><p>Compruebe su conexión y vuelva a abrir la aplicación.</p><button class="btn primary" id="retry">Volver a cargar</button></div>`;$('#result-count').textContent='Contenido no disponible';$('#retry')?.addEventListener('click',()=>location.reload());console.error('No se pudo cargar el catálogo EPSS.');}
}
init();
