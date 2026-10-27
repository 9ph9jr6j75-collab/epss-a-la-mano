#!/usr/bin/env node
'use strict';

// Full is a complete reading view: no source characters may disappear when
// fields, fractions, and source table cells are rearranged for small screens.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'dist/assets/catalogo.json'), 'utf8'));
const {renderFullDocument} = require(path.join(root, 'dist/full-reader.js'));

assert.equal(catalog.items.length, 84, 'Debe conservar las 84 fichas');
const rendered = catalog.items.map(item => {
  assert.ok(item.fullReadingPages?.length, `${item.id}: falta lectura adaptable`);
  assert.ok(item.fullReadingPages.every(page => Array.isArray(page.blocks)), `${item.id}: página incompleta`);
  const html = renderFullDocument(item.fullText, {pages:item.fullReadingPages, sourceFile:item.sourceFile});
  assert.doesNotMatch(html, /<pre\b|class="source-layout(?:\s|"|-)/, `${item.id}: conserva columnas de texto de ancho fijo`);
  return {id:item.id, html};
});

// The parser decodes HTML entities and ignores only presentation labels such
// as page numbers and repeated table-header context. Actual source text stays.
const parser = spawnSync('python3', ['-c', String.raw`
import json, sys
from html.parser import HTMLParser
class SourceText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.parts = []
    def handle_starttag(self, tag, attrs):
        excluded = any(value for _, value in self.stack) or any(key == 'data-reader-label' for key, _ in attrs)
        if tag not in {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}:
            self.stack.append((tag, excluded))
    def handle_endtag(self, tag):
        for i in range(len(self.stack)-1, -1, -1):
            if self.stack[i][0] == tag:
                self.stack = self.stack[:i]
                break
    def handle_data(self, text):
        if not any(value for _, value in self.stack):
            self.parts.append(text)
out = []
for record in json.load(sys.stdin):
    parser = SourceText()
    parser.feed(record['html'])
    out.append({'id':record['id'], 'text':''.join(parser.parts)})
json.dump(out, sys.stdout, ensure_ascii=False)
`], {input:JSON.stringify(rendered), encoding:'utf8', maxBuffer:16*1024*1024});
assert.equal(parser.status, 0, parser.stderr);
const visible = new Map(JSON.parse(parser.stdout).map(row => [row.id, row.text]));
const chars = value => {
  const count = new Map();
  for (const character of String(value).replace(/\s/g, '')) count.set(character, (count.get(character) || 0) + 1);
  return [...count].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
};
for (const item of catalog.items) {
  assert.deepEqual(chars(visible.get(item.id)), chars(item.fullText), `${item.id}: el texto visible perdió o añadió caracteres fuente`);
}

const blocksOf = id => catalog.items.find(item => item.id === id).fullReadingPages.flatMap(page => page.blocks);
const early = blocksOf('01-01-1.0');
const variables = early.find(block => /^Variables/.test(block.label || ''));
assert.ok(variables, 'Atención temprana: Variables debe ser un campo independiente');
assert.match(variables.text, /Número de menores de un año/);
assert.match(variables.text, /Número de nacimientos del periodo/);
assert.doesNotMatch(variables.text, /Fórmula de cálculo/, 'Variables no debe absorber la fórmula');
const calculation = early.find(block => /^Fórmula/.test(block.label || ''));
assert.ok(calculation?.formula, 'Atención temprana: debe conservar una fracción legible');
assert.match(calculation.formula.numerator, /Número de menores de un año/);
assert.match(calculation.formula.denominator, /Número de nacimientos del periodo/);
assert.match(calculation.formula.multiplier, /[xX×]\s*100/);

const hta = blocksOf('07-02-2.0').find(block => /^Definición/.test(block.label || ''));
assert.ok(hta, 'HTA: definición debe permanecer unida a sus criterios');
assert.match(hta.text, /Bajo\/Moderado riesgo cardiovascular/);
assert.match(hta.text, /<140/);
assert.match(hta.text, /<130/);
assert.match(hta.text, /85 y más años/);

// The prenatal source table uses merged cells. The mobile view may stack
// them, but every intervention must keep its original gestational columns.
const prenatal = blocksOf('01-04-2.1').find(block => block.kind === 'table');
assert.ok(prenatal, 'Prenatal: falta la tabla de intervenciones');
assert.equal(prenatal.headers.length, 5, 'Prenatal: deben conservarse los cinco grupos gestacionales');
const interventionCells = prenatal.rows.flatMap(row => row.cells || row).filter(cell => cell.text);
assert.equal(interventionCells.length, 14, 'Prenatal: deben conservarse las 14 celdas de intervención');
const interventionStarts = [
  [/Primer control/, 0], [/PA\) en el primer control/, 0],
  [/VDRL/, 1], [/VIH/, 1],
  [/DM pregestacional/, 2], [/DM gestacional/, 2],
  [/Segundo control/, 2], [/PA en el segundo control/, 2],
  [/Tercer control/, 2], [/PA en tercer control/, 2],
  [/Cuarto control/, 3], [/PA en el cuarto control/, 3],
  [/Quinto control/, 4], [/PA en el quinto control/, 4],
];
for (const [phrase, start] of interventionStarts) {
  const cell = interventionCells.find(cell => phrase.test(cell.text.replace(/\s+/g, ' ')));
  assert.ok(cell, `Prenatal: no aparece ${phrase}`);
  assert.equal(cell.colStart, start, `Prenatal: cambió el comienzo de ${phrase}`);
  assert.equal(cell.colSpan, 5 - start, `Prenatal: cambió el alcance de ${phrase}`);
}

const normalize = text => String(text).replace(/\s+/g, ' ').trim();
const formulaOf = id => blocksOf(id).find(block => /^Fórmula/.test(block.label || ''));
const bioethics = formulaOf('13-01-1.0').formula;
assert.equal(normalize(bioethics.numerator), 'Total de puntos obtenidos en el formulario de seguimiento de CBC');
assert.equal(normalize(bioethics.denominator), 'Total de puntos del formulario de seguimiento de CBC');
assert.match(bioethics.multiplier, /x\s*100/, 'Bioética: el multiplicador final de la fuente aplica a la fracción completa');
const cost = formulaOf('11-01-2.0').formula;
assert.equal(normalize(cost.numerator.numerator), 'Gasto en Sueldos para Cargos Fijos2 año');
assert.equal(normalize(cost.numerator.denominator), 'Consultas de los profesionales de salud año');
assert.equal(normalize(cost.denominator.numerator), 'Gasto en Sueldos para Cargos Fijos2 año anterior');
assert.equal(normalize(cost.denominator.denominator), 'Consultas de los profesionales de salud año anterior');
assert.equal(cost.multiplier, '', 'Eficiencia: la razón de razones no se multiplica por cien');
const prenatalRatios = formulaOf('comp-01-paquete-por-grupo').formulas;
assert.equal(prenatalRatios.length, 5, 'Paquete básico complementario: deben aparecer las cinco fracciones');
for (const [index, age] of [/una y 19/, /20 y 28/, /29 y 32/, /33 y 40/, /41 semanas/].entries()) {
  assert.match(normalize(prenatalRatios[index].numerator), age);
  assert.match(normalize(prenatalRatios[index].denominator), age);
  assert.match(prenatalRatios[index].numerator, /completa un paquete básico/);
  assert.match(prenatalRatios[index].denominator, /FUR válida/);
  assert.match(prenatalRatios[index].multiplier, /x\s*100/);
}
for (const id of ['comp-01-transito-muestras', 'comp-11-gasto-per-capita-complejidad']) {
  const formula = formulaOf(id).formula;
  assert.ok(formula.numerator && formula.denominator, `${id}: conserva la relación entre términos`);
  assert.equal(formula.multiplier, '', `${id}: no debe agregar un multiplicador`);
}
for (const id of ['comp-02-isbd', 'comp-02-irbd', 'comp-02-ipbd']) {
  assert.equal(formulaOf(id).equation, true, `${id}: debe conservar la fórmula aditiva y sus líneas`);
}
const tableValues = table => table.rows.map(row => (row.cells || row).map(cell => normalize(typeof cell === 'string' ? cell : cell.text)));
const lipid = blocksOf('comp-03-lipidos-alto-riesgo').find(block => block.kind === 'table');
assert.ok(lipid, 'Perfil lipídico: falta la tabla fuente');
assert.equal(lipid.headers.length, 4);
assert.deepEqual(tableValues(lipid), [
  ['Colesterol total', '<170', '170-199', '≥200'],
  ['LDL-colesterol', '<110', '110-129', '≥130'],
  ['HDL-colesterol', '>45', '40-45', '<40'],
  ['Triglicéridos menores de 10 años', '<75', '75-99', '≥100'],
  ['Triglicéridos edad de 10-19 años', '<90', '90-129', '≥130'],
], 'Perfil lipídico: cada umbral debe mantener su fila y su columna');
for (const id of ['02-03-1.0', '02-04-1.0', '02-05-1.0', '02-06-1.0']) {
  const oral = blocksOf(id).find(block => block.kind === 'table');
  assert.ok(oral, `${id}: falta la tabla de metas`);
  assert.equal(oral.headers.length, 2);
  assert.deepEqual(tableValues(oral), [['0 a 9','80'], ['10 a 19','80'], ['20 a 64','75'], ['65 y más','73']], `${id}: las metas deben mantener su grupo de edad`);
}

console.log(`Lectura Full verificada: ${catalog.items.length} fichas íntegras, campos adaptables, fracción y relaciones de la tabla prenatal conservadas.`);
