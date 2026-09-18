# 本地句子分析

程序和词典已包含在 vendor/kuromoji 中（约 18 MB），由 Web Worker 在浏览器本机执行。分词、读音、原形、词性、活用及现有规则式修饰提示无需外部网络。修饰关系是辅助规则，并非完整句法模型。

在项目根目录运行 `python -m http.server 8771 --bind 127.0.0.1`，打开 http://127.0.0.1:8771/analyze/index.html 。不要直接双击 HTML；Worker 和词典需要通过 HTTP 加载。部署时完整上传 analyze/vendor，确保服务器不会自动解压 .dat.gz 文件。

默认关闭在线翻译；勾选后会将输入文本发送给 MyMemory。离线时保持关闭。

Limelight 是基于 PHP 8、MeCab 与 php-mecab 的另一种实现。本项目使用本地 kuromoji.js，运行不需要 PHP 或这些扩展。授权见 vendor/kuromoji 下的 LICENSE-2.0.txt 与 NOTICE.md。
