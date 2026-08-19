import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

test('i18n dictionaries key parity and completeness', () => {
  const i18nPath = path.resolve(process.cwd(), 'js/i18n.js');
  const code = fs.readFileSync(i18nPath, 'utf8');

  const context = {
    window: {},
    document: { documentElement: { lang: 'en' } },
    localStorage: {
      getItem: () => 'en',
      setItem: () => {}
    }
  };
  context.window = context;

  vm.createContext(context);
  vm.runInContext(code, context);

  const dicts = context.window.dictionaries;
  assert.ok(dicts, 'dictionaries object should be defined on window');
  assert.ok(dicts.ru, 'Russian dictionary should be present');
  assert.ok(dicts.en, 'English dictionary should be present');

  function checkKeys(objRu, objEn, path = '') {
    const keysRu = Object.keys(objRu).sort();
    const keysEn = Object.keys(objEn).sort();

    assert.deepEqual(
      keysRu,
      keysEn,
      `Dictionary keys mismatch at ${path || 'root'}:\nRU: ${keysRu.join(', ')}\nEN: ${keysEn.join(', ')}`
    );

    for (const key of keysRu) {
      const currentPath = path ? `${path}.${key}` : key;
      const valRu = objRu[key];
      const valEn = objEn[key];

      assert.equal(
        typeof valRu,
        typeof valEn,
        `Type mismatch at ${currentPath}: RU is ${typeof valRu}, EN is ${typeof valEn}`
      );

      if (typeof valRu === 'object' && valRu !== null && !Array.isArray(valRu)) {
        checkKeys(valRu, valEn, currentPath);
      }
    }
  }

  checkKeys(dicts.ru, dicts.en);
});
