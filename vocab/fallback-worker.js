'use strict';
var loading;
function dictionary() {
  if (!loading) loading = fetch('../data/ja-zh-fallback.json').then(function (r) {
    if (!r.ok) throw Error(r.status);
    return r.json();
  }).catch(function (error) { loading = null; throw error; });
  return loading;
}
self.onmessage = async function (event) {
  var id = event.data.id, q = String(event.data.q || '').trim().toLowerCase();
  try {
    var data = await dictionary(), exact = [], other = [], count = 0;
    for (var v of data) {
      var match = v.w.toLowerCase() === q || v.r.split('／').includes(q);
      if (match || v.w.toLowerCase().includes(q) || v.r.includes(q) || v.s.some(function (s) { return s.g.some(function (g) { return g.toLowerCase().includes(q); }); })) {
        count++;
        if (match && exact.length < 60) exact.push(v);
        else if (other.length < 60) other.push(v);
      }
    }
    self.postMessage({ id: id, count: count, rows: exact.concat(other).slice(0, 60) });
  } catch (error) { self.postMessage({ id: id, error: true }); }
};
