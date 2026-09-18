import fs from 'node:fs';
import vm from 'node:vm';

const grammarPath = new URL('../data/grammar.js', import.meta.url);
const outputPath = new URL('../data/grammar_quiz_extra.js', import.meta.url);
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(grammarPath, 'utf8'), context);
const grammar = context.window.JA_GRAMMAR || [];

function unique(values) { return values.filter((value, index, all) => value && all.indexOf(value) === index); }
function distract(item, key, correct) {
  const sameLevel = grammar.filter(x => x.id !== item.id && x.level === item.level);
  const values = unique(sameLevel.map(x => x[key]).filter(x => x !== correct));
  const offset = Math.abs(String(item.id).split('').reduce((n, c) => n + c.charCodeAt(0), 0)) % Math.max(1, values.length);
  return values.slice(offset).concat(values.slice(0, offset)).slice(0, 3);
}
function examples(item) { return (item.examples || []).filter(x => x && x.ja); }
function exampleDistractors(item, index) {
  const values = unique(grammar.filter(x => x.id !== item.id && x.level === item.level).flatMap(examples).map(x => x.ja));
  const offset = (index * 17 + String(item.id).length * 11) % Math.max(1, values.length);
  return values.slice(offset).concat(values.slice(0, offset)).slice(0, 3);
}
function question(id, item, type, stem, correct, wrong, explanation) {
  const options = [correct].concat(wrong.slice(0, 3));
  if (!correct || options.length !== 4) return null;
  return { id: `point-${item.id}-${id}`, grammarId: item.id, level: item.level, type, stem, options, answer: 0, explanation };
}

const output = [];
for (const item of grammar) {
  const ex = examples(item)[0];
  output.push(question('meaning', item, '意思判断', `${ex ? `例句：${ex.ja}\n` : ''}「${item.title}」表达的意思最接近哪一项？`, item.meaning, distract(item, 'meaning', item.meaning), `${item.title}：${item.meaning}。${ex?.zh ? `例句译文：${ex.zh}` : ''}`));
  examples(item).slice(0, 3).forEach((example, index) => {
    output.push(question(`example-${index + 1}`, item, '例句判断', `哪一个句子正确使用了「${item.title}」？`, example.ja, exampleDistractors(item, index), `${example.ja}${example.zh ? `\n${example.zh}` : ''}`));
  });
}
const clean = output.filter(Boolean);
fs.writeFileSync(outputPath, `window.JA_GRAMMAR_QUIZ_EXTRA = ${JSON.stringify(clean, null, 2)};\n`);
console.log(`Generated ${clean.length} questions for ${grammar.length} grammar points.`);
