import fs from 'node:fs';import vm from 'node:vm';const path=new URL('../data/grammar_quiz.js',import.meta.url),c={window:{}};vm.createContext(c);vm.runInContext(fs.readFileSync(path,'utf8'),c);
const add=[
{id:'jlpt-adapt-n2-201007-01',level:'N2',type:'辨析',stem:'このホテルは、客の希望（　）部屋をいくつか提案してくれる。',options:['に応じて','に先立って','に比べて','に向けて'],answer:0,explanation:'客人的需求决定推荐内容，使用「Nに応じて」。'},
{id:'jlpt-adapt-n2-201007-02',level:'N2',type:'句中选择',stem:'会社へ向かう（　）、定期券を忘れたことに気づいた。',options:['途中で','ついでに','うちに','なかで'],answer:0,explanation:'表示去公司的路上发生某事，使用「途中で」。'},
{id:'jlpt-adapt-n2-201007-03',level:'N2',type:'辨析',stem:'大雪の影響で、三時間（　）高速道路が通行止めになった。',options:['にわたり','につき','につれて','に伴い'],answer:0,explanation:'表示状态持续长达三小时，使用「にわたり」。'},
{id:'jlpt-adapt-n2-201007-04',level:'N2',type:'句中选择',stem:'新サービスの利用者は、開始以来増える（　）。',options:['一方だ','中心だ','事情だ','原因だ'],answer:0,explanation:'表示某种趋势持续朝一个方向发展，使用「一方だ」。'},
{id:'jlpt-adapt-n2-201007-05',level:'N2',type:'辨析',stem:'十分な説明もなく計画を進めるという判断は、住民には理解（　）。',options:['しがたい','しすぎる','しかねない','しがちだ'],answer:0,explanation:'表示即使想理解也很难接受，使用ます形＋「がたい」。'},
{id:'jlpt-adapt-n2-201007-06',level:'N2',type:'句中选择',stem:'先日お話のあった発表ですが、ぜひ私に（　）。',options:['担当させていただけないでしょうか','担当していただけないでしょうか','担当してもよろしいでしょうか','担当されてもよろしいでしょうか'],answer:0,explanation:'请求对方允许自己承担任务，使用使役＋「ていただけないでしょうか」。'},
{id:'jlpt-adapt-n2-201007-07',level:'N2',type:'辨析',stem:'先月も急な出張に（　）なのに、来週また行くことになった。',options:['行かされたばかり','行かれたばかり','行かされたまま','行かれたまま'],answer:0,explanation:'自己被迫出差且刚发生不久，使用使役被动「行かされた」＋「ばかり」。'},
{id:'jlpt-adapt-n2-201007-08',level:'N2',type:'句中选择',stem:'休憩中に軽く体を動かす（　）、肩がこりにくくなった。',options:['ようにしたところ','ようにしたところに','までになったところ','までになったところに'],answer:0,explanation:'尝试养成该习惯后发现结果，使用「ようにしたところ」。'},
{id:'jlpt-adapt-n2-201007-09',level:'N2',type:'辨析',stem:'この分野で分かっていることはまだ一部（　）、研究は着実に進んでいる。',options:['にすぎないとはいえ','にすぎないとすると','にかかわらないとはいえ','にかかわらないとすると'],answer:0,explanation:'前项表示“只不过”，后项转折，组合为「にすぎないとはいえ」。'},
{id:'jlpt-adapt-n2-201007-10',level:'N2',type:'句中选择',stem:'研修の目的は、参加者同士が経験を共有する（　）が、講師の説明だけで終わってしまった。',options:['ことにあったはずだ','ことにあったためだ','のにあったはずだ','のにあったためだ'],answer:0,explanation:'「目的は～ことにある」表示目的所在；结合语境用「はずだ」表达本应如此。'},
{id:'jlpt-adapt-n2-201007-11',level:'N2',type:'句中选择',stem:'体調を崩したことをきっかけに、今の働き方は（　）と考えるようになった。',options:['このままでいいのだろうか','このままがいいのではないか','このままならいいのではないか','このままよりいいのだろうか'],answer:0,explanation:'对维持现状提出疑问，使用「このままでいいのだろうか」。'},
{id:'jlpt-adapt-n2-201007-12',level:'N2',type:'排序',stem:'この町では、＿＿ ＿＿ ★ ＿＿店の味が違う。',options:['一口に','ラーメン','といっても','使う材料によって'],answer:2,order:[0,1,2,3],explanation:'正确语序：一口に／ラーメン／といっても／使う材料によって／店の味が違う。★处是「といっても」。'}
];
const ids=new Set(add.map(x=>x.id));const all=c.window.JA_GRAMMAR_QUIZ.filter(x=>!ids.has(x.id)).concat(add);fs.writeFileSync(path,'window.JA_GRAMMAR_QUIZ = '+JSON.stringify(all,null,2)+';\n');console.log(`Added ${add.length} verified JLPT-adapted questions; total ${all.length}.`);
