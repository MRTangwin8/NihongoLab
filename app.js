/* JLPT vocabulary practice and worksheet export. */
(function () {
  'use strict';

  var BOOKS = {
    eju: { id: 'eju', label: 'EJU 综合词汇', vocab: window.EJU_VOCAB || [] },
    n5: { id: 'n5', label: 'JLPT N5 基础词汇', vocab: (window.JLPT_VOCAB && window.JLPT_VOCAB.n5) || [] },
    n4: { id: 'n4', label: 'JLPT N4 基础词汇', vocab: (window.JLPT_VOCAB && window.JLPT_VOCAB.n4) || [] },
    n4_extra: { id: 'n4_extra', label: 'JLPT N4 扩展词汇', vocab: window.N4_EXTRA_VOCAB || [] },
    n3: { id: 'n3', label: 'JLPT N3 基础词汇', vocab: (window.JLPT_VOCAB && window.JLPT_VOCAB.n3) || [] },
    n2: { id: 'n2', label: 'JLPT N2 综合词汇', vocab: window.N2_VOCAB || [] },
    n1: { id: 'n1', label: 'JLPT N1 基础词汇', vocab: (window.JLPT_VOCAB && window.JLPT_VOCAB.n1) || [] }
  };
  var activeBook = BOOKS.n5;
  var VOCAB = [], byNum = {};

  function standardPos(value, suru, word, reading) {
    var GODAN_EXCEPTIONS = {
      '帰る': 1, '入る': 1, '走る': 1, '切る': 1, '知る': 1, '減る': 1, '要る': 1,
      '限る': 1, '混じる': 1, '参る': 1, '滑る': 1, '握る': 1, '練る': 1, '散る': 1,
      '照る': 1, '湿る': 1, '罵る': 1, '陥る': 1, '蘇る': 1, '茂る': 1, '遮る': 1,
      '交る': 1, '焦る': 1, '蹴る': 1, '喋る': 1, '弄る': 1, '噛る': 1, '捩る': 1,
      '錆びる': 1, '染みる': 1, '束ねる': 1, '更ける': 1, '漲る': 1, '褪せる': 1,
      '交じる': 1, 'かじる': 1, 'すべる': 1, 'いじる': 1, 'ねじる': 1, 'さびる': 1,
      'しみる': 1, 'あせる': 1, 'たばねる': 1, 'ふける': 1, 'みなぎる': 1
    };
    var ICHIDAN_EXTRA = {
      '見る': 1, '着る': 1, '似る': 1, '煮る': 1, '居る': 1, '射る': 1, '鋳る': 1,
      '感じる': 1, '信じる': 1, '命じる': 1, '通じる': 1, '生じる': 1, '用じる': 1,
      '案じる': 1, '禁じる': 1, '応じる': 1, '講じる': 1, '投じる': 1, '落ちる': 1,
      '満ちる': 1, '閉じる': 1, '詫びる': 1, '借りる': 1, '降りる': 1, '足りる': 1,
      '伸びる': 1, '浴びる': 1, '錆びる': 1, '浴びせる': 1
    };
    /* い行 / え行のかな。この行で終わる「〜る」だけが一段動詞になる。 */
    var ICHIDAN_ROW = 'いきしちにひみりぎじびぴえけせてねへめれげぜでべぺ';
    function toHira(text) {
      return String(text || '').replace(/[ァ-ヶ]/g, function (ch) { return String.fromCharCode(ch.charCodeAt(0) - 0x60); });
    }
    function verbClass(word, reading) {
      word = word || '';
      reading = toHira(reading || '');
      if (/来る$/.test(word)) return '動詞（カ変活用）';
      if (/する$/.test(word)) return '動詞（サ変活用）';
      if (ICHIDAN_EXTRA[word]) return '動詞（一段活用）';
      var tail = reading || word;
      if (GODAN_EXCEPTIONS[word]) return '動詞（五段活用）';
      if (/る$/.test(tail)) {
        var before = tail.length >= 2 ? tail.charAt(tail.length - 2) : '';
        if (ICHIDAN_ROW.indexOf(before) >= 0) return '動詞（一段活用）';
        return '動詞（五段活用）';
      }
      return '動詞（五段活用）';
    }
    var raw = String(value || '');
    /* Keep explicit noun labels instead of reclassifying them. */
    if (/^名詞（/.test(raw) || raw === '名詞') return raw;
    if (suru || value === '名動') return '動詞（サ変活用）';
    /* 数据里已经写好了活用类型就照用，不再用假名规则重新猜。 */
    if (/^動詞（(五段|一段|サ変|カ変)活用）$/.test(raw)) return raw;
    if (raw === '動' || raw === '自' || raw === '他' || raw === '自他' || raw.indexOf('動詞') === 0) {
      return verbClass(word, reading);
    }
    var map = {
      '名': '名詞', '動': '動詞（活用未分類）', '自': '動詞（自動詞）', '他': '動詞（他動詞）',
      '自他': '動詞（自動詞・他動詞）', '形': 'い形容詞（形容詞）', '形動': 'な形容詞（形容動詞）',
      '副': '副詞', '接続': '接続詞', '感': '感動詞', '助': '助詞', '数': '数詞', '代': '代名詞',
      '接頭': '接頭辞', '接尾': '接尾辞', '慣用': '慣用表現', '連体': '連体詞'
    };
    return map[value] || value || '未分類';
  }

  function setBook(id) {
    activeBook = BOOKS[id] || BOOKS.n5;
    VOCAB = activeBook.vocab.slice().sort(function (a, b) { return a.n - b.n; });
    byNum = {};
    VOCAB.forEach(function (v) {
      v.book = v.book || activeBook.id;
      v.category = v.category || '未分類';
      v.posStd = standardPos(v.pos, v.suru, v.w, v.r);
      byNum[v.n] = v;
    });
    if (window.EjuCore) window.EjuCore.vocab = VOCAB;
    return VOCAB;
  }
  setBook('n5');

  var KANJI = /[\u4E00-\u9FFF]/;
  var KANA = /[\u3040-\u309F\u30A0-\u30FF]/;

  function hasKanji(s) { return KANJI.test(s || ''); }

  /* ---------- normalisation for answer checking ---------- */
  function toHira(s) {
    return s.replace(/[\u30A1-\u30F6]/g, function (c) {
      return String.fromCharCode(c.charCodeAt(0) - 0x60);
    });
  }
  function norm(s) {
    if (!s) return '';
    var t = String(s);
    t = t.replace(/[\uFF01-\uFF5E]/g, function (c) {
      return String.fromCharCode(c.charCodeAt(0) - 0xFEE0);
    });
    t = t.replace(/\u3000/g, ' ');
    t = t.replace(/\s+/g, '');
    t = t.replace(/[。、，,.！!？?・．]/g, '');
    t = t.replace(/[（(]\s*す\s*る\s*[）)]/g, '(する)');
    t = t.replace(/[（(]する[）)]/g, '(する)');
    t = toHira(t);
    /* Allow common small-kana input variation. */
    if (!STRICT) {
      t = t.replace(/[ぁぃぅぇぉっゃゅょゎ]/g, function (c) {
        return String.fromCharCode(c.charCodeAt(0) + 1);
      });
    }
    return t.toLowerCase();
  }
  /* Collapse dakuten and handakuten for tolerant answer checking. */
  var DAK = { '\u3094': '\u3046' };
  [0x304C, 0x304E, 0x3050, 0x3052, 0x3054, 0x3056, 0x3058, 0x305A, 0x305C, 0x305E,
   0x3060, 0x3062, 0x3065, 0x3067, 0x3069, 0x3070, 0x3073, 0x3076, 0x3079, 0x307C]
    .forEach(function (c) { DAK[String.fromCharCode(c)] = String.fromCharCode(c - 1); });
  [0x3071, 0x3074, 0x3077, 0x307A, 0x307D]
    .forEach(function (c) { DAK[String.fromCharCode(c)] = String.fromCharCode(c - 2); });

  function normLoose(s) {
    return norm(s).replace(/[\u304C\u304E\u3050\u3052\u3054\u3056\u3058\u305A\u305C\u305E\u3060\u3062\u3065\u3067\u3069\u3070\u3073\u3076\u3079\u307C\u3071\u3074\u3077\u307A\u307D\u3094]/g,
      function (c) { return DAK[c] || c; });
  }

  var STRICT = true;
  function setStrict(v) { STRICT = !!v; }
  function sameAnswer(a, b) { return norm(a) !== '' && norm(a) === norm(b); }
  /* '' = wrong, 'near' = only equal once scan noise is folded away, 'exact' = equal */
  function checkAnswer(a, b) {
    if (sameAnswer(a, b)) return 'exact';
    if (STRICT) return '';
    var x = normLoose(a), y = normLoose(b);
    return (x !== '' && x === y) ? 'near' : '';
  }

  function withSuru(base, suru) { return suru ? base + '（する）' : base; }

  /* Browser-provided speech only; the project ships no audio assets. */
  function hasSpeechSynthesis() { return !!(window.speechSynthesis && window.SpeechSynthesisUtterance); }
  function speakWord(n) {
    var item = byNum[n];
    if (!item || !hasSpeechSynthesis()) return false;
    var utterance = new SpeechSynthesisUtterance(withSuru(item.w || item.r || '', item.suru));
    utterance.lang = 'ja-JP';
    utterance.rate = 0.88;
    var voices = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : [];
    for (var vi = 0; vi < voices.length; vi++) {
      if (/^ja(?:-|_)/i.test(voices[vi].lang || '')) { utterance.voice = voices[vi]; break; }
    }
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    return true;
  }
  function hasSpeech(n) { return hasSpeechSynthesis() && !!byNum[n]; }
  function stopSpeech() {
    if (hasSpeechSynthesis()) { try { window.speechSynthesis.cancel(); } catch (e) {} }
  }

  /* ---------- question building ---------- */
  function randInt(n) { return Math.floor(Math.random() * n); }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = randInt(i + 1); var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function cnOptions(item, pool) {
    var others = pool.filter(function (o) {
      return o.n !== item.n && o.cn && o.cn !== item.cn && o.cn.length <= 24;
    });
    if (others.length < 3) {
      others = pool.filter(function (o) { return o.n !== item.n && o.cn && o.cn !== item.cn; });
    }
    shuffle(others);
    var opts = [item.cn];
    for (var i = 0; i < others.length && opts.length < 4; i++) opts.push(others[i].cn);
    if (opts.length < 3) return null;
    shuffle(opts);
    return opts;
  }

  function meaningWordOptions(item, pool) {
    var answer = withSuru(item.w, item.suru);
    var candidates = pool.filter(function (other) {
      return other.n !== item.n && other.w && other.cn && other.cn !== item.cn;
    });
    var samePos = candidates.filter(function (other) { return other.posStd === item.posStd || other.pos === item.pos; });
    shuffle(samePos); shuffle(candidates);
    var options = [answer], seen = {};
    seen[norm(answer)] = true;
    samePos.concat(candidates).some(function (other) {
      var value = withSuru(other.w, other.suru), key = norm(value);
      if (!key || seen[key]) return false;
      seen[key] = true; options.push(value);
      return options.length >= 4;
    });
    return options.length === 4 ? shuffle(options) : null;
  }


  /* ---------- near-miss options for the 汉字 <-> 假名 choice questions ----------
     Distractors are generated, never taken from a word list: a mix of edits that
     copy the mistakes Japanese learners actually make (voiced/unvoiced kana,
     long vowel marks, small っ, vowel confusion) plus genuinely similar words
     from the selected range when there are any. */
  var VOICED = { '\u304b': '\u304c', '\u304d': '\u304e', '\u304f': '\u3050', '\u3051': '\u3052',
    '\u3053': '\u3054', '\u3055': '\u3056', '\u3057': '\u3058', '\u3059': '\u305a',
    '\u305b': '\u305c', '\u305d': '\u305e', '\u305f': '\u3060', '\u3061': '\u3062',
    '\u3064': '\u3065', '\u3066': '\u3067', '\u3068': '\u3069', '\u306f': '\u3070',
    '\u3072': '\u3073', '\u3075': '\u3076', '\u3078': '\u3079', '\u307b': '\u307c',
    '\u30ab': '\u30ac', '\u30ad': '\u30ae', '\u30af': '\u30b0',
    '\u30b1': '\u30b2', '\u30b3': '\u30b4', '\u30b5': '\u30b6', '\u30b7': '\u30b8',
    '\u30b9': '\u30ba', '\u30bb': '\u30bc', '\u30bd': '\u30be', '\u30bf': '\u30c0',
    '\u30c1': '\u30c2', '\u30c4': '\u30c5', '\u30c6': '\u30c7', '\u30c8': '\u30c9',
    '\u30cf': '\u30d0', '\u30d2': '\u30d3', '\u30d5': '\u30d6', '\u30d8': '\u30d9',
    '\u30db': '\u30dc' };
  var UNVOICED = (function () {
    var m = {};
    for (var k in VOICED) m[VOICED[k]] = k;
    ['\u3071', '\u3074', '\u3077', '\u307a', '\u307d'].forEach(function (c) {
      m[c] = String.fromCharCode(c.charCodeAt(0) - 2);
    });
    return m;
  })();
  var HALF = { '\u306f': '\u3071', '\u3072': '\u3074', '\u3075': '\u3077',
    '\u3078': '\u307a', '\u307b': '\u307d' };
  /* a small っ can only sit in front of a ka / sa / ta / pa row syllable */
  var GEMINATE = /[\u304b\u304d\u304f\u3051\u3053\u3055\u3057\u3059\u305b\u305d\u305f\u3061\u3064\u3066\u3068\u3071\u3074\u3077\u307a\u307d]/;
  var SMALL_KANA = /[ぁぃぅぇぉゃゅょっ]/;
  var VOWEL_SWAP = { '\u3042': '\u304a', '\u3044': '\u3048', '\u3046': '\u304a',
    '\u3048': '\u3044', '\u304a': '\u3046', '\u3093': '\u3080' };

  function isKanaStr(s) { return !!s && /^[\u3041-\u3096\u30a1-\u30f6\u30fc\u30fb]+$/.test(s); }

  function editDistance(a, b) {
    var prev = [], cur = [], i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      cur[0] = i;
      for (j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1));
      }
      prev = cur.slice();
    }
    return prev[b.length];
  }
  function similarity(a, b) {
    if (!a || !b) return 0;
    var m = Math.max(a.length, b.length);
    return m ? 1 - editDistance(a, b) / m : 0;
  }

  /* every one-kana edit of a reading that still looks like a plausible reading */
  function readingEdits(r) {
    var out = [], i, c, t;
    for (i = 0; i < r.length; i++) {
      c = r.charAt(i);
      t = VOICED[c] || UNVOICED[c] || HALF[c] || VOWEL_SWAP[c];
      if (t) out.push(r.slice(0, i) + t + r.slice(i + 1));
      if (c === '\u30fc') out.push(r.slice(0, i) + r.slice(i + 1));
      /* a long vowel written the other way: こう -> こー */
      if ((c === '\u3046' && i > 0 && /[\u304a\u3053\u305d\u3068\u306e\u307b\u3082\u3088\u308d\u3092\u304a]/.test(r.charAt(i - 1))) ||
          (c === '\u3044' && i > 0 && /[\u3044\u304d\u3057\u3061\u306b\u3072\u307f\u308a]/.test(r.charAt(i - 1)))) {
        out.push(r.slice(0, i) + '\u30fc' + r.slice(i + 1));
      }
      if (i > 0 && i + 1 < r.length && r.charAt(i + 1) !== '\u30fc' && GEMINATE.test(c) &&
          !SMALL_KANA.test(c) && r.charAt(i - 1) !== '\u3063') {
        out.push(r.slice(0, i) + '\u3063' + r.slice(i));            /* small っ */
      }
      if (i + 1 < r.length) {
        out.push(r.slice(0, i) + r.charAt(i + 1) + c + r.slice(i + 2));  /* swap two */
      }
      if (c === '\u3093') out.push(r.slice(0, i) + r.slice(i + 1));       /* drop ん */
    }
    return out;
  }

  function pickDistractors(answer, cands, n) {
    var seen = {}, out = [];
    seen[answer] = 1;
    seen[norm(answer)] = 1;
    cands.sort(function (a, b) { return b[1] - a[1]; });
    var top = cands.slice(0, Math.max(12, n * 4));
    shuffle(top);
    for (var i = 0; i < top.length && out.length < n; i++) {
      var v = top[i][0];
      if (!v || seen[v] || seen[norm(v)]) continue;
      seen[v] = 1;
      seen[norm(v)] = 1;
      out.push(v);
    }
    return out;
  }

  /* reading options for a 汉字 -> 假名 question */
  function readingOptions(item, pool) {
    var ans = item.r;
    if (!ans) return null;
    var cands = [], k;
    readingEdits(ans).forEach(function (v) { cands.push([v, 0.75 + 0.25 * similarity(v, ans)]); });
    pool.forEach(function (o) {
      if (o.n === item.n || !o.r) return;
      var s = similarity(o.r, ans);
      if (s >= 0.6) cands.push([o.r, s]);
    });
    var d = pickDistractors(ans, cands, 3);
    if (d.length < 3) return null;
    var opts = d.slice();
    opts.push(ans);
    return shuffle(opts.map(function (v) { return withSuru(v, item.suru); }));
  }

  /* kanji options for a 假名 -> 汉字 question */
  function wordOptions(item, pool) {
    var ans = item.w;
    if (!ans) return null;
    var cands = [];
    pool.forEach(function (o) {
      if (o.n === item.n || !o.w || !hasKanji(o.w)) return;
      var s = similarity(o.w, ans);
      if (o.r && item.r && norm(o.r) === norm(item.r)) s = Math.max(s, 0.9);  /* homophone */
      if (s >= 0.5) cands.push([o.w, s]);
    });
    /* one-character swaps built from the kanji the range actually uses */
    var related = '', all = '';
    pool.forEach(function (o) {
      if (o.n === item.n || !o.w) return;
      all += o.w;
      for (var k = 0; k < ans.length; k++) {
        if (o.w.indexOf(ans.charAt(k)) >= 0) { related += o.w; break; }
      }
    });
    var chars = (related + all).split('');
    for (var i = 0; i < ans.length; i++) {
      if (!KANJI.test(ans.charAt(i))) continue;
      for (var t = 0; t < 6 && chars.length; t++) {
        var c = chars[randInt(chars.length)];
        if (!KANJI.test(c) || c === ans.charAt(i)) continue;
        cands.push([ans.slice(0, i) + c + ans.slice(i + 1), 0.6 + 0.2 * similarity(c, ans.charAt(i))]);
      }
    }
    var d = pickDistractors(ans, cands, 3);
    if (d.length < 3) return null;
    var opts = d.slice();
    opts.push(ans);
    return shuffle(opts.map(function (v) { return withSuru(v, item.suru); }));
  }

  function buildQuestion(type, item, pool) {
    var w = withSuru(item.w, item.suru);
    var r = withSuru(item.r, item.suru);
    if (type === 'k2r') {
      if (!hasKanji(item.w)) return null;
      if (!item.r) return null;
      return { type: type, label: '写读音', prompt: w, answer: r, item: item, mode: 'input' };
    }
    if (type === 'r2k') {
      if (!hasKanji(item.w)) return null;
      if (!item.r) return null;
      return { type: type, label: '写汉字', prompt: r, answer: w, item: item, mode: 'input' };
    }
    if (type === 'k2r_sel' || type === 'r2k_sel') {
      if (!hasKanji(item.w)) return null;
      if (!item.r) return null;
      var popts = type === 'k2r_sel' ? readingOptions(item, pool) : wordOptions(item, pool);
      if (!popts) return null;
      return { type: type, label: type === 'k2r_sel' ? '选读音' : '选汉字',
        prompt: type === 'k2r_sel' ? w : r,
        answer: type === 'k2r_sel' ? r : w, options: popts, item: item, mode: 'choice' };
    }
    if (type === 'k2c' || type === 'l2c') {
      if (!item.cn) return null;
      if (type === 'l2c' && !hasSpeech(item.n)) return null;
      var opts = cnOptions(item, pool);
      if (!opts) return null;
      return { type: type, label: type === 'l2c' ? '听朗读选意思' : '选意思',
        prompt: type === 'l2c' ? '' : w, answer: item.cn, options: opts,
        item: item, mode: 'choice', listen: type === 'l2c' };
    }
    if (type === 'l2k') {
      if (!item.w) return null;
      if (!hasSpeech(item.n)) return null;
      return { type: type, label: '听朗读写单词', prompt: '', answer: w,
        item: item, mode: 'input', listen: true };
    }
    if (type === 'c2k') {
      if (!item.cn) return null;
      if (!item.w) return null;
      if (item.cn.length > 30) return null;
      if (norm(item.cn) === norm(w)) return null;   /* e.g. 慈善 -> 慈善: nothing to ask */
      return { type: type, label: '写单词', prompt: item.cn, answer: w, item: item, mode: 'input' };
    }
    if (type === 'c2k_sel') {
      if (!item.cn || !item.w || item.cn.length > 30 || norm(item.cn) === norm(w)) return null;
      var wopts = meaningWordOptions(item, pool);
      if (!wopts) return null;
      return { type: type, label: '选单词', prompt: item.cn, answer: w,
        options: wopts, item: item, mode: 'choice' };
    }
    if (type === 'fill') {
      var ex = item.ex || '';
      if (!ex || !item.w) return null;
      /* Examples may conjugate the headword, so fall back to the longest
         kanji-bearing prefix of the word that the sentence does contain. */
      var hit = ex.indexOf(item.w) >= 0 ? item.w : null;
      for (var k = item.w.length - 1; k >= 1 && !hit; k--) {
        var stem = item.w.slice(0, k);
        /* a one-character stem is only a conjugation ladder: \u96a0\u3059 -> \u96a0\u3057.
           Without an inflectable part of speech it would blank the wrong word
           (\u52b9\u679c in a sentence that only has \u52b9\u7387\u7684). */
        if (k === 1 && !/\u52d5|\u5f62/.test(item.pos || '')) continue;
        if (hasKanji(stem) && ex.indexOf(stem) >= 0) hit = stem;
      }
      if (!hit) return null;
      var blank = ex.replace(hit, '（　　）');
      return { type: type, label: '例句填空', prompt: blank, answer: w, item: item, mode: 'input', hint: ex };
    }
    return null;
  }

  function makePaper(list, types, count) {
    var target = Math.min(count || list.length, list.length);
    var queue = shuffle(list.slice());
    var picked = [];
    for (var i = 0; i < queue.length && picked.length < target; i++) {
      var item = queue[i];
      var ok = shuffle(types.slice());
      var q = null;
      for (var k = 0; k < ok.length && !q; k++) q = buildQuestion(ok[k], item, list);
      if (q) picked.push(q);
    }
    return picked;
  }

  /* ---------- Excel export ---------- */
  /* the sample workbook shades the 题型 column per question type */
  function typeStyle(label, small) {
    return (window.EjuXlsx && window.EjuXlsx.typeStyle) ? window.EjuXlsx.typeStyle(label, small) : 5;
  }
  function bodyStyle(small) {
    return (window.EjuXlsx && window.EjuXlsx.bodyStyle) ? window.EjuXlsx.bodyStyle(small) : 5;
  }

  function buildSheet(title, subtitle, infoCells, rows, half, headers, small) {
    var sheet = { name: '', cols: [
      { min: 1, max: 1, width: 6 }, { min: 2, max: 2, width: 10 }, { min: 3, max: 3, width: 21 },
      { min: 4, max: 4, width: 24 }, { min: 5, max: 5, width: 3 }, { min: 6, max: 6, width: 6 },
      { min: 7, max: 7, width: 10 }, { min: 8, max: 8, width: 21 }, { min: 9, max: 9, width: 24 }
    ], merges: ['A1:I1', 'A2:I2', 'A4:B4', 'C4:D4', 'F4:G4', 'H4:I4'], rows: [],
      freeze: 'A7', landscape: true, fitToWidth: 1 };

    sheet.rows.push({ r: 1, h: 34, cells: [{ c: 1, v: title, s: 1 }] });
    sheet.rows.push({ r: 2, h: 22, cells: [{ c: 1, v: subtitle, s: 2 }] });
    sheet.rows.push({ r: 3, cells: [{ c: 1, v: null, s: 0 }] });
    sheet.rows.push({ r: 4, h: 25, cells: [
      { c: 1, v: infoCells[0], s: 3 }, { c: 3, v: infoCells[1], s: 3 },
      { c: 6, v: infoCells[2], s: 3 }, { c: 8, v: infoCells[3], s: 3 }
    ] });
    sheet.rows.push({ r: 5, cells: [{ c: 1, v: null, s: 0 }] });
    sheet.rows.push({ r: 6, h: 25, cells: [
      { c: 1, v: 'No.', s: 4 }, { c: 2, v: '题型', s: 4 }, { c: 3, v: '题目', s: 4 }, { c: 4, v: headers, s: 4 },
      { c: 6, v: 'No.', s: 4 }, { c: 7, v: '题型', s: 4 }, { c: 8, v: '题目', s: 4 }, { c: 9, v: headers, s: 4 }
    ] });

    for (var i = 0; i < half; i++) {
      var li = rows[i];
      var ri = rows[i + half];
      var cells = [];
      var bS = bodyStyle(small);
      var aS = small ? ((window.EjuXlsx && window.EjuXlsx.answerStyle) || bS) : bS;
      cells.push({ c: 1, v: i + 1, s: bS }, { c: 2, v: li.label, s: typeStyle(li.label, small) },
        { c: 3, v: li.prompt, s: bS }, { c: 4, v: li.answer, s: aS });
      if (ri) {
        cells.push({ c: 6, v: i + half + 1, s: bS }, { c: 7, v: ri.label, s: typeStyle(ri.label, small) },
          { c: 8, v: ri.prompt, s: bS }, { c: 9, v: ri.answer, s: aS });
      } else {
        cells.push({ c: 6, v: null, s: 5 }, { c: 7, v: null, s: 5 }, { c: 8, v: null, s: 5 }, { c: 9, v: null, s: 5 });
      }
      sheet.rows.push({ r: 7 + i, h: 30, cells: cells });
    }
    var footRow = 7 + half + 1;
    sheet.merges.push('A' + footRow + ':I' + footRow);
    sheet.rows.push({ r: footRow, h: 22, cells: [{ c: 1, v: '', s: 6 }] });
    return { sheet: sheet, footRow: footRow };
  }

  function exportPaper(list, types, count) {
    var qs = makePaper(list, types, count);
    if (!qs.length) { alert('当前范围与题型下没有可用题目。'); return; }
    var n = qs.length;
    var half = Math.ceil(n / 2);
    var range = rangeInfo(list);

    var AB = 'ABCD';
    var qRows = qs.map(function (q) {
      var p = q.prompt;
      if (q.options) {
        p = p + '\n' + q.options.map(function (o, i) { return AB.charAt(i) + '. ' + o; }).join('\u3000');
      }
      return { label: q.label, prompt: p, answer: '' };
    });
    var aRows = qs.map(function (q) {
      var ans = q.answer;
      if (q.options) {
        var base = function (s) { return norm(String(s).replace(/[（(]する[）)]/g, '')); };
        for (var oi = 0; oi < q.options.length; oi++) {
          if (base(q.options[oi]) === base(ans)) { ans = AB.charAt(oi) + '. ' + ans; break; }
        }
      }
      return { label: q.label, prompt: q.prompt, answer: ans };
    });

    var bookLabel = activeBook && activeBook.label ? activeBook.label : '日语词汇';
    var sourceLabel = bookLabel;
    var q = buildSheet(bookLabel + '｜随机测试｜' + n + '题（' + range.shortLabel + '）',
      '请根据题型填写读音、汉字或单词｜每题1分，共' + n + '分',
      ['姓名：', '日期：', '得分：', '／' + n], qRows, half, '作答');
    var a = buildSheet(bookLabel + '｜随机测试｜参考答案（' + range.shortLabel + '）',
      '请根据题型填写读音、汉字或单词｜每题1分，共' + n + '分',
      ['范围：' + range.label, '来源：' + sourceLabel, '题数：' + n + '题',
        '配比：' + half + '＋' + (n - half)],
      aRows, half, '答案', true);

    var note = '抽题范围：《' + bookLabel + '》' + range.label +
      '，共' + list.length + '词；纯片假名词不纳入汉字↔读音题型。';
    q.sheet.rows[q.sheet.rows.length - 1].cells[0].v = note;
    a.sheet.rows[a.sheet.rows.length - 1].cells[0].v = note;

    q.sheet.name = '试题';
    a.sheet.name = '答案';

    var blob = window.EjuXlsx.build([q.sheet, a.sheet]);
    var fname = (activeBook ? activeBook.id.toUpperCase() : 'JLPT') + '_单词随机测试' + n + '题_' + range.fileToken + '.xlsx';
    window.EjuXlsx.download(blob, fname);
  }

  /* ---------- word list export (the extracted book data as a sheet) ---------- */
  var LIST_HEAD = ['No.', '\u5355\u8bcd', '\u8bfb\u97f3', '\u8bcd\u6027', '\u4e2d\u6587',
                   '\u82f1\u6587', '\u4f8b\u53e5', '\u4f8b\u53e5\u8bd1\u6587'];

  function exportList(list) {
    if (!list.length) { alert('\u8be5\u8303\u56f4\u5185\u6ca1\u6709\u5355\u8bcd\u3002'); return; }
    var X = window.EjuXlsx;
    if (!X || !X.build) { alert('\u5bfc\u51fa\u6a21\u5757\u672a\u52a0\u8f7d\u3002'); return; }
    var range = rangeInfo(list);
    var sheet = {
      name: '\u5355\u8bcd\u8868',
      cols: [{ min: 1, max: 1, width: 6 }, { min: 2, max: 2, width: 16 },
        { min: 3, max: 3, width: 16 }, { min: 4, max: 4, width: 8 },
        { min: 5, max: 5, width: 26 }, { min: 6, max: 6, width: 26 },
        { min: 7, max: 7, width: 52 }, { min: 8, max: 8, width: 34 }],
      merges: ['A1:H1', 'A2:H2'],
      rows: []
    };
    var listLabel = activeBook && activeBook.label ? activeBook.label : '\u65e5\u8bed\u8bcd\u6c47';
    sheet.rows.push({ r: 1, h: 30, cells: [{ c: 1, s: 1, v: listLabel + ' \u00b7 \u5355\u8bcd\u8868\uff08' + range.label + '\uff09' }] });
    sheet.rows.push({ r: 2, h: 20, cells: [{ c: 1, s: 2, v: '\u5171 ' + list.length + ' \u8bcd\uff5c\u8bcd\u5934\u3001\u8bfb\u97f3\u3001\u8bcd\u6027\u3001\u4e2d\u82f1\u91ca\u4e49\u4e0e\u4f8b\u53e5\u4fe1\u606f\u3002' }] });
    sheet.rows.push({ r: 3, h: 22, cells: LIST_HEAD.map(function (t, i) { return { c: i + 1, s: 4, v: t }; }) });
    list.forEach(function (v, i) {
      sheet.rows.push({ r: 4 + i, cells: [
        { c: 1, s: 13, v: v.n }, { c: 2, s: 13, v: withSuru(v.w || '', v.suru) },
        { c: 3, s: 13, v: withSuru(v.r || '', v.suru) }, { c: 4, s: 13, v: v.pos || '' },
        { c: 5, s: 20, v: v.cn || '' }, { c: 6, s: 20, v: v.en || '' },
        { c: 7, s: 20, v: v.ex || '' }, { c: 8, s: 20, v: v.exCn || '' }] });
    });
    X.download(X.build([sheet]), (activeBook ? activeBook.id.toUpperCase() : 'JLPT') + '_\u5355\u8bcd\u8868_' + range.fileToken + '.xlsx');
  }

  /* ---------- range helpers ---------- */
  function rangeInfo(list) {
    var values = list.map(function (item) { return item.n; })
      .filter(function (value) { return typeof value === 'number' && isFinite(value); });
    var fallbackStart = values.length ? Math.min.apply(Math, values) : '';
    var fallbackEnd = values.length ? Math.max.apply(Math, values) : '';
    var start = fallbackStart;
    var end = fallbackEnd;
    return {
      start: start,
      end: end,
      label: '第' + start + '—' + end + '词',
      shortLabel: start + '—' + end,
      fileToken: start + '-' + end
    };
  }

  function inRange(a, b) {
    return VOCAB.filter(function (v) {
      return v.n >= a && v.n <= b;
    });
  }

  var STUDY_KEY = 'nihongolab-vocab-study-v2';

  function studyMillis(value) {
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'number' && isFinite(value)) return value;
    if (typeof value === 'string' && value) {
      var parsed = Date.parse(value);
      if (!isNaN(parsed)) return parsed;
    }
    return Date.now();
  }

  function studyDateKey(value) {
    var d = new Date(studyMillis(value));
    var month = String(d.getMonth() + 1);
    var day = String(d.getDate());
    return d.getFullYear() + '-' + (month.length < 2 ? '0' : '') + month + '-' +
      (day.length < 2 ? '0' : '') + day;
  }

  function emptyStudyState() {
    return { version: 1, items: {}, activity: {} };
  }

  function studyStorage(storage) {
    if (storage) return storage;
    try { return window.localStorage; } catch (e) { return null; }
  }

  function loadStudyState(storage) {
    var target = studyStorage(storage), raw = null, parsed = null;
    if (target) {
      try { raw = target.getItem(STUDY_KEY); } catch (e) { raw = null; }
    }
    if (raw) {
      try { parsed = JSON.parse(raw); } catch (e2) { parsed = null; }
    }
    if (!parsed || typeof parsed !== 'object') return emptyStudyState();
    if (!parsed.items || typeof parsed.items !== 'object') parsed.items = {};
    if (!parsed.activity || typeof parsed.activity !== 'object') parsed.activity = {};
    parsed.version = 1;
    return parsed;
  }

  function saveStudyState(state, storage) {
    var target = studyStorage(storage);
    if (target) {
      try { target.setItem(STUDY_KEY, JSON.stringify(state)); } catch (e) {}
    }
    return state;
  }

  function clearStudyState(storage) {
    var target = studyStorage(storage);
    if (target) {
      try { target.removeItem(STUDY_KEY); } catch (e) {}
    }
    return emptyStudyState();
  }

  function studyEntry(state, number) {
    var key = typeof number === 'object' ? itemStudyKey(number) : String(number);
    return state && state.items ? state.items[key] : null;
  }

  function itemStudyKey(item) {
    if (!item || typeof item !== 'object') return String(item);
    return item.book ? item.book + ':' + item.n : String(item.n);
  }

  function getNewItems(list, state) {
    return (list || []).filter(function (item) {
      var entry = studyEntry(state, item);
      return !entry || Number(entry.seen || 0) < 1;
    }).sort(function (a, b) { return a.n - b.n; });
  }

  function getDueItems(list, state, now) {
    var current = studyMillis(now);
    return (list || []).filter(function (item) {
      var entry = studyEntry(state, item);
      return entry && Number(entry.seen || 0) > 0 && Number(entry.due || 0) <= current;
    }).sort(function (a, b) {
      return Number(studyEntry(state, a).due || 0) - Number(studyEntry(state, b).due || 0) || a.n - b.n;
    });
  }

  function getStudyQueue(list, state, now, newLimit) {
    var due = getDueItems(list, state, now);
    var limit = Math.max(0, Math.floor(Number(newLimit) || 0));
    return due.concat(getNewItems(list, state).slice(0, limit));
  }

  function nextDayKey(key, offset) {
    var d = new Date(key + 'T12:00:00');
    d.setDate(d.getDate() + offset);
    return studyDateKey(d);
  }

  function studyStats(list, state, now, newLimit) {
    var today = studyDateKey(now), activity = state.activity[today] || {};
    var due = getDueItems(list, state, now).length;
    var learned = (list || []).filter(function (item) {
      var entry = studyEntry(state, item);
      return entry && Number(entry.seen || 0) > 0;
    }).length;
    var streak = 0, cursor = today;
    while (state.activity[cursor] && (Number(state.activity[cursor].new || 0) + Number(state.activity[cursor].reviews || 0) > 0)) {
      streak++;
      cursor = nextDayKey(cursor, -1);
    }
    var limit = Math.max(0, Math.floor(Number(newLimit) || 0));
    var todayNew = Number(activity.new || 0);
    return { todayNew: todayNew, due: due, learned: learned, streak: streak,
      newRemaining: Math.max(0, limit - todayNew) };
  }

  function scheduleReview(state, number, grade, now) {
    if (!state || typeof state !== 'object') state = emptyStudyState();
    if (!state.items || typeof state.items !== 'object') state.items = {};
    if (!state.activity || typeof state.activity !== 'object') state.activity = {};
    var current = studyMillis(now), key = typeof number === 'object' ? itemStudyKey(number) : String(number), old = state.items[key] || {};
    var wasNew = Number(old.seen || 0) < 1;
    var repetitions = Number(old.reps || 0), previousInterval = Number(old.interval || 0);
    var normalized = grade === 'again' || grade === 'hard' || grade === 'remember' || grade === 'easy' ? grade : 'remember';
    var interval;
    if (normalized === 'again') {
      interval = 0;
    } else if (normalized === 'hard') {
      interval = previousInterval > 0 ? Math.max(1, Math.round(previousInterval * 1.5)) : 1;
    } else if (normalized === 'easy') {
      interval = [7, 14, 30, 60, 90][Math.min(repetitions, 4)];
    } else {
      interval = [3, 14, 30, 60, 90][Math.min(repetitions, 4)];
    }
    state.items[key] = {
      seen: 1, reps: normalized === 'again' ? repetitions : repetitions + 1,
      lapses: Number(old.lapses || 0) + (normalized === 'again' ? 1 : 0),
      interval: interval, due: current + (interval ? interval * 86400000 : 600000), last: current,
      lastDate: studyDateKey(current)
    };
    var today = studyDateKey(current), record = state.activity[today] || { new: 0, reviews: 0 };
    if (wasNew) record.new = Number(record.new || 0) + 1;
    else record.reviews = Number(record.reviews || 0) + 1;
    state.activity[today] = record;
    return state;
  }

  window.EjuCore = {
    vocab: VOCAB, inRange: inRange, makePaper: makePaper, exportPaper: exportPaper,
    books: BOOKS, setBook: setBook, getBook: function () { return activeBook; }, standardPos: standardPos,
    hasSpeech: hasSpeech, speakWord: speakWord, stopSpeech: stopSpeech,
    exportList: exportList,
    sameAnswer: sameAnswer, checkAnswer: checkAnswer, norm: norm, withSuru: withSuru, setStrict: setStrict,
    studyKey: STUDY_KEY, loadStudyState: loadStudyState, saveStudyState: saveStudyState,
    clearStudyState: clearStudyState, getNewItems: getNewItems, getDueItems: getDueItems,
    getStudyQueue: getStudyQueue, scheduleReview: scheduleReview, studyStats: studyStats,
    studyDateKey: studyDateKey
  };
})();
