/**
 * html-beautify
 * =================
 *
 * Форматирует однострочный *html*-файл в удобочитаемый вид с помощью `js-beautify`
 *
 */
var requireOrEval = require('enb/lib/fs/require-or-eval'),
    dropRequireCache  = require('enb/lib/fs/drop-require-cache'),
    fs                = require('fs'),
    beautifyHtml      = require('js-beautify').html;

module.exports = require('enb/lib/build-flow').create()
    .name('html-beautify')
    .target('target', '?.beauty.html')

    .useSourceFilename('htmlFile', '?.html')
    .optionAlias('htmlFile', 'htmlFileTarget')

    .optionAlias('target', 'destTarget')
    .builder(function(htmlFile) {
        return beautifyHtml(fs.readFileSync(htmlFile).toString());
    })
    .createTech();
