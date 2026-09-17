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

const forbiddenFields = ['page', 'pdfpage', 'cnSource', 'enSource', 'ex', 'exCn', 'audio'];
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
const appContext = vm.createContext({ window: browser, console, setTimeout, clearTimeout, Blob, TextEncoder, Uint8Array, Uint32Array });
vm.runInContext(fs.readFileSync(path.join(root, 'app.js'), 'utf8'), appContext);
const core = browser.EjuCore;
core.setBook('n2');
assert.equal(core.inRange(1, 55).length, 55);
assert.equal(core.inRange(3400, 3434).length, 35);
for (const type of ['k2r_sel', 'r2k_sel', 'k2c', 'c2k_sel']) {
  const questions = core.makePaper(core.inRange(1, 200), [type], 20);
  assert.equal(questions.length, 20, `${type} should create 20 questions`);
  assert.ok(questions.every((question) => question.mode === 'choice' && question.options.length === 4));
}

vm.runInContext(fs.readFileSync(path.join(root, 'xlsx.js'), 'utf8'), appContext);
const workbookBlob = browser.EjuXlsx.build([{
  name: '试题', cols: [{ min: 1, max: 1, width: 20 }], merges: [], freeze: 'A7', landscape: true,
  rows: [{ r: 1, h: 30, cells: [{ c: 1, s: 1, v: '测试' }] }]
}]);
const workbookBytes = new Uint8Array(await workbookBlob.arrayBuffer());
const workbookText = new TextDecoder().decode(workbookBytes);
assert.match(workbookText, /state="frozen"/);
assert.match(workbookText, /orientation="landscape"/);
assert.match(workbookText, /fitToWidth="1"/);

let exported = null;
browser.EjuXlsx.download = (workbook, filename) => { exported = { workbook, filename }; };
core.exportList(core.inRange(1, 55));
assert.equal(exported.filename, 'N2_单词表_1-55.xlsx');
assert.ok(exported.workbook instanceof Blob);

console.log('Vocabulary checks passed: EJU 3200, N2 3434, no source-page metadata.');
