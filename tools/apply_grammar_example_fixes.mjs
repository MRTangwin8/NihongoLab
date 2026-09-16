import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const workspace = path.resolve(root, '..', '..');
const oldRoot = path.join(workspace, 'EJU单词工具');
const grammarPath = path.join(root, 'data', 'grammar.json');
const progressPath = path.join(here, 'grammar_examples_progress.json');
const fixesPath = path.join(here, 'grammar_example_fixes.json');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function writeGrammar(targetRoot, grammar) {
  const json = JSON.stringify(grammar, null, 2);
  fs.writeFileSync(path.join(targetRoot, 'data', 'grammar.json'), json + '\n', 'utf8');
  fs.writeFileSync(path.join(targetRoot, 'data', 'grammar.js'), 'window.JA_GRAMMAR = ' + json + ';\n', 'utf8');
}

const grammar = readJson(grammarPath);
const fixes = readJson(fixesPath);
const progress = readJson(progressPath);
const byId = new Map(grammar.map(item => [item.id, item]));
let replaced = 0;

for (const [id, replacements] of Object.entries(fixes)) {
  const item = byId.get(id);
  if (!item) throw new Error('Unknown grammar id in fixes: ' + id);
  if (!Array.isArray(item.examples) || item.examples.length !== 3) {
    throw new Error(id + ' does not have exactly three examples');
  }
  for (const [number, replacement] of Object.entries(replacements)) {
    const index = Number(number) - 1;
    if (index < 0 || index >= item.examples.length || !replacement.ja || !replacement.zh) {
      throw new Error('Invalid replacement at ' + id + '#' + number);
    }
    item.examples[index] = {
      ja: String(replacement.ja).trim(),
      zh: String(replacement.zh).trim()
    };
    replaced++;
  }
  item.example = item.examples[0].ja;
  item.translation = item.examples[0].zh;
  progress[id] = item.examples.map(example => ({ ...example }));
}

for (const item of grammar) {
  if (!Array.isArray(item.examples) || item.examples.length !== 3) {
    throw new Error(item.id + ' does not have exactly three examples after merge');
  }
  item.example = item.examples[0].ja;
  item.translation = item.examples[0].zh;
  progress[item.id] = item.examples.map(example => ({ ...example }));
}

writeGrammar(root, grammar);
writeJson(progressPath, progress);
if (fs.existsSync(path.join(oldRoot, 'data'))) writeGrammar(oldRoot, grammar);

console.log('Applied ' + replaced + ' reviewed replacements across ' + Object.keys(fixes).length + ' grammar entries.');
console.log('Wrote ' + grammar.length + ' entries and ' + (grammar.length * 3) + ' example pairs to both projects.');
