(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); }, sequence = 0;
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function plain(html) {
    var doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
    doc.querySelectorAll('rt,rp,script,style').forEach(function (el) { el.remove(); });
    return doc.body.textContent || '';
  }
  var sets = [['eju', window.EJU_VOCAB || []], ['n2', window.N2_VOCAB || []], ['n4_extra', window.N4_EXTRA_VOCAB || []]];
  Object.keys(window.JLPT_VOCAB || {}).forEach(function (key) { sets.push([key, window.JLPT_VOCAB[key]]); });
  if (window.DOUBUTSU_N4) {
    sets.push(['doubutsu_n4_kanji', window.DOUBUTSU_N4.kanji || []], ['doubutsu_n4_vocab', window.DOUBUTSU_N4.vocab || []]);
  }
  function links(q) {
    return '<p><a target="_blank" rel="noopener" href="https://dict.youdao.com/result?word=' + encodeURIComponent(q) + '&amp;lang=ja">有道日汉</a> · <a target="_blank" rel="noopener" href="https://www.mojidict.com/">MOJi 日中词典</a> · <a target="_blank" rel="noopener" href="https://www.weblio.jp/content/' + encodeURIComponent(q) + '">Weblio 词性与例句</a> · <a target="_blank" rel="noopener" href="https://jisho.org/search/' + encodeURIComponent(q) + '">Jisho 词典</a></p>';
  }
  async function get(url) {
    var controller = new AbortController(), timeout = setTimeout(function () { controller.abort(); }, 10000);
    try { var response = await fetch(url, { signal: controller.signal }); if (!response.ok) throw Error(response.status); return await response.json(); }
    finally { clearTimeout(timeout); }
  }
  async function search() {
    var token = ++sequence, raw = $('q').value.trim(), query = raw.toLowerCase();
    $('dictionary').innerHTML = '';
    if ($('fallback')) $('fallback').remove();
    if (!raw) { $('result').textContent = '请输入要查询的单词、读音或意思。'; return; }
    var found = [];
    sets.forEach(function (set) { set[1].forEach(function (v) {
      if ([v.w, v.r, v.cn, v.en].join(' ').toLowerCase().includes(query)) found.push({ v: v, book: set[0] });
    }); });
    found.sort(function (a, b) { return Number(b.v.w === raw || b.v.r === raw) - Number(a.v.w === raw || a.v.r === raw); });
    $('result').innerHTML = '<h2>全库结果</h2><p class="note">共 ' + found.length + ' 条' + (found.length > 100 ? '，显示前 100 条；可缩小关键词继续查找' : '') + '</p>' + found.slice(0, 100).map(function (x) {
      var v = x.v;
      return '<article class="item"><a class="word" href="detail.html?book=' + encodeURIComponent(x.book) + '&n=' + encodeURIComponent(v.n) + '">' + esc(v.w) + (v.suru ? 'する' : '') + '</a><span class="badge">' + esc(x.book.toUpperCase()) + '</span><div class="reading">' + esc(v.r) + ' · ' + esc(v.posStd || v.pos) + '</div><div>' + esc(v.cn) + '</div><div>' + esc(v.en) + '</div>' + (v.ex ? '<p lang="ja">' + esc(v.ex) + '</p>' + (v.exCn ? '<p>' + esc(v.exCn) + '</p>' : '') : '') + '</article>';
    }).join('');
    $('dictionary').innerHTML = '<h2>在线词典</h2>' + links(raw) + '<div id="exampleResult">正在查询词典例句…</div>';
    var fallback=document.createElement('section');fallback.id='fallback';$('dictionary').before(fallback);fallback.innerHTML='<h2>日中词典</h2><p>正在查询本地中文词典…</p>';
    searchFallback(raw,token);
    // Jisho offers external lookup; its API does not allow browser CORS.
    var term = found.length && (found[0].v.r === raw || found[0].v.w === raw) ? found[0].v.w : raw;
    get('https://en.wiktionary.org/api/rest_v1/page/definition/' + encodeURIComponent(term)).then(function (data) {
      if (token !== sequence) return;
      var entries = data.ja || [], seen = new Set(), examples = [];
      var meanings = entries.map(function (entry) {
        (entry.definitions || []).forEach(function (sense) {
          var items = sense.parsedExamples || (sense.examples || []).map(function (e) { return { example: e }; });
          items.forEach(function (item) {
            var sentence = plain(item.example);
            if (sentence && !seen.has(sentence)) { seen.add(sentence); examples.push('<p lang="ja">' + esc(sentence) + '</p>' + (item.translation ? '<p class="note">' + esc(plain(item.translation)) + '</p>' : '')); }
          });
        });
        return '<p><b>' + esc(entry.partOfSpeech) + '</b><br>' + (entry.definitions || []).map(function (s) { return esc(plain(s.definition)); }).join('; ') + '</p>';
      }).join('');
      $('exampleResult').innerHTML = '<h3>Wiktionary 释义与例句</h3>' + meanings + (examples.length ? examples.slice(0, 12).join('') : '<p class="note">该词条暂无可显示的日语例句。</p>') + '<p class="note">来源：<a target="_blank" rel="noopener" href="https://en.wiktionary.org/wiki/' + encodeURIComponent(term) + '#Japanese">Wiktionary</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">CC BY-SA 4.0</a>；例句已转为纯文本，附文可能是罗马音或译文。</p>';
    }).catch(function () { if (token === sequence) $('exampleResult').textContent = '暂未取得词典例句，可打开 Weblio 查看。'; });
  }

  var fallbackWorker;
  function searchFallback(q,id) {
    try {
      if(!fallbackWorker){
        fallbackWorker=new Worker('fallback-worker.js');
        fallbackWorker.onmessage=function(event){
          var data=event.data;if(data.id!==sequence||!$('fallback'))return;
          if(data.error){$('fallback').innerHTML='<h2>日中词典</h2><p>词典加载失败，请刷新重试或使用下方在线词典。</p>';return;}
          $('fallback').innerHTML='<h2>日中词典</h2><p class="note">找到 '+data.count+' 条'+(data.count>60?'，显示前 60 条':'')+'</p>'+data.rows.map(function(v){
            var source=v.own?'本站原创':'中文维基词典';
            return '<article class="item"><b class="word" lang="ja">'+esc(v.w)+'</b><div class="reading">'+esc(v.r||'')+' · '+esc(v.p)+'</div>'+v.s.map(function(s){return '<p>'+s.g.map(esc).join('；')+'</p>'+s.e.map(function(e){return '<p lang="ja">'+esc(e.ja)+'</p>'+(e.zh?'<p>'+esc(e.zh)+'</p>':'')}).join('')}).join('')+'<small>'+(v.own?source:'<a target="_blank" rel="noopener" href="https://zh.wiktionary.org/wiki/'+encodeURIComponent(v.w)+'#日語">'+source+'</a>')+'</small></article>';
          }).join('')+'<p class="note">中文维基词典 / Kaikki · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">CC BY-SA 4.0</a></p>';
        };
        fallbackWorker.onerror=function(){if($('fallback'))$('fallback').textContent='本地词典暂时无法加载，请通过 HTTP 服务器打开，或使用在线词典链接。';fallbackWorker.terminate();fallbackWorker=null;};
      }
      fallbackWorker.postMessage({id:id,q:q});
    }catch(error){$('fallback').textContent='本地词典暂时无法加载，请使用下方在线词典。';}
  }
  $('go').onclick = search;
  $('q').onkeydown = function (event) { if (event.key === 'Enter') search(); };
  $('q').value = new URLSearchParams(location.search).get('q') || '';
  if ($('q').value) search();
})();
