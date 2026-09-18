/* Dictionary decompression and tokenization must stay off the UI thread. */
'use strict';
var tokenizer;
self.onmessage = function (event) {
  var message = event.data;
  if (message.type === 'init') {
    try {
      importScripts('vendor/kuromoji/build/kuromoji.js');
      self.postMessage({ type: 'loading' });
      self.kuromoji.builder({ dicPath: 'vendor/kuromoji/dict/' }).build(function (error, result) {
        if (error) { self.postMessage({ type: 'error' }); return; }
        tokenizer = result;
        self.postMessage({ type: 'ready' });
      });
    } catch (error) { self.postMessage({ type: 'error' }); }
  } else if (message.type === 'analyze') {
    try {
      if (!tokenizer) throw new Error('Not ready');
      self.postMessage({ type: 'result', id: message.id, text: message.text, tokens: tokenizer.tokenize(message.text) });
    } catch (error) { self.postMessage({ type: 'error' }); }
  }
};
