# Third-Party Notices

NihongoLab 的 MIT 与 CC BY-SA 4.0 授权只适用于项目作者拥有权利的源码和原创教学内容，不改变任何第三方材料的权利状态。

## 词典与词汇信息

词形、读音、词性、等级与基本释义属于本项目整理的语言事实信息。部分读音、词性和英文释义曾参照 EDRDG 的 JMdict 数据进行交叉校订。JMdict 的版权、署名要求和许可条件以 EDRDG 公布的版本为准：

- https://www.edrdg.org/jmdict/j_jmdict.html
- https://www.edrdg.org/edrdg/licence.html

## 外部参考

项目在编写和校订过程中参考了以下公开网站/书籍：

- 日本语能力测试 JLPT：https://www.jlpt.jp/
- 日本学生支援机构 JASSO／EJU：https://www.jasso.go.jp/ryugaku/eju/
- 毎日のんびり日本語教師：https://mainichi-nonbiri.com/japanese-grammar/
- 日本語NET：https://nihongokyoshi-net.com/
- まるごと：https://marugoto.jpf.go.jp/
- EJU 日本留学試験対策 ハイレベル 頻出単語3200
- JLPT N2 この一冊で合格する (日本語の森)

书籍、网站名称、考试名称和商标归各自权利人所有。外部链接所指内容适用各网站自己的使用条款和许可。

## 音频

项目不分发音频文件。网页朗读由浏览器和操作系统的 Web Speech API 提供，相关语音组件适用设备供应商的条款。
## kuromoji.js

句子分析页面通过 jsDelivr 加载 kuromoji.js 及其 IPADIC 词典。kuromoji.js 采用 MIT License。

## 在线语言服务

- 词库制作工具在站内词库无法补全时，可查询 Jisho.org 免费公开词典接口。
- 句子分析页面使用 MyMemory 免费接口生成辅助中文翻译。

## Local Japanese analysis

`analyze/vendor/kuromoji` contains kuromoji.js 0.1.2 (Apache-2.0) and its bundled MeCab IPADIC dictionary. See `analyze/vendor/kuromoji/LICENSE-2.0.txt` and `analyze/vendor/kuromoji/NOTICE.md` for the original licenses and notices. These third-party assets are not covered by the project MIT or content CC BY-SA license. Source: https://www.npmjs.com/package/kuromoji/v/0.1.2

## 日中兜底词典

`data/ja-zh-fallback.json` is a reduced extract of Chinese Wiktionary Japanese entries supplied by Kaikki (https://kaikki.org/zhwiktionary/日语/index.html), retrieved 2026-09-19. Original contributors and revision histories: https://zh.wiktionary.org/ . Text: CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/). Fields were selected, readings derived from ruby, and examples limited; original glosses retained. Entries with `own: true` are NihongoLab original additions under CC BY-SA 4.0. This dataset is separate from the MIT source code license.
