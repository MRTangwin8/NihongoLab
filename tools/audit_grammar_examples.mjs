import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const WORKSPACE = path.resolve(ROOT, '..', '..');
const grammar = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'grammar.json'), 'utf8'));
const progress = JSON.parse(fs.readFileSync(path.join(HERE, 'grammar_examples_progress.json'), 'utf8'));
const fixes = JSON.parse(fs.readFileSync(path.join(HERE, 'grammar_example_fixes.json'), 'utf8'));
const pagesDir = path.join(WORKSPACE, 'EJU单词工具', 'tmp', 'grammar-pages');

function normalize(value) {
  return String(value || '').normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');
}

function decodeEntities(value) {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return String(value || '')
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&([a-z]+);/gi, (entity, name) => Object.hasOwn(named, name) ? named[name] : entity);
}

function sourceExamples(slug) {
  const file = path.join(pagesDir, slug + '.html');
  if (!fs.existsSync(file)) return [];
  const html = fs.readFileSync(file, 'utf8');
  const section = html.match(/<h3[^>]*>\s*例文\s*<\/h3>([\s\S]*?)(?=<h[2-4][^>]*>|<div\s+class="(?:wp-block|post_foot|p-adBox))/i)?.[1] || '';
  return decodeEntities(section
    .replace(/<a\b[^>]*class="sounds"[^>]*>[\s\S]*?<\/a>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ''))
    .split(/\n|(?=（\d+）)/)
    .map(line => line.replace(/^\s*（\d+）\s*/, '').trim())
    .filter(Boolean);
}

function similarity(left, right) {
  const a = normalize(left);
  const b = normalize(right);
  if (!a || !b) return 0;
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = previous[j];
      previous[j] = Math.min(previous[j] + 1, previous[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return 1 - previous[b.length] / Math.max(a.length, b.length);
}

const errors = [];
const warnings = [];
const allJapanese = new Map();
let verifiedFixes = 0;

for (const item of grammar) {
  if (!Array.isArray(item.examples) || item.examples.length !== 3) {
    errors.push(item.id + ': expected exactly 3 examples');
    continue;
  }
  const local = new Set();
  item.examples.forEach((example, index) => {
    const label = item.id + '#' + (index + 1);
    if (!example.ja || !/[ぁ-んァ-ヶ一-龯々]/.test(example.ja)) errors.push(label + ': Japanese text missing');
    if (!example.zh || !/[\u3400-\u9fff]/.test(example.zh)) errors.push(label + ': Chinese text missing');
    if (/[ぁ-んァ-ヶ]/.test(example.zh)) warnings.push(label + ': Chinese translation contains kana: ' + example.zh);
    const key = normalize(example.ja);
    if (local.has(key)) errors.push(label + ': duplicate within grammar entry');
    local.add(key);
    const previous = allJapanese.get(key);
    if (previous) warnings.push(label + ': exact duplicate of ' + previous + ': ' + example.ja);
    else allJapanese.set(key, label);
  });
  if (item.example !== item.examples[0].ja || item.translation !== item.examples[0].zh) {
    errors.push(item.id + ': primary example fields do not match examples[0]');
  }
  if (JSON.stringify(progress[item.id]) !== JSON.stringify(item.examples)) {
    errors.push(item.id + ': generator progress is out of sync');
  }
  for (const [number, replacement] of Object.entries(fixes[item.id] || {})) {
    const current = item.examples[Number(number) - 1];
    if (!current || current.ja !== replacement.ja || current.zh !== replacement.zh) {
      errors.push(item.id + '#' + number + ': reviewed replacement is missing');
    } else {
      verifiedFixes++;
    }
  }
  const slug = String(item.sourceUrl || '').match(/\/grammar\/([^/]+)\/?$/)?.[1];
  if (slug) {
    const references = sourceExamples(slug);
    item.examples.forEach((example, index) => {
      for (const reference of references) {
        const score = similarity(example.ja, reference);
        if (score >= 0.82 && normalize(example.ja).length >= 12) {
          warnings.push(item.id + '#' + (index + 1) + ': source similarity ' + score.toFixed(2) + '\n  generated: ' + example.ja + '\n  reference: ' + reference);
          break;
        }
      }
    });
  }
}

const byLevel = Object.fromEntries(['N5', 'N4', 'N3', 'N2', 'N1', 'EJU'].map(level => [level, grammar.filter(item => item.level === level).length]));
console.log(JSON.stringify({
  entries: grammar.length,
  examples: grammar.reduce((sum, item) => sum + (item.examples?.length || 0), 0),
  byLevel,
  verifiedReviewedReplacements: verifiedFixes,
  errors: errors.length,
  warnings: warnings.length
}, null, 2));
if (errors.length) console.log('\nERRORS\n' + errors.join('\n'));
if (warnings.length) console.log('\nWARNINGS\n' + warnings.join('\n'));
if (errors.length) process.exitCode = 1;
