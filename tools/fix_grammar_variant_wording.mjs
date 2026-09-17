import fs from 'node:fs';
import vm from 'node:vm';

const path = new URL('../data/grammar_quiz.js', import.meta.url);
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path, 'utf8'), context);

const fixes = [
  ['相談が日本語', '質問が日本語'],
  ['相談が外国語', '質問が外国語'],
  ['相談が英語', '質問が英語'],
  ['大社員', '大学生'],
  ['留社員', '留学生'],
  ['専門会社', '専門学校'],
  ['観光利用者', '観光客'],
  ['空港員', '駅員'],
  ['食事を食べ', '食事をし'],
  ['相談結果', '相談内容'],
  ['確認する本', '読む本'],
  ['紙のデータ', '紙の資料'],
  ['紙の情報', '紙の資料'],
  ['連絡を見', 'スマートフォンを見'],
  ['食事をし（　）、学校へ', '朝ご飯を食べ（　）、学校へ'],
  ['食事をし（　）、会社へ', '朝ご飯を食べ（　）、会社へ'],
  ['外国語が上達する（　）、読む本も', '日本語が上達する（　）、読む本も'],
  ['英語が上達する（　）、読む本も', '日本語が上達する（　）、読む本も'],
];

function fixText(value) {
  let text = String(value ?? '');
  for (const [before, after] of fixes) text = text.split(before).join(after);
  return text;
}

for (const question of context.window.JA_GRAMMAR_QUIZ) {
  question.stem = fixText(question.stem);
  question.explanation = fixText(question.explanation);
  question.options = question.options.map(fixText);
  if (Array.isArray(question.order)) question.order = question.order.map(fixText);
}

fs.writeFileSync(
  path,
  `window.JA_GRAMMAR_QUIZ = ${JSON.stringify(context.window.JA_GRAMMAR_QUIZ, null, 2)};\n`,
);

console.log(`Reviewed ${context.window.JA_GRAMMAR_QUIZ.length} grammar questions.`);
