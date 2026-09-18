(function (global) {
  'use strict';
  function bodyStyle(small) { return global.EjuXlsx.bodyStyle ? global.EjuXlsx.bodyStyle(small) : 5; }
  function typeStyle(label, small) { return global.EjuXlsx.typeStyle ? global.EjuXlsx.typeStyle(label, small) : 5; }
  function leftStyle() { return global.EjuXlsx.leftStyle || 20; }
  function sheet(title, subtitle, rows, answerSheet) {
    var half = Math.ceil(rows.length / 2), out = { name: answerSheet ? '答案' : '试题', cols: [
      {min:1,max:1,width:5},{min:2,max:2,width:10},{min:3,max:3,width:31},{min:4,max:4,width:25},
      {min:5,max:5,width:3},{min:6,max:6,width:5},{min:7,max:7,width:10},{min:8,max:8,width:31},{min:9,max:9,width:25}
    ], merges:['A1:I1','A2:I2'], rows:[], freeze:'A7', landscape:true, fitToWidth:1 };
    out.rows.push({r:1,h:34,cells:[{c:1,v:title,s:1}]});
    out.rows.push({r:2,h:22,cells:[{c:1,v:subtitle,s:2}]});
    out.rows.push({r:3,cells:[{c:1,v:null,s:0}]});
    out.rows.push({r:4,h:30,cells:[{c:1,v:answerSheet?'　　等级：':'　　姓名：',s:22},{c:2,v:'',s:21},{c:3,v:answerSheet?'题数：'+rows.length:'日期：',s:21},{c:4,v:'',s:21},{c:5,v:'',s:21},{c:6,v:answerSheet?'':'得分：',s:21},{c:7,v:'',s:21},{c:8,v:answerSheet?'':'／'+rows.length,s:21},{c:9,v:'',s:23}]});
    out.rows.push({r:5,cells:[{c:1,v:null,s:0}]});
    out.rows.push({r:6,h:25,cells:[{c:1,v:'No.',s:4},{c:2,v:'题型',s:4},{c:3,v:'题目',s:4},{c:4,v:answerSheet?'答案／解析':'选项／作答',s:4},{c:6,v:'No.',s:4},{c:7,v:'题型',s:4},{c:8,v:'题目',s:4},{c:9,v:answerSheet?'答案／解析':'选项／作答',s:4}]});
    function cells(item, number, offset) { var bs=bodyStyle(answerSheet);return [{c:offset,v:number,s:bs},{c:offset+1,v:item.type,s:typeStyle(item.type,answerSheet)},{c:offset+2,v:item.stem,s:leftStyle()},{c:offset+3,v:answerSheet?item.solution:item.choices,s:leftStyle()}]; }
    for(var i=0;i<half;i++){var left=rows[i],right=rows[i+half],cs=cells(left,i+1,1);if(right)cs=cs.concat(cells(right,i+half+1,6));out.rows.push({r:7+i,h:answerSheet?66:92,cells:cs});}
    var foot=8+half;out.merges.push('A'+foot+':I'+foot);out.rows.push({r:foot,h:22,cells:[{c:1,v:'NihongoLab 日语语法练习｜每题1分',s:6}]});return out;
  }
  function exportPaper(questions, levels) {
    if (!questions.length) { alert('当前筛选条件下没有可导出的题目。'); return; }
    var letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var rows=questions.map(function(q){
      var choices=q.options.map(function(o,i){return '□ '+letters.charAt(i)+'. '+o}).join('\n');
      var solution=q.type==='排序'&&q.order ? q.order.map(function(i){return q.options[i]}).join(' → ') : letters.charAt(q.answer)+'. '+q.options[q.answer];
      return {type:q.type,stem:q.stem,choices:choices,solution:solution+'\n'+q.explanation};
    });
    var levelText=levels.join('・'),title='日语语法随机测试｜'+rows.length+'题（'+levelText+'）',subtitle='选择最合适的答案；排序题按正确顺序作答｜每题1分，共'+rows.length+'分';
    var test=sheet(title,subtitle,rows,false),answers=sheet('日语语法随机测试｜参考答案',subtitle,rows,true);
    global.EjuXlsx.download(global.EjuXlsx.build([test,answers]),'NihongoLab_语法随机测试'+rows.length+'题_'+levelText+'.xlsx');
  }
  global.GrammarXlsx={exportPaper:exportPaper};
})(window);
