var inherit = require('inherit'),
    vow = require('vow'),
    enb = require('enb'),
    vfs = enb.asyncFS || require('enb/lib/fs/async-fs'),
    BaseTech = enb.BaseTech || require('enb/lib/tech/base-tech'),
    fileEval = require('file-eval'),
    deps = require('../lib/deps/deps');

/**
 * @class SubtractDepsTech
 * @augments {BaseTech}
 * @classdesc
 *
 * Builds DEPS file subtracting one file from another.
 *
 * @param {Object}  options                         Options.
 * @param {String}  options.from                    Path to DEPS file from which is subtracted.
 * @param {String}  options.what                    Path to DEPS file that is subtracted.
 * @param {String}  [options.target=?.deps.js]      Path to result DEPS file.
 *
 * @example
 * // Nodes in file system before build:
 * //
 * // bundle/
 * // ├── bundle-1.deps.js
 * // └── bundle-2.deps.js
 * //
 * // After build:
 * // bundle/
 * // ├── bundle-1.deps.js
 * // ├── bundle-2.deps.js
 * // └── bundle.deps.js
 *
 * var bemTechs = require('enb-bem-techs');
 *
 * module.exports = function(config) {
 *     config.node('bundle', function(node) {
 *         node.addTech([bemTechs.subtractDeps, {
 *             from: 'bundle-1.deps.js',
 *             what: 'bundle-2.deps.js',
 *             target: 'bundle.deps.js'
 *         }]);
 *         node.addTarget('bundle.deps.js');
 *     });
 * };
 */
module.exports = inherit(BaseTech, {
    getName: function () {
        return 'subtract-deps';
    },

    configure: function () {
        var node = this.node;

        this._target = node.unmaskTargetName(this.getOption('target', '?.deps.js'));
        this._fromTarget = node.unmaskTargetName(this.getRequiredOption('from'));
        this._whatTarget = node.unmaskTargetName(this.getRequiredOption('what'));
    },

    getTargets: function () {
        return [this._target];
    },

    build: function () {
        var node = this.node,
            target = this._target,
            cache = node.getNodeCache(target),
            targetFilename = node.resolvePath(target),
            fromFilename = node.resolvePath(this._fromTarget),
            whatFilename = node.resolvePath(this._whatTarget);

        return this.node.requireSources([this._fromTarget, this._whatTarget])
            .spread(function (fromDeps, whatDeps) {
                if (cache.needRebuildFile('deps-file', targetFilename) ||
                    cache.needRebuildFile('deps-from-file', fromFilename) ||
                    cache.needRebuildFile('deps-what-file', whatFilename)
                ) {
                    return vow.all([
                            requireDeps(fromDeps, fromFilename),
                            requireDeps(whatDeps, whatFilename)
                        ])
                        .spread(function (from, what) {
                            var fromDeps = Array.isArray(from) ? from : from.deps,
                                whatDeps = Array.isArray(what) ? what : what.deps,
                                subtractedDeps = deps.subtract(fromDeps, whatDeps),
                                str = 'exports.deps = ' + JSON.stringify(subtractedDeps, null, 4) + ';';

                            return vfs.write(targetFilename, str, 'utf-8')
                                .then(function () {
                                    cache.cacheFileInfo('deps-file', targetFilename);
                                    cache.cacheFileInfo('deps-from-file', fromFilename);
                                    cache.cacheFileInfo('deps-what-file', whatFilename);
                                    node.resolveTarget(target, { deps: subtractedDeps });
                                });
                        });
                } else {
                    node.isValidTarget(target);

                    return fileEval(targetFilename)
                        .then(function (result) {
                            node.resolveTarget(target, result);
                            return null;
                        });
                }
            });
    }
});

function requireDeps(deps, filename) {
    if (deps) { return deps; }

    return fileEval(filename);
}
