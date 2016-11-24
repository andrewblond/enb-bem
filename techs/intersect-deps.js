var inherit = require('inherit'),
    vow = require('vow'),
    enb = require('enb'),
    vfs = enb.asyncFS || require('enb/lib/fs/async-fs'),
    BaseTech = enb.BaseTech || require('enb/lib/tech/base-tech'),
    asyncRequire = require('enb-async-require'),
    clearRequire = require('clear-require'),
    deps = require('../lib/deps/deps');

/**
 * @class IntersectDepsTech
 * @augments {BaseTech}
 * @classdesc
 *
 * Intersects DEPS files and BEMDECL files in one.
 *
 * It could be necessary to build the common bundle.
 *
 * @param {Object}    options                          Options.
 * @param {String[]}  options.sources                  Paths to DEPS or BEMDECL files for intersect.
 * @param {String}    [options.target='?.bemdecl.js']  Path to intersected DEPS file.
 *
 * @example
 * // Nodes in file system before build:
 * // common-bundle/
 * // ├── bundle-1.deps.js
 * // └── bundle-2.deps.js
 * //
 * // After build:
 * // common-bundle/
 * // ├── bundle-1.deps.js
 * // ├── bundle-2.deps.js
 * // └── common-bundle.deps.js
 *
 * var bemTechs = require('enb-bem-techs');
 *
 * module.exports = function(config) {
 *     config.node('common-bundle', function(node) {
 *         node.addTech([bemTechs.mergeDeps, {
 *             sources: ['bundle-1.deps.js', 'bundle-2.deps.js'],
 *             target: 'common-bundle.deps.js'
 *         }]);
 *         node.addTarget('common-bundle.deps.js');
 *     });
 * };
 */
module.exports = inherit(BaseTech, {
    getName: function () {
        return 'intersect-deps';
    },

    configure: function () {
        var node = this.node,
            target = this.getOption('target', node.getTargetName('deps.js')),
            sources = this.getRequiredOption('sources');

        this._target = node.unmaskTargetName(target);
        this._sources = sources.map(function (source) {
            return node.unmaskTargetName(source);
        });
    },

    getTargets: function () {
        return [this._target];
    },

    build: function () {
        var node = this.node,
            target = this._target,
            sources = this._sources,
            cache = node.getNodeCache(target),
            targetFilename = node.resolvePath(target),
            sourceFilenames = sources.map(function (sourceTarget) {
                return node.resolvePath(sourceTarget);
            });

        return node.requireSources(sources)
            .then(function (sourceDeps) {
                var rebuildNeeded = cache.needRebuildFile('deps-file', targetFilename);

                if (!rebuildNeeded) {
                    sourceFilenames.forEach(function (filename) {
                        if (cache.needRebuildFile(filename, filename)) {
                            rebuildNeeded = true;
                        }
                    });
                }

                if (rebuildNeeded) {
                    return vow.all(sourceDeps.map(function (source, i) {
                            if (source) {
                                return getDeps(source);
                            }

                            var filename = sourceFilenames[i];

                            clearRequire(filename);
                            return asyncRequire(filename)
                                .then(function (res) {
                                    return getDeps(res);
                                });
                        }))
                        .then(function (sourceDeps) {
                            var intersectedDeps = deps.intersect(sourceDeps),
                                str = 'exports.deps = ' + JSON.stringify(intersectedDeps, null, 4) + ';';

                            return vfs.write(targetFilename, str, 'utf-8')
                                .then(function () {
                                    cache.cacheFileInfo('deps-file', targetFilename);
                                    sourceFilenames.forEach(function (filename) {
                                        cache.cacheFileInfo(filename, filename);
                                    });
                                    node.resolveTarget(target, { deps: intersectedDeps });
                                });
                        });
                } else {
                    node.isValidTarget(target);
                    clearRequire(targetFilename);

                    return asyncRequire(targetFilename)
                        .then(function (result) {
                            node.resolveTarget(target, result);
                            return null;
                        });
                }
            });
    }
});

function getDeps(source) {
    if (source.blocks) {
        return deps.fromBemdecl(source.blocks);
    }

    return Array.isArray(source) ? source : source.deps;
}
