import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(root, 'data', name), 'utf8'));
}

function assertContinuous(items, label) {
  items.forEach((item, index) => {
    assert.equal(item.n, index + 1, `${label}: expected No.${index + 1}`);
  });
}

function loadDataScript(name, globalName) {
  const context = vm.createContext({ window: {} });
  vm.runInContext(fs.readFileSync(path.join(root, 'data', name), 'utf8'), context);
  return JSON.parse(JSON.stringify(context.window[globalName]));
}

const eju = readJson('vocab.json');
assert.equal(eju.length, 3200);
assertContinuous(eju, 'EJU');
assert.deepEqual(
  { n: eju[17].n, w: eju[17].w, r: eju[17].r, en: eju[17].en },
  { n: 18, w: '一般', r: 'いっぱん', en: 'general' }
);
for (const word of ['届け', '申し込む', '同意', '遂行', '需要']) {
  assert.ok(eju.filter((item) => item.w === word).length >= 2, `EJU duplicate entry lost: ${word}`);
}

const n2 = readJson('n2_vocab.json');
assert.equal(n2.length, 3434);
assertContinuous(n2, 'N2');
assert.equal(Math.min(...n2.map((item) => item.page)), 10);
assert.equal(Math.max(...n2.map((item) => item.page)), 90);
const expectedPageCounts = [
  55, 42, 44, 44, 44, 44, 44, 44, 44, 44, 40, 44, 42, 44, 44, 40, 41, 40, 37, 55,
  48, 55, 42, 44, 44, 44, 44, 44, 44, 44, 44, 44, 44, 44, 44, 44, 44, 44, 44, 44,
  44, 39, 44, 44, 44, 44, 44, 32, 42, 44, 44, 44, 44, 39, 44, 43, 40, 40, 44, 44,
  40, 44, 39, 53, 66, 65, 33, 37, 35, 32, 38, 33, 36, 38, 31, 36, 34, 32, 42, 34,
  20
];
expectedPageCounts.forEach((expected, index) => {
  const page = index + 10;
  assert.equal(n2.filter((item) => item.page === page).length, expected, `N2 page ${page}`);
});

const forbiddenFields = ['pdfpage', 'cnSource', 'enSource', 'ex', 'exCn', 'audio'];
for (const [label, items] of [['EJU', eju], ['N2', n2]]) {
  for (const item of items) {
    assert.ok(item.w && item.r && item.cn && item.en, `${label} No.${item.n} has a blank core field`);
    for (const field of forbiddenFields) {
      assert.equal(Object.hasOwn(item, field), false, `${label} No.${item.n} exposes ${field}`);
    }
  }
}

assert.deepEqual(loadDataScript('vocab.js', 'EJU_VOCAB'), eju);
assert.deepEqual(loadDataScript('n2_vocab.js', 'N2_VOCAB'), n2);

const browser = { EJU_VOCAB: eju, N2_VOCAB: n2 };
const appContext = vm.createContext({ window: browser, console, setTimeout, clearTimeout });
vm.runInContext(fs.readFileSync(path.join(root, 'app.js'), 'utf8'), appContext);
const core = browser.EjuCore;
core.setBook('n2');
assert.equal(core.inRange(10, 10, 'page').length, 55);
assert.equal(core.inRange(10, 19, 'page').length, 449);
assert.equal(core.inRange(90, 90, 'page').length, 20);
assert.equal(core.inRange(1, 55, 'number').length, 55);

let exported = null;
browser.EjuXlsx = {
  build(sheets) { return sheets; },
  download(workbook, filename) { exported = { workbook, filename }; }
};
core.exportList(core.inRange(10, 10, 'page'), { mode: 'page', start: 10, end: 10 });
assert.equal(exported.filename, 'N2_单词表_p10-10.xlsx');
assert.match(exported.workbook[0].rows[0].cells[0].v, /书上第10—10页/);

console.log('Vocabulary checks passed: EJU 3200, N2 3434, book pages 10-90.');
