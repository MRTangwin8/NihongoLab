(function () {
  'use strict';
  var input = document.getElementById('text');
  var button = document.getElementById('go');
  var status = document.getElementById('status');
  var translation = document.getElementById('translation');

  button.addEventListener('click', function (event) {
    if (input.value.trim()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    status.textContent = '请先输入需要分析的日语句子。';
    input.focus();
  }, true);

  new MutationObserver(function () {
    var box = translation.querySelector('.translation');
    if (!box || !/MyMemory/.test(box.textContent) || box.querySelector('.machine-note')) return;
    var note = document.createElement('small');
    note.className = 'machine-note';
    note.style.display = 'block';
    note.style.marginTop = '5px';
    note.style.color = 'var(--muted)';
    note.textContent = '机器翻译可能有误，请结合原文判断。';
    box.appendChild(note);
  }).observe(translation, { childList: true, subtree: true });

  var style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = 'presentation.css?v=20260919-verbforms';
  document.head.appendChild(style);
  var emptyStyle = document.createElement('style');
  emptyStyle.textContent = '.wrap:empty{display:none}';
  document.head.appendChild(emptyStyle);
  var presentation = document.createElement('script');
  presentation.src = 'presentation.js?v=20260919-verbforms';
  document.head.appendChild(presentation);
})();
