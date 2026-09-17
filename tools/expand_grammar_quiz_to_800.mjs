import fs from 'node:fs';import vm from 'node:vm';
const path=new URL('../data/grammar_quiz.js',import.meta.url),c={window:{}};vm.createContext(c);vm.runInContext(fs.readFileSync(path,'utf8'),c);
let data=c.window.JA_GRAMMAR_QUIZ.filter(x=>!String(x.id).startsWith('variant-'));
const replacements=[
['田中さん','山田さん'],['山田さん','佐藤さん'],['田中','山田'],['日本','外国'],['東京','大阪'],['大阪','名古屋'],['北海道','九州'],
['学校','大学'],['先生','先輩'],['留学生','新入生'],['家族','友人'],['友達','同僚'],
['図書館','資料室'],['電車','バス'],['高速道路','鉄道'],['ホテル','旅館'],['レストラン','食堂'],['町','地域'],
['昼ご飯','夕食'],['コーヒー','お茶'],['新聞','資料'],['辞書','参考書'],['手帳','ノート'],
['写真','動画'],['テレビ','ラジオ'],['メール','メッセージ'],['電話','連絡'],['部屋','会場'],['机','棚'],['荷物','資料'],['切符','入場券'],
['仕事','作業'],['会議','研修'],['授業','講座'],['宿題','課題'],['試験','審査'],['大会','発表会'],['計画','制度'],['サービス','仕組み'],
['研究','調査'],['実験','調査'],['記録','結果'],['説明','案内'],['報告書','計画書'],['基準','方針'],
['利用者','参加者'],['参加者','回答者'],['観光客','来訪者'],['専門家','担当者'],['職員','スタッフ'],
['一週間','二週間'],['三時間','二時間'],['毎日','毎週'],['昨日','先週'],['明日','来週'],['午前','午後'],['先月','先週'],['来週','来月'],
['新しい','別の'],['大きな','重要な'],['難しい','複雑な'],['高い','便利な'],['増える','多くなる'],['減る','少なくなる'],['始める','続ける'],
['書く','入力する'],['話す','説明する'],['見る','確認する'],['使う','利用する'],['作る','準備する'],['買う','注文する'],
['問題','課題'],['目的','目標'],['結果','内容'],['方法','手順'],['経験','知識'],['意見','提案'],['情報','資料'],['可能性','機会']
,['今後','将来'],['現在','当時'],['今年','来年'],['春','秋'],['雨','雪'],['自転車','自動車'],['空港','駅'],
['日本語','英語'],['漢字','単語'],['作文','報告書'],['料理','作業'],['運動','練習'],['旅行','研修'],['予約','申請'],['連絡','報告'],
['健康','安全'],['体力','集中力'],['費用','料金'],['価格','費用'],['設備','装置'],['技術','制度'],['環境','状況'],['原因','理由'],
['目標','目的'],['提案','意見'],['知識','経験'],['手順','方法'],['内容','結果'],['データ','資料'],['回答者','参加者'],['担当者','専門家']
];
function replaceDeep(q,a,b){const out=JSON.parse(JSON.stringify(q));for(const k of ['stem','explanation'])out[k]=String(out[k]||'').split(a).join(b);out.options=out.options.map(x=>String(x).split(a).join(b));return out}
function sanitize(q){const fixes=[['相談が日本語','質問が日本語'],['相談が外国語','質問が外国語'],['相談が英語','質問が英語'],['大社員','大学生'],['留社員','留学生'],['専門会社','専門学校'],['観光利用者','観光客'],['空港員','駅員'],['食事を食べ','食事をし'],['相談結果','相談内容'],['確認する本','読む本'],['紙のデータ','紙の資料'],['紙の情報','紙の資料'],['連絡を見','スマートフォンを見']];for(const [a,b] of fixes)q=replaceDeep(q,a,b);return q}
function signature(q){return q.level+'|'+q.type+'|'+q.stem+'|'+q.options.join('|')}
const seen=new Set(data.map(signature)),variants=[];let round=1;
while(data.length+variants.length<800&&round<=12){
  const sources=data.filter(x=>x.type!=='排序');
  for(const src of sources){
    for(let r=0;r<replacements.length;r++){
      if(data.length+variants.length>=800)break;
      const [a,b]=replacements[(r+round-1)%replacements.length];if(!src.stem.includes(a))continue;
      let q=replaceDeep(src,a,b);
      if(round>1){const candidates=replacements.filter(([x])=>q.stem.includes(x)&&x!==a);const second=candidates.length?candidates[(round-2)%candidates.length]:null;if(second)q=replaceDeep(q,second[0],second[1])}
      q=sanitize(q);const sig=signature(q);if(seen.has(sig))continue;seen.add(sig);q.id=`variant-${String(variants.length+1).padStart(3,'0')}-${src.id}`;q.explanation=String(q.explanation||'')+'（本题为同考点场景改写。）';delete q.order;variants.push(q);
    }
    if(data.length+variants.length>=800)break;
  }
  round++;
}
if(data.length+variants.length<800)throw new Error(`Only generated ${data.length+variants.length} questions`);
data=data.concat(variants.slice(0,800-data.length));fs.writeFileSync(path,'window.JA_GRAMMAR_QUIZ = '+JSON.stringify(data,null,2)+';\n');console.log(`Grammar quiz expanded to ${data.length}; variants added ${variants.length}.`);

