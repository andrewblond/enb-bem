/**
 * Level
 * =====
 */
var inherit = require('inherit');
var vow = require('vow');
var LevelBuilder = require('./level-builder');
var scanner = require('./level-scanner');

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
            scanner.scan(_this._path, function (err, blocks) {
                _this.blocks = blocks;
                deferred.resolve(_this);
            });
        }

        return promise;
    }
});
