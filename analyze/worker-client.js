(function () {
  'use strict';
  var worker, ready = false, timer, request = 0;
  var input = document.getElementById('text'), go = document.getElementById('go');
  var status = document.getElementById('status'), retry = document.getElementById('retry');
  input.maxLength = 2000;
  function fail(message) {
    clearTimeout(timer);
    if (worker) worker.terminate();
    worker = null; ready = false; go.disabled = false; retry.hidden = false;
    status.textContent = message;
  }
  function load() {
    if (worker) worker.terminate();
    clearTimeout(timer);
    ready = false; go.disabled = false; retry.hidden = true;
    status.textContent = '正在后台加载分析词典，可先输入句子…';
    try {
      worker = new Worker('tokenizer-worker.js?v=20260919-localdict');
      worker.onmessage = function (event) {
        var data = event.data;
        if (data.type === 'loading') status.textContent = '正在后台准备词典，可先输入句子…';
        if (data.type === 'ready') {
          clearTimeout(timer); ready = true;
          status.textContent = '分析词典已就绪';
        }
        if (data.type === 'error') fail('分析词典加载或分析失败，请重试。');
        if (data.type === 'result' && data.id === request) {
          clearTimeout(timer); go.disabled = false;
          if (input.value.trim() !== data.text) { status.textContent = '句子已修改，请重新分析。'; return; }
          window.renderAnalysis(data.text, data.tokens);
          status.textContent = '分析完成';
        }
      };
      worker.onerror = function (event) { event.preventDefault(); fail('分析器加载失败，请检查网络后重试。'); };
      worker.postMessage({ type: 'init' });
      timer = setTimeout(function () { fail('词典加载超时，请检查网络后重试。'); }, 90000);
    } catch (error) {
      fail(location.protocol === 'file:' ? '请通过本地服务器打开本页后使用分析功能。' : '浏览器无法启动后台分析，请换用新版浏览器。');
    }
  }
  go.onclick = function () {
    var text = input.value.trim();
    if (!text) { status.textContent = '请先输入需要分析的日语句子。'; input.focus(); return; }
    if (text.length > 2000) { status.textContent = '请将文本分成每段 2000 字以内再分析。'; return; }
    if (!ready) { status.textContent = worker ? '词典仍在后台加载，请稍候。' : '请先重新加载词典。'; return; }
    go.disabled = true; status.textContent = '正在分析…';
    worker.postMessage({ type: 'analyze', id: ++request, text: text });
    timer = setTimeout(function () { fail('分析超时，请缩短句子后重新加载词典。'); }, 20000);
  };
  retry.onclick = load;
  window.addEventListener('pagehide', function () { clearTimeout(timer); if (worker) worker.terminate(); worker = null; ready = false; });
  window.addEventListener('pageshow', function (event) { if (event.persisted) load(); });
  load();
})();
