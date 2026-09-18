(function (global) {
  'use strict';

  var CRC_TABLE = (function () {
    var table = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      table[n] = c >>> 0;
    }
    return table;
  })();

  function u16(value) { return [value & 255, (value >>> 8) & 255]; }
  function u32(value) { return [value & 255, (value >>> 8) & 255, (value >>> 16) & 255, (value >>> 24) & 255]; }
  function utf8(value) { return new TextEncoder().encode(value); }
  function crc32(bytes) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 255] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function zip(entries) {
    var local = [], central = [], offset = 0;
    entries.forEach(function (entry) {
      var name = utf8(entry.name), data = utf8(entry.data), crc = crc32(data);
      var header = new Uint8Array([].concat(u32(0x04034b50),u16(20),u16(0x0800),u16(0),u16(0),u16(0),u32(crc),u32(data.length),u32(data.length),u16(name.length),u16(0)));
      local.push(header,name,data); central.push({name:name,crc:crc,size:data.length,offset:offset});
      offset += header.length + name.length + data.length;
    });
    var directory = [], directorySize = 0;
    central.forEach(function (entry) {
      var record = new Uint8Array([].concat(u32(0x02014b50),u16(20),u16(20),u16(0x0800),u16(0),u16(0),u16(0),u32(entry.crc),u32(entry.size),u32(entry.size),u16(entry.name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(entry.offset)));
      directory.push(record,entry.name); directorySize += record.length + entry.name.length;
    });
    var end = new Uint8Array([].concat(u32(0x06054b50),u16(0),u16(0),u16(entries.length),u16(entries.length),u32(directorySize),u32(offset),u16(0)));
    var output = new Uint8Array(offset + directorySize + end.length), position = 0;
    local.concat(directory,[end]).forEach(function (part) { output.set(part,position); position += part.length; });
    return output;
  }
  function esc(value) { return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function run(text,bold) { return '<w:r><w:rPr>'+(bold?'<w:b/>':'')+'<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Yu Gothic"/></w:rPr><w:t xml:space="preserve">'+esc(text)+'</w:t></w:r>'; }
  function paragraph(text,style,bold) {
    var lines=String(text||'').split('\n'), content=lines.map(function(line,index){return (index?'<w:r><w:br/></w:r>':'')+run(line,bold)}).join('');
    var centered=style==='Title'||style==='Subtitle'||style==='Meta';
    return '<w:p><w:pPr>'+(style?'<w:pStyle w:val="'+style+'"/>':'')+(centered?'<w:jc w:val="center"/>':'')+'</w:pPr>'+content+'</w:p>';
  }
  function pageBreak() { return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'; }
  function block(content) { return '<w:tbl><w:tblPr><w:tblW w:w="9354" w:type="dxa"/><w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="9354"/></w:tblGrid><w:tr><w:trPr><w:cantSplit/></w:trPr><w:tc><w:tcPr><w:tcW w:w="9354" w:type="dxa"/></w:tcPr>'+content+'</w:tc></w:tr></w:tbl>'; }
  function questionXml(q,index,answers) {
    var letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ', body=paragraph((index+1)+'. ['+q.level+' · '+q.type+'] '+q.stem,'Question',true);
    if (answers) {
      var solution=q.type==='排序'&&q.order?q.order.map(function(i){return q.options[i]}).join(' → '):letters.charAt(q.answer)+'. '+q.options[q.answer];
      return block(body+paragraph('答案：'+solution,'Answer',true)+paragraph(q.explanation,'Explanation',false));
    }
    q.options.forEach(function(option,i){body+=paragraph('□ '+letters.charAt(i)+'. '+option,i<q.options.length-1?'OptionKeep':'Option',false)});
    if(q.type==='排序')body+=paragraph('作答：____________________________________________','Option',false);
    return block(body);
  }
  function documentXml(questions,levels) {
    var body=paragraph('日语语法练习','Title',false)+paragraph('范围：'+levels.join('・')+'　题数：'+questions.length+'　每题 1 分','Subtitle',false)+paragraph('姓名：________________　日期：________________　得分：________／'+questions.length,'Meta',false);
    questions.forEach(function(q,i){body+=questionXml(q,i,false)});
    body+=pageBreak()+paragraph('参考答案与解析','Title',false);
    questions.forEach(function(q,i){body+=questionXml(q,i,true)});
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+body+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1276" w:bottom="1134" w:left="1276" w:header="567" w:footer="567"/><w:cols w:space="708"/><w:docGrid w:linePitch="312"/></w:sectPr></w:body></w:document>';
  }
  function build(questions,levels) {
    var types='<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>';
    var rels='<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>';
    var styles='<?xml version="1.0" encoding="UTF-8"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:sz w:val="21"/><w:szCs w:val="21"/><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="Yu Gothic"/></w:rPr></w:rPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:pPr><w:spacing w:after="80" w:line="300" w:lineRule="auto"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:pPr><w:jc w:val="center"/><w:spacing w:after="180"/></w:pPr><w:rPr><w:b/><w:color w:val="000000"/><w:sz w:val="34"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:pPr><w:jc w:val="center"/><w:spacing w:after="100"/></w:pPr><w:rPr><w:color w:val="000000"/><w:sz w:val="21"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Meta"><w:name w:val="Meta"/><w:pPr><w:jc w:val="center"/><w:spacing w:after="260"/></w:pPr><w:rPr><w:sz w:val="21"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Question"><w:name w:val="Question"/><w:pPr><w:keepNext/><w:spacing w:before="160" w:after="70"/></w:pPr><w:rPr><w:b/><w:sz w:val="21"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Option"><w:name w:val="Option"/><w:pPr><w:ind w:left="360"/><w:spacing w:after="35"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="OptionKeep"><w:name w:val="Option Keep"/><w:pPr><w:keepNext/><w:ind w:left="360"/><w:spacing w:after="35"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Answer"><w:name w:val="Answer"/><w:pPr><w:keepNext/><w:ind w:left="360"/><w:spacing w:after="45"/></w:pPr><w:rPr><w:b/><w:color w:val="215A46"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Explanation"><w:name w:val="Explanation"/><w:pPr><w:ind w:left="360"/><w:spacing w:after="110"/></w:pPr><w:rPr><w:color w:val="333333"/></w:rPr></w:style></w:styles>';
    var core='<?xml version="1.0" encoding="UTF-8"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>日语语法练习</dc:title><dc:creator>NihongoLab</dc:creator></cp:coreProperties>';
    var app='<?xml version="1.0" encoding="UTF-8"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>NihongoLab</Application></Properties>';
    return zip([{name:'[Content_Types].xml',data:types},{name:'_rels/.rels',data:rels},{name:'word/document.xml',data:documentXml(questions,levels)},{name:'word/styles.xml',data:styles},{name:'docProps/core.xml',data:core},{name:'docProps/app.xml',data:app}]);
  }
  function exportPaper(questions,levels) {
    if(!questions.length){alert('当前筛选条件下没有可导出的题目。');return}
    var bytes=build(questions,levels),blob=new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}),url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download='NihongoLab_语法练习_'+questions.length+'题_'+levels.join('-')+'.docx';document.body.appendChild(link);link.click();link.remove();setTimeout(function(){URL.revokeObjectURL(url)},1000);
  }
  global.GrammarDocx={build:build,exportPaper:exportPaper};
})(window);
