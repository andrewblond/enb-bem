var path = require('path');
var fs = require('fs');
var sep = path.sep;

exports.scan = function scanFiles(dir, opts, callback) {
    if (!callback) {
        callback = opts;
        opts = {};
    }

    dir = path.resolve(dir);

    if (!fs.existsSync(dir)) {
        return callback(new Error('Level does not exists "' + dir + '"'));
    }

    var blocks = {};
    var items = { push: push };
    var scanBlock = opts.scanner || scanElem;

    scanBlocks(dir, scanBlock, function (err) {
        if (err) { return callback(err); }
        callback(null, blocks);
    });

    function push(file, item) {
        var block = blocks[item.block] || (blocks[item.block] = {elems: {}, mods: {}, files: [], dirs: []});

        file.suffix = item.suffix[0] === '.' ? item.suffix.substr(1) : item.suffix;
        block.name = item.block;

        if (item.mod && !item.elem) {
            var blockVal = item.val || true;

            block = block.mods[item.mod] || (block.mods[item.mod] = {});
            block = block[blockVal] || (block[blockVal] = {files: [], dirs: []});
            block.name = item.mod;
        }

        if (item.elem) {
            block = block.elems[item.elem] || (block.elems[item.elem] = {mods: {}, files: [], dirs: []});
            block.name = item.elem;

            if (item.mod) {
                var elemVal = item.val || true;

                block = block.mods[item.mod] || (block.mods[item.mod] = {});
                block = block[elemVal] || (block[elemVal] = {files: [], dirs: []});
                block.name = item.mod;
            }
        }

        if (file.isDirectory) {
            file.files = [];

            block.dirs.push(file);
        } else {
            block.files.push(file);
        }
    }

    function scanBlocks(dir, scanner, callback) {
        scanner = scanner.bind(null);
        walk(dir, function (f, next) { scanner(f, null, items, next); }, callback);
    }

    function scanElem(block, elem, items, callback) {
        var blockPart = block.name;
        var dir = block.fullname;
        var elemName;

        if (elem) {
            elemName = elem.name;
            blockPart += elemName;
            dir = elem.fullname;
        }

        blockPart += '.';
        var blockPartL = blockPart.length;

        walk(dir, function (f, next) {
            var file = f.name;
            var isLooksGood = file.substr(0, blockPartL) === blockPart;

            if (!f.isDirectory && !isLooksGood) {
                next();
                return;
            }

            var suffix = file.substr(blockPartL - 1);
            var item = {
                block: block.name,
                suffix: suffix
            };

            if (elemName) {
                if (elemName.indexOf('__') === 0) { elemName = elemName.substr(2); }
                item.elem = elemName;
            }

            if (f.isDirectory) {
                if (isElemDir(file)) {
                    scanElem(block, f, items, next);
                    return;
                }
                if (isModDir(file)) {
                    scanMod(block, elem, f, items, next);
                    return;
                }
                if (!isLooksGood) {
                    next();
                    return;
                }

                items.push(f, item);

                walk(f.fullname, function (f, next) {
                    var suffix = (file + sep + f.name).substr(blockPartL - 1);
                    var item = {
                            block: block.name,
                            suffix: suffix
                        };

                    if (elemName) { item.elem = elemName; }

                    items.push(f, item);
                    next();

                }, next);
                return;
            }

            items.push(f, item);

            next();

        }, callback);
    }

    function scanMod(block, elem, mod, items, callback) {
        var blockPart = block.name + (elem ? elem.name : '') + mod.name;
        var blockPartL = blockPart.length;

        walk(mod.fullname, function (f, next) {
            var file = f.name;
            if (file.substr(0, blockPartL) !== blockPart) {
                next();
                return;
            }

            var modval = file.substr(blockPartL);
            var val;

            if (modval[0] === '_') { val = modval.substr(1); }

            var suffix = modval.substr(modval.indexOf('.'));
            var b = block.name;
            var m = mod.name.substr(1);
            var item = {
                block: b,
                mod: m,
                suffix: suffix
            };

            if (elem) { item.elem = elem.name.substr(2); }
            if (val) { item.val = val.substr(0, val.indexOf('.')); }

            items.push(f, item);

            if (f.isDirectory) {
                walk(f.fullname, function (f, next) {
                    var suffix = modval.substr(modval.indexOf('.')) + sep + f.name;
                    var item = {
                        block: b,
                        mod: m,
                        suffix: suffix
                    };

                    if (elem) { item.elem = elem.name.substr(2); }
                    if (val) { item.val = val.substr(0, val.indexOf('.')); }

                    items.push(f, item);

                    next();
                }, next);
                return;
            }

            next();
        }, callback);
    }
};

function walk(dir, onFile, done) {
    fs.readdir(dir, traverse);

    function traverse(err, files) {
        if (err) {
            done(err);
            return;
        }

        var pending = files.length;
        if (pending === 0) {
            done();
            return;
        }

        files.forEach(function (file) {
            if (file[0] === '.') {
                next();
                return;
            }

            var fullname = dir + sep + file;
            var stat = fs.statSync(fullname);

            onFile({
                name: path.basename(fullname),
                fullname: fullname,
                mtime: stat.mtime.getTime(),
                isDirectory: stat.isDirectory()
            }, next);
        });

        function next(err) {
            --pending === 0 && done(err);
        }
    }
}

function isElemDir(dir) {
    return dir.indexOf('__') === 0 && !~dir.indexOf('.');
}

function isModDir(dir) {
    return dir[0] === '_' && dir[1] !== '_';
}
