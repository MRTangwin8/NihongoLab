import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const GRAMMAR_JSON = path.join(ROOT, 'data', 'grammar.json');
const GRAMMAR_JS = path.join(ROOT, 'data', 'grammar.js');
const PROGRESS_JSON = path.join(HERE, 'grammar_examples_progress.json');
const API_URL = 'https://text.pollinations.ai/openai';
const TARGET_EXAMPLES = 3;
const BATCH_SIZE = 10;
const CONCURRENCY = 1;
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const oneBatch = args.has('--one-batch');
const reviewGenerated = args.has('--review');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function currentExamples(item) {
  const list = Array.isArray(item.examples) ? item.examples : [];
  const normalized = list
    .map(entry => ({ ja: String(entry.ja || '').trim(), zh: String(entry.zh || '').trim() }))
    .filter(entry => entry.ja && entry.zh);
  if (!normalized.length && item.example && item.translation) {
    normalized.push({ ja: String(item.example).trim(), zh: String(item.translation).trim() });
  }
  return normalized;
}

function uniqueExamples(examples) {
  const seen = new Set();
  return examples.filter(example => {
    const key = example.ja.normalize('NFKC').replace(/\s/g, '');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseJsonText(text) {
  const clean = String(text || '').trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  try {
    return JSON.parse(clean);
  } catch (_) {
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(clean.slice(start, end + 1));
    throw new Error('response did not contain a JSON object');
  }
}

function validateGenerated(batch, payload) {
  const items = Array.isArray(payload.items) ? payload.items : [];
  const returned = new Map(items.map(item => [item.id, item]));
  const output = new Map();
  for (const request of batch) {
    const result = returned.get(request.id);
    if (!result || !Array.isArray(result.examples)) {
      throw new Error('missing examples for ' + request.id);
    }
    const examples = result.examples.map(entry => ({
      ja: String(entry.ja || '').trim(),
      zh: String(entry.zh || '').trim()
    }));
    if (examples.length !== request.needed) {
      throw new Error(request.id + ' returned ' + examples.length + ' examples; expected ' + request.needed);
    }
    if (examples.some(entry => !/[ぁ-んァ-ヶ一-龯々]/.test(entry.ja) || !/[\u3400-\u9fff]/.test(entry.zh))) {
      throw new Error(request.id + ' contains an empty or wrong-language example');
    }
    const all = uniqueExamples(request.fixed.concat(examples));
    if (all.length !== request.fixed.length + request.needed) {
      throw new Error(request.id + ' contains duplicate examples');
    }
    output.set(request.id, examples);
  }
  return output;
}

function buildPrompt(batch) {
  const input = batch.map(item => ({
    id: item.id,
    level: item.level,
    title: item.title,
    meaning: item.meaning,
    pattern: item.pattern,
    newExampleCount: item.needed,
    existingExamplesToAvoid: item.fixed.map(example => example.ja)
  }));
  return [
    '你是经验丰富的日语教师和日中译者。请为下面每个语法点编写指定数量的全新例句，并给出准确、自然的简体中文翻译。',
    '要求：',
    '1. 日语句子必须实际使用该文型的一种形式，符合所给接续和含义；不能只是提到或引用文型。',
    '2. 例句应自然、完整、简洁，尽量覆盖不同语境；不要重复 existingExamplesToAvoid。',
    '3. 所有句子必须原创，不得照搬教材、词典或公开语法网站的例句。',
    '4. 翻译须忠实对应日语句子，不添加解释。',
    '5. 只输出严格 JSON，不要 Markdown，不要说明。格式：{"items":[{"id":"原ID","examples":[{"ja":"日语","zh":"中文"}]}]}。',
    '6. 每个 id 必须原样返回一次，examples 数量必须等于 newExampleCount。',
    '7. 提交前逐句检查：搭配自然、场景合理、没有误用同形但不同功能的文型；自然现象不能写成请求许可等不合语境的表达。',
    '',
    JSON.stringify(input)
  ].join('\n');
}

async function requestBatch(batch, batchIndex) {
  const prompt = buildPrompt(batch);
  let lastError;
  for (let attempt = 1; attempt <= 8; attempt++) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: 'openai-fast',
          messages: [
            { role: 'system', content: 'Follow the requested JSON schema exactly. Check Japanese grammar and Chinese translation before answering.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
          reasoning_effort: 'low',
          temperature: 0.55,
          seed: 17000 + batchIndex + attempt * 1000,
          max_tokens: 16000
        })
      });
      const body = await response.text();
      if (!response.ok) throw new Error('HTTP ' + response.status + ': ' + body.slice(0, 300));
      const envelope = JSON.parse(body);
      const content = envelope?.choices?.[0]?.message?.content;
      const generated = validateGenerated(batch, parseJsonText(content));
      return reviewGenerated ? await reviewBatch(batch, generated, batchIndex) : generated;
    } catch (error) {
      lastError = error;
      if (attempt < 8) await new Promise(resolve => setTimeout(resolve, attempt * 3000));
    }
  }
  throw new Error('batch ' + (batchIndex + 1) + ' failed: ' + lastError.message);
}

async function reviewBatch(batch, generated, batchIndex) {
  const input = batch.map(item => ({
    id: item.id,
    level: item.level,
    title: item.title,
    meaning: item.meaning,
    pattern: item.pattern,
    existingExamplesToAvoid: item.fixed.map(example => example.ja),
    candidates: generated.get(item.id)
  }));
  const prompt = [
    '你是日语教材审校员。请逐句复核候选例句，必要时直接重写。',
    '必须检查：文型确实按给定接续和含义使用；没有混入同形的其他语法；日语搭配和场景自然；中文逐句准确；句子之间不重复。',
    '不得照搬教材、词典或公开网站例句。只返回修订后的候选例句，不要返回 existingExamplesToAvoid。',
    '只输出严格 JSON：{"items":[{"id":"原ID","examples":[{"ja":"日语","zh":"中文"}]}]}。每个 id 和候选数量必须保持不变。',
    JSON.stringify(input)
  ].join('\n');
  let lastError;
  for (let attempt = 1; attempt <= 8; attempt++) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          model: 'openai-fast',
          messages: [
            { role: 'system', content: 'Act as a strict Japanese grammar editor. Return only the required JSON.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
          reasoning_effort: 'low',
          temperature: 0.2,
          seed: 27000 + batchIndex + attempt * 1000,
          max_tokens: 16000
        })
      });
      const body = await response.text();
      if (!response.ok) throw new Error('HTTP ' + response.status + ': ' + body.slice(0, 300));
      const envelope = JSON.parse(body);
      const content = envelope?.choices?.[0]?.message?.content;
      return validateGenerated(batch, parseJsonText(content));
    } catch (error) {
      lastError = error;
      if (attempt < 8) await new Promise(resolve => setTimeout(resolve, attempt * 3000));
    }
  }
  throw new Error('review for batch ' + (batchIndex + 1) + ' failed: ' + lastError.message);
}

function writeProgress(progress) {
  const temp = PROGRESS_JSON + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(progress, null, 2) + '\n', 'utf8');
  fs.renameSync(temp, PROGRESS_JSON);
}

function chunks(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

const grammar = readJson(GRAMMAR_JSON);
const progress = fs.existsSync(PROGRESS_JSON) ? readJson(PROGRESS_JSON) : {};
for (const item of grammar) {
  const existing = uniqueExamples(currentExamples(item));
  const saved = Array.isArray(progress[item.id]) ? uniqueExamples(progress[item.id]) : [];
  progress[item.id] = saved.length >= existing.length ? saved : existing;
}

const pending = grammar.map(item => {
  const fixed = progress[item.id].slice(0, TARGET_EXAMPLES);
  return { ...item, fixed, needed: TARGET_EXAMPLES - fixed.length };
}).filter(item => item.needed > 0);

let batches = chunks(pending, BATCH_SIZE);
if (oneBatch) batches = batches.slice(0, 1);
console.log('grammar=' + grammar.length + ' pending=' + pending.length + ' batches=' + batches.length);

if (!dryRun) {
  let cursor = 0;
  let completed = 0;
  async function worker() {
    while (cursor < batches.length) {
      const batchIndex = cursor++;
      const batch = batches[batchIndex];
      const generated = await requestBatch(batch, batchIndex);
      for (const request of batch) {
        progress[request.id] = uniqueExamples(request.fixed.concat(generated.get(request.id))).slice(0, TARGET_EXAMPLES);
      }
      writeProgress(progress);
      completed++;
      console.log('completed ' + completed + '/' + batches.length + ' (' + batch.map(item => item.id).join(', ') + ')');
      await new Promise(resolve => setTimeout(resolve, 1200));
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, batches.length) }, () => worker()));
}

if (!oneBatch && !dryRun) {
  const missing = grammar.filter(item => !Array.isArray(progress[item.id]) || progress[item.id].length < TARGET_EXAMPLES);
  if (missing.length) throw new Error('generation incomplete: ' + missing.map(item => item.id).join(', '));
  const updated = grammar.map(item => {
    const examples = progress[item.id].slice(0, TARGET_EXAMPLES);
    return { ...item, example: examples[0].ja, translation: examples[0].zh, examples };
  });
  const json = JSON.stringify(updated, null, 2) + '\n';
  fs.writeFileSync(GRAMMAR_JSON, json, 'utf8');
  fs.writeFileSync(GRAMMAR_JS, 'window.JA_GRAMMAR = ' + json.trimEnd() + ';\n', 'utf8');
  console.log('written ' + updated.length + ' grammar entries with ' + TARGET_EXAMPLES + ' examples each');
}
