#!/usr/bin/env python3
"""Comprueba integridad documental y vínculos antes de publicar."""
import hashlib
import json
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
catalog = json.loads((ROOT / 'dist/assets/catalogo.json').read_text())
mr = json.loads((ROOT / 'dist/assets/mr.json').read_text())
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
assert mr['confirmedCurrentPeriod'] is None, 'No hay respaldo actual confirmado'
assert len(mr['historicalSets'][0]['items']) == 22
assert sum(bool(x['contributesToResultsSum']) for x in mr['historicalSets'][0]['items']) == 21
assert sum(item.get('code', '').startswith('02-') for item in items) == 6
assert len({item['sourceId'] for item in items if item.get('code', '').startswith('02-')}) == 2
for item_id, category in [('comp-06-inercia-glicemico', '06'), ('comp-06-inercia-lipidico', '06'), ('comp-07-inercia-terapeutica', '07')]:
    assert next(item for item in items if item['id'] == item_id)['categoryId'] == category
print(f'Integridad verificada: {len(items)} indicadores, {len(catalog["documents"])} documentos, MR histórica 22/21.')
