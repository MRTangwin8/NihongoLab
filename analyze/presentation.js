(function () {
'use strict';
var output=document.getElementById('out'),diagram=document.getElementById('diagram'),resize;
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function kind(t){return t.pos.split('・')[0]}
var selectedSentence=0,lastText="";
function render(){
if(resize)resize.disconnect();
var tokens=Array.from(output.querySelectorAll('tbody tr')).map(function(row){var c=row.cells;return {s:(c[0].querySelector('rb')||c[0]).textContent.trim(),r:c[1].textContent.trim(),b:c[2].textContent.trim(),pos:c[3].textContent.trim(),f:c[4].textContent.trim()}});
if(!tokens.length){diagram.innerHTML='';return}
var nav='';
var groups=[];tokens.forEach(function(t,i){
 var prev=groups[groups.length-1],last=prev&&prev[prev.length-1],k=kind(t);
 var verbal=prev&&prev.some(x=>kind(x)==='動詞'||kind(x)==='形容詞');
 var suru=prev&&prev.length===1&&/サ変接続/.test(prev[0].pos)&&k==='動詞'&&t.b==='する';
 var te=verbal&&k==='助詞'&&/接続助詞/.test(t.pos)&&/^(て|で)$/.test(t.s);
 var auxiliary=verbal&&last&&/^(て|で)$/.test(last.s)&&k==='動詞'&&/非自立/.test(t.pos)&&/^(いる|おる|ある|おく|しまう|みる|くる|来る|いく|行く)$/.test(t.b);
 if(suru||te||auxiliary||(k==='助動詞'&&prev&&kind(prev[0])!=='助詞'))prev.push(t);else groups.push([t]);
});
function head(g){return g.find(t=>kind(t)==='動詞'||kind(t)==='形容詞')||g[0]}
function formLabel(g){var labels=[],h=head(g);if(g.some(t=>t.b==='た'&&kind(t)==='助動詞'))labels.push('过去式');if(g.some(t=>t.b==='ます'))labels.push('礼貌体');if(g.some(t=>t.b==='たい'))labels.push('愿望');if(g.some(t=>t.b==='ない'||t.b==='ぬ'))labels.push('否定');if(g.some(t=>/^(て|で)$/.test(t.s)&&kind(t)==='助詞')){if(g.some(t=>/^(いる|おる)$/.test(t.b)))labels.push('进行／持续状态');else if(g.some(t=>t.b==='しまう'))labels.push('完成／遗憾');else if(g.some(t=>t.b==='おく'))labels.push('预先准备');else labels.push('て形')};return labels.join('、')||h.f}
var words=groups.map(g=>g.map(t=>t.s).join('')),deps=[],particles=[];
function next(i,predicate){for(var j=i+1;j<groups.length;j++){if(kind(head(groups[j]))==='記号')break;if(predicate(head(groups[j])))return j}return -1}
function link(a,b,label){if(a>=0&&b>=0)deps.push({a:a,b:b,label:label})}
groups.forEach(function(g,i){var t=head(g),k=kind(t);if(k==='動詞'||k==='形容詞'){if(groups[i+1]&&kind(groups[i+1][0])==='名詞')link(i,i+1,'修饰')}
if(k!=='助詞')return;
var target=-1,meaning='连接前后成分，具体作用需结合上下文判断。',label='关联';
if(t.s==='の'&&/連体化/.test(t.pos)){target=next(i,x=>kind(x)==='名詞');meaning='连接两个名词，前面的词限定后面的词；这里说明所属或位置。';label='限定'}
else if(['は','が','を','で','に','へ','と','も','から','まで'].includes(t.s)){
 target=next(i,x=>['動詞','形容詞'].includes(kind(x)));
 var map={'は':['主题','提出句子谈论的主题。'],'が':['对象／主语','通常标记主语；接「怖い」「好き」等时，也可标记感情或状态的对象。'],'を':['宾语','标记动作涉及的对象；也可表示经过或离开的地方。'],'で':['场所／手段','标记动作发生的场所，或动作使用的手段。'],'に':['对象／方向','可标记对象、到达点、时间或存在地点。'],'へ':['方向','标记移动的方向。'],'と':['共同／引用','可表示共同参与者或引用内容。'],'も':['也','把前面的成分加入同类范围。'],'から':['起点','表示时间或空间的起点；接句子也可表示原因。'],'まで':['终点','表示时间、空间或范围的终点。']};label=map[t.s][0];meaning=map[t.s][1];
}else if(t.s==='て'||t.s==='で'){target=next(i,x=>kind(x)==='動詞');label='连接';meaning='连接前后动作或接续补助动词。'}
link(Math.max(0,i-1),target,label);particles.push({i:i,text:t.s,meaning:meaning,context:(words[i-1]||'')+' '+t.s+(target>=0?' → '+words[target]:'')});
});
// Expand each source to its contiguous dependent phrase, including its particle.
function spanStart(index,seen){seen=seen||new Set();if(seen.has(index))return index;seen.add(index);var start=index;deps.filter(d=>d.b===index&&d.a<index).forEach(d=>{start=Math.min(start,spanStart(d.a,seen))});return start}
deps.forEach(function(d){d.start=spanStart(d.a);d.end=d.a;if(groups[d.a+1]&&kind(groups[d.a+1][0])==='助詞')d.end=d.a+1});
var cards=groups.map(function(g,i){var t=head(g),k=kind(t),cls=k==='助詞'?'particle':k==='名詞'?'noun':k==='動詞'||k==='形容詞'?'verb':'other';return '<button class="phrase '+cls+'" data-i="'+i+'" type="button"><span class="phrase-reading">'+esc(g.filter(t=>/[一-龯]/.test(t.s)).map(t=>t.r).join(' '))+'</span><span class="phrase-text">'+esc(words[i])+'</span><span class="phrase-note">'+esc(k==='助詞'?'助词':formLabel(g)!=='—'?((g[0]!==t&&/サ変接続/.test(g[0].pos))?g[0].s+'する':t.b)+' · '+formLabel(g):k)+'</span></button>'}).join('');
diagram.innerHTML=nav+'<section class="sentence-panel"><h2>句子关系</h2><div class="arc-scroll"><div class="arc-stage"><svg class="arcs" aria-hidden="true"></svg><div class="phrase-list">'+cards+'</div></div></div><p class="arc-help">括线标出词组，弧线指向关联词；跨行关系以相同编号接续。点词块可突出连线。</p><div class="dependency-list">'+deps.map(d=>'<span>'+esc(words.slice(d.start,d.end+1).join(''))+' → '+esc(words[d.b])+'（'+esc(d.label)+'）</span>').join('')+'</div></section><section class="particle-panel"><h2>助词的作用</h2>'+particles.map(p=>'<article><b>'+esc(p.text)+'</b><div><strong>'+esc(p.context)+'</strong><p>'+esc(p.meaning)+'</p></div></article>').join('')+(particles.length?'':'<p>这句话没有识别到助词。</p>')+'</section>';

var stage=diagram.querySelector('.arc-stage'),list=diagram.querySelector('.phrase-list'),svg=diagram.querySelector('svg');
function draw(){
var base=stage.getBoundingClientRect(),rects=Array.from(list.children).map(el=>{var r=el.getBoundingClientRect();return {left:r.left-base.left,right:r.right-base.left,top:r.top-base.top,bottom:r.bottom-base.top}}),colors=['#357bba','#bd623b','#7e60b8','#268477','#a76718'],lanes={};
svg.style.top='0';svg.setAttribute('width',stage.clientWidth);svg.setAttribute('height',stage.scrollHeight);
svg.innerHTML=deps.map(function(d,i){var source=rects[d.end],target=rects[d.b],color=colors[i%colors.length],row=Math.round(source.top),interval=[rects[d.start].top===source.top?rects[d.start].left:source.left,target.top===source.top?target.right:stage.clientWidth-12];
var used=lanes[row]||(lanes[row]=[]),lane=0;while(lane<4&&used.some(x=>x.lane===lane&&x.end>interval[0]&&x.start<interval[1]))lane++;used.push({start:interval[0],end:interval[1],lane:lane});
var offset=8+lane*9,brackets='',segments=[];for(var j=d.start;j<=d.end;j++){var r=rects[j],seg=segments[segments.length-1];if(seg&&seg.top===r.top)seg.right=r.right;else segments.push({left:r.left,right:r.right,top:r.top,bottom:r.bottom})}
segments.forEach(r=>{var y=r.bottom+offset;brackets+='<path d="M '+(r.left+3)+' '+(y-3)+' v 3 H '+(r.right-3)+' v -3"/>'});
var x=(source.left+source.right)/2,tx=(target.left+target.right)/2,y=source.bottom+offset,ty=target.bottom+offset,path,label='';
if(Math.abs(source.top-target.top)<2){path='<path d="M '+x+' '+y+' Q '+((x+tx)/2)+' '+(y+18)+' '+tx+' '+(target.bottom+3)+'"/><path d="M '+(tx-4)+' '+(target.bottom+9)+' L '+tx+' '+(target.bottom+3)+' L '+(tx+4)+' '+(target.bottom+9)+'"/>'}
else{var edge=stage.clientWidth-8;path='<path stroke-dasharray="3 3" d="M '+x+' '+y+' Q '+edge+' '+(y+14)+' '+edge+' '+y+'"/><path d="M '+Math.max(4,tx-26)+' '+ty+' Q '+tx+' '+(ty+8)+' '+tx+' '+(target.bottom+3)+'"/><path d="M '+(tx-4)+' '+(target.bottom+9)+' L '+tx+' '+(target.bottom+3)+' L '+(tx+4)+' '+(target.bottom+9)+'"/>';label='<text x="'+(edge-13)+'" y="'+(y-4)+'">'+(i+1)+'</text><text x="'+Math.max(4,tx-25)+'" y="'+(ty-3)+'">'+(i+1)+'</text>'}
return '<g data-a="'+d.a+'" data-b="'+d.b+'" data-start="'+d.start+'" data-end="'+d.end+'" stroke="'+color+'" fill="none" stroke-width="1.6"><title>'+esc(words.slice(d.start,d.end+1).join('')+' → '+words[d.b]+' · '+d.label)+'</title>'+brackets+path+'<g fill="'+color+'" stroke="none" font-size="11">'+label+'</g></g>'}).join('');
}
stage.classList.add('handwritten');requestAnimationFrame(draw);resize=new ResizeObserver(draw);resize.observe(list);
list.onclick=function(e){var b=e.target.closest('[data-i]');if(!b)return;var id=b.dataset.i;svg.querySelectorAll('g').forEach(g=>g.style.opacity=(Number(id)>=Number(g.dataset.start)&&Number(id)<=Number(g.dataset.end))||g.dataset.b===id?'1':'.15');list.querySelectorAll('.phrase').forEach(x=>x.classList.toggle('selected',x===b));};
}
new MutationObserver(render).observe(output,{childList:true,subtree:true});
})();
