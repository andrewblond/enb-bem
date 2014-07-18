/**
 * Level
 * =====
 */
var inherit = require('inherit');
var path = require('path');
var vow = require('vow');
var naming = require('bem-naming');
var vfs = require('enb/lib/fs/async-fs');
var LevelBuilder = require('./level-builder');

/**
 * Level — объектная модель уровня переопределения.
 * @name Level
 */
module.exports = inherit({

    /**
     * Конструктор.
     * @param {String} path Путь к уровню переопределения.
     * @param {Function} [schemeBuilder]
     */
    __constructor: function (path, schemeBuilder) {
        this._path = path;
        this.blocks = {};
        this._loadDeferred = vow.defer();
        this._schemeBuilder = schemeBuilder;
    },

    /**
     * Загружает из кэша.
     */
    loadFromCache: function (data) {
        this.blocks = data;
        this._loadDeferred.resolve(this);
    },

    /**
     * Возвращает структуру блоков.
     * @returns {Object}
     */
    getBlocks: function () {
        return this.blocks;
    },

    /**
     * Проверяет наличие блока с указанным именем.
     * @param blockName
     * @returns {Boolean}
     */
    hasBlock: function (blockName) {
        return this.blocks[blockName];
    },

    /**
     * Возвращает абсолютный путь к уровню переопределения.
     * @returns {String}
     */
    getPath: function () {
        return this._path;
    },

    /**
     * Загружает уровень перепределения: загружает структуру блоков, элементов и модификаторов.
     */
    load: function () {
        var deferred = this._loadDeferred;
        var promise = deferred.promise();
        if (promise.isFulfilled()) {
            return promise;
        }

        var _this = this;
        if (this._schemeBuilder) {
            var levelBuilder = new LevelBuilder();
            vow.when(this._schemeBuilder.buildLevel(this._path, levelBuilder)).then(function () {
                _this.blocks = levelBuilder.getBlocks();
                deferred.resolve(_this);
            });
        } else {
            scan(this._path, function (fileInfo) {
                var dirname = path.basename(path.dirname(fileInfo.fullname));
                var bemname = fileInfo.name.split('.')[0];
                var notation = naming.parse(bemname);

                if (notation &&
                    naming.isBlock(notation) && dirname === notation.block ||
                    naming.isElem(notation) && dirname === '__' + notation.elem ||
                    (naming.isBlockMod(notation) || naming.isElemMod(notation)) && dirname === '_' + notation.modName
                )  {
                    var collectionKey = fileInfo.isDirectory ? 'dirs' : 'files';
                    var block = _this.blocks[notation.block] || (_this.blocks[notation.block] = {
                        name: notation.block,
                        files: [],
                        dirs: [],
                        elements: {},
                        mods: {}
                    });
                    var dest = block;

                    if (notation.elem) {
                        dest = block.elements[notation.elem] || (block.elements[notation.elem] = {
                            name: notation.elem,
                            files: [],
                            dirs: [],
                            mods: {}
                        });
                    }

                    if (notation.modName) {
                        var mod = dest.mods[notation.modName] || (dest.mods[notation.modName] = {});
                        var modVals = (mod[notation.modVal] || (mod[notation.modVal] = {files: [], dirs: []}));

                        modVals[collectionKey].push(fileInfo);
                    } else {
                        dest[collectionKey].push(fileInfo);
                    }
                }
            })
            .then(function () {
                deferred.resolve(_this);
            });
        }

        return promise;
    }
});

function scan(dirname, callback) {
    return vfs.listDir(dirname)
        .then(function (dirlist) {
            return vow.all(dirlist.filter(function (filename) {
                return filename.charAt(0) !== '.';
            }).map(function (basename) {
                var filename = path.join(dirname, basename);

                return vfs.stats(filename)
                    .then(function (stat) {
                        var isDirectory = stat.isDirectory();
                        var suffix = basename.split('.').slice(1).join('.');
                        var info = {
                            name: basename,
                            fullname: filename,
                            isDirectory: isDirectory,
                            suffix: suffix,
                            mtime: stat.mtime.getTime()
                        };

                        if (isDirectory) {
                            return scan(filename, callback)
                                .then(function (files) {
                                    info.files = files;

                                    callback(info);

                                    return info;
                                });
                        } else {
                            callback(info);

                            return info;
                        }
                    });
            }));
        });
}
