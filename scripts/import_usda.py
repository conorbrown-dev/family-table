"""Convert an official FoodData Central JSON ZIP into the bundled catalog.
Usage: python3 scripts/import_usda.py /path/to/FoodData_Central_*_json_*.zip
Download: https://fdc.nal.usda.gov/download-datasets/
"""
import json, sys, uuid, zipfile
from pathlib import Path
archive=zipfile.ZipFile(sys.argv[1])
foods=json.loads(archive.read(next(n for n in archive.namelist() if n.endswith('.json'))))
entries=[]
for collection in foods.values():
 for food in collection:
  if not food.get('description'):continue
  entries.append({'id':str(uuid.uuid5(uuid.NAMESPACE_URL,'https://fdc.nal.usda.gov/food/'+str(food['fdcId']))),'name':food['description'],'category':food.get('foodCategory',{}).get('description','USDA foods'),'archived':False})
path=Path(__file__).resolve().parents[1]/'backend/src/FamilyTable.Infrastructure/Data/usda-foods.json'
path.parent.mkdir(parents=True,exist_ok=True)
path.write_text(json.dumps(entries,ensure_ascii=False,separators=(',',':')))
print(f'Imported {len(entries)} foods to {path}')
