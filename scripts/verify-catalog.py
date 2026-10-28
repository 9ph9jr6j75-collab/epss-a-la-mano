#!/usr/bin/env python3
"""Comprueba integridad documental y vínculos antes de publicar."""
import hashlib
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
catalog = json.loads((ROOT / 'dist/assets/catalogo.json').read_text())
mr = json.loads((ROOT / 'dist/assets/mr.json').read_text())
assert mr == json.loads((ROOT / 'data/mr-evidencia.json').read_text()), 'La referencia MR publicada difiere de su fuente de datos'
items = catalog['items']
assert len({item['id'] for item in items}) == len(items), 'IDs duplicados'
for item in items:
    assert item['population'] and item['requiredActions'], item['id']
    assert len(item['fullText'].strip()) > 150, item['id']
    assert (ROOT / 'dist' / item['sourceFile']).is_file(), item['id']
    assert item['categoryId'] in catalog['categories'], item['id']
    if item.get('code'):
        assert re.sub(r'\s+', '', item['code']) in re.sub(r'\s+', '', item['fullText']), item['id']
    if item.get('areaApplicability') == 'unclear':
        assert item.get('applicabilityNote'), item['id']
for document in catalog['documents']:
    path = ROOT / 'dist' / document['file']
    assert path.is_file(), document['file']
    assert hashlib.sha256(path.read_bytes()).hexdigest() == document['sha256'], document['id']
for record in mr['historicalSets'][0]['items']:
    assert sum(item.get('family') == record['family'] for item in items) == 1, record['family']
# La referencia operativa 2026 está adoptada; aún no equivale a una
# verificación completa de las fórmulas del instrumento de cálculo.
assert mr['confirmedCurrentPeriod'] is None, 'No presentar la adopción operativa como verificación formal del cálculo'
assert len(mr['historicalSets'][0]['items']) == 22
assert sum(bool(x['contributesToResultsSum']) for x in mr['historicalSets'][0]['items']) == 21
historical_clinical = {record['family'] for record in mr['historicalSets'][0]['items'] if record['contributesToResultsSum']}
new_families = {'01-04', '03-02', '03-05'}
current = mr['currentSet']
current_records = current['items']
current_families = {record['family'] for record in current_records}
assert current['year'] == 2026 and current['status'] == 'adopted_operational_reference'
assert len(current_records) == len(current_families) == current['indicatorCount'] == 24, 'La referencia MR 2026 debe tener 24 familias únicas'
assert current_families == historical_clinical | new_families, 'Cambió la composición adoptada de MR 2026'
assert {record['family'] for record in current_records if record.get('newInReference')} == new_families, 'Identificación incorrecta de las incorporaciones MR 2026'
assert current['resultsIndicatorCount'] == sum(bool(record['contributesToResultsSum']) for record in current_records) == 24
for record in current_records:
    matches = [item for item in items if item.get('family') == record['family']]
    assert len(matches) == 1, record['family']
    assert matches[0]['kind'] == 'evaluation', record['family']
    assert record['catalogCode'] == matches[0]['code'], record['family']
pending = current['pendingParticipation']
assert {record['family'] for record in pending} == {'11-01'}, 'Falta identificar por separado la participación pendiente de gasto en cargos fijos'
assert not current_families.intersection(record['family'] for record in pending), 'Un indicador pendiente no debe contarse en la referencia MR 2026'
for record in pending:
    assert any(item.get('family') == record['family'] and item.get('code') == record['catalogCode'] for item in items), record['family']
    assert record.get('note'), record['family']
assert current['source'].get('title') and current['source'].get('issuerDeclared'), 'Falta identificar la fuente de referencia MR 2026'
assert sum(item.get('code', '').startswith('02-') for item in items) == 6
assert len({item['sourceId'] for item in items if item.get('code', '').startswith('02-')}) == 2
posparto = next(item for item in items if item['id'] == '01-02-2.0')
posparto_codes = {'Z390','Z391','Z392','Z370','Z379','O800','O03','O04','O05','O06','O021','O60'}
assert {entry['code'].replace('.', '') for entry in posparto['cie10']} == posparto_codes, 'Lista CIE-10 de posparto incompleta'
assert posparto.get('cie10Note') and posparto.get('cie10NoteSource'), 'Falta aclarar la función de los códigos de posparto'
source_compact = re.sub(r'\s+', '', posparto['fullText'])
assert all(code in source_compact for code in posparto_codes), 'Código de posparto sin respaldo en su ficha'
for item_id, category in [('comp-06-inercia-glicemico', '06'), ('comp-06-inercia-lipidico', '06'), ('comp-07-inercia-terapeutica', '07')]:
    assert next(item for item in items if item['id'] == item_id)['categoryId'] == category
print(f'Integridad verificada: {len(items)} indicadores, {len(catalog["documents"])} documentos, MR 2026 de 24 familias y MR histórica 22/21.')
