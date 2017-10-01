var inherit = require('inherit'),
    enb = require('enb'),
    vfs = enb.asyncFS || require('enb/lib/fs/async-fs'),
    BaseTech = enb.BaseTech || require('enb/lib/tech/base-tech'),
    fileEval = require('file-eval'),
    BemCell = require('@bem/sdk.cell'),
    bemjsonToDecl = require('@bem/sdk.bemjson-to-decl'),
    bemDecl = require('@bem/sdk.decl');

/**
 * @class BemjsonToBemdeclTech
 * @augments {BaseTech}
 * @classdesc
 *
 * Builds BEMDECL file from BEMJSON file.
 *
 * @param {Object}  [options]                          Options.
 * @param {String}  [options.target='?.bemdecl.js']    Path to a built BEMDECL file.
 * @param {String}  [options.source='?.bemjson.js']    Path to a BEMJSON file.
 * @param {String}  [options.bemdeclFormat='bemdecl']  Format of result declaration (bemdecl or deps).
 *
 * @example
 * var FileProvideTech = require('enb/techs/file-provider'),
 *     bemTechs = require('enb-bem-techs');
 *
 * module.exports = function(config) {
 *     config.node('bundle', function(node) {
 *         // get BEMJSON file
 *         node.addTech([FileProvideTech, { target: '?.bemjson.js' }]);
 *
 *         // build BEMDECL file
 *         node.addTech(bemTechs.bemjsonToBemdecl);
 *         node.addTarget('?.bemdecl.js');
 *     });
 * };
 */
module.exports = inherit(BaseTech, {
    getName: function () {
        return 'bemjson-to-bemdecl';
    },

    configure: function () {
        var node = this.node;

        this._target = node.unmaskTargetName(this.getOption('target', '?.bemdecl.js'));
        this._sourceTarget = node.unmaskTargetName(this.getOption('source', '?.bemjson.js'));
        this._bemdeclFormat = this.getOption('bemdeclFormat', 'bemdecl');
    },

    getTargets: function () {
        return [this._target];
    },

    build: function () {
        var node = this.node,
            target = this._target,
            cache = node.getNodeCache(target),
            bemdeclFilename = node.resolvePath(target),
            bemjsonFilename = node.resolvePath(this._sourceTarget),
            bemdeclFormat = this._bemdeclFormat;

        return this.node.requireSources([this._sourceTarget])
            .then(function () {
                if (cache.needRebuildFile('bemdecl-file', bemdeclFilename) ||
                    cache.needRebuildFile('bemjson-file', bemjsonFilename)
                ) {
                    return fileEval(bemjsonFilename)
                        .then(function (bemjson) {
                            var decl, data, str;

                            var entities = bemjsonToDecl.convert(bemjson);

                            var cells = entities.map(function (entity) {
                                return new BemCell({ entity: entity });
                            });

                            // bemdeclFormat: 'deps', 'bemdecl'
                            if (bemdeclFormat === 'deps') {
                                decl = bemDecl.format(cells, { format: 'enb' });
                                data = { deps: decl };
                                str = 'exports.deps = ' + JSON.stringify(decl, null, 4) + ';\n';
                            } else {
                                decl = bemDecl.format(cells, { format: 'v1' });
                                data = { blocks: decl };
                                str = 'exports.blocks = ' + JSON.stringify(decl, null, 4) + ';\n';
                            }

                            return vfs.write(bemdeclFilename, str, 'utf-8')
                                .then(function () {
                                    cache.cacheFileInfo('bemdecl-file', bemdeclFilename);
                                    cache.cacheFileInfo('bemjson-file', bemjsonFilename);
                                    node.resolveTarget(target, data);
                                });
                        });
                } else {
                    node.isValidTarget(target);

                    return fileEval(bemdeclFilename)
                        .then(function (result) {
                            node.resolveTarget(target, result);
                            return null;
                        });
                }
            });
    }
});
