var path = require('path'),
    vow = require('vow'),
    mockFs = require('mock-fs'),
    TestNode = require('mock-enb/lib/mock-node'),
    Tech = require('../../techs/intersect-bemdecl');

describe('techs: intersect-bemdecl', function () {
    afterEach(function () {
        mockFs.restore();
    });

    it('must provide result', function () {
        var sources = [[{ name: 'block' }], [{ name: 'block' }]],
            bemdecl = [{ name: 'block' }];

        return assert(sources, bemdecl);
    });

    it('must provide result from cache', function () {
        mockFs({
            bundle: {
                'bundle.bemdecl.js': 'exports.blocks = ' + JSON.stringify([
                    { name: 'other-block' }
                ]) + ';',
                'bundle-1.bemdecl.js': 'exports.blocks = ' + JSON.stringify([{ name: 'block-1' }]) + ';',
                'bundle-2.bemdecl.js': 'exports.blocks = ' + JSON.stringify([{ name: 'block-2' }]) + ';'
            }
        });

        var bundle = new TestNode('bundle'),
            cache = bundle.getNodeCache('bundle.bemdecl.js'),
            sourcePath1 = path.resolve('bundle', 'bundle-1.bemdecl.js'),
            sourcePath2 = path.resolve('bundle', 'bundle-2.bemdecl.js');

        cache.cacheFileInfo('bemdecl-file', path.resolve('bundle', 'bundle.bemdecl.js'));
        cache.cacheFileInfo(sourcePath1, sourcePath1);
        cache.cacheFileInfo(sourcePath2, sourcePath2);

        return bundle.runTech(Tech, { sources: ['bundle-1.bemdecl.js', 'bundle-2.bemdecl.js'] })
            .then(function (target) {
                target.blocks.must.eql([{ name: 'other-block' }]);
            });
    });

    it('must support mods without vals', function () {
        var bemdecl1 = [{
                name: 'block-1',
                mods: [{ name: 'mod' }]
            }],
            bemdecl2 = [{
                name: 'block-1',
                mods: [{ name: 'mod' }]
            }, {
                name: 'block-2'
            }],
            exepted = [
                { name: 'block-1' },
                { name: 'block-1', mods: [{ name: 'mod' }] }
            ];

        return assert([bemdecl1, bemdecl2], exepted);
    });

    it('must intersect blocks with mods', function () {
        var bemdecl1 = [{
                name: 'block'
            }, {
                name: 'block',
                mods: [{ name: 'mod-name', vals: [{ name: 'mod-val' }] }]
            }, {
                name: 'block2'
            }],
            bemdecl2 = [{
                name: 'block'
            }, {
                name: 'block',
                mods: [{ name: 'mod-name', vals: [{ name: 'mod-val' }] }]
            }, {
                name: 'block3'
            }],
            exepted = [
                { name: 'block' },
                { name: 'block', mods: [{ name: 'mod-name', vals: [{ name: 'mod-val' }] }] }
            ];

        return assert([bemdecl1, bemdecl2], exepted);
    });
});

function assert(sources, expected) {
    var bundle,
        dir = {},
        options = { sources: [] };

    sources.forEach(function (bemdecl, i) {
        var target = i + '.bemdecl.js';

        dir[target] = 'exports.blocks = ' + JSON.stringify(bemdecl) + ';';
        options.sources.push(target);
    });

    mockFs({ bundle: dir });
    bundle = (new TestNode('bundle'));

    return vow.all([
            bundle.runTechAndGetResults(Tech, options),
            bundle.runTechAndRequire(Tech, options)
        ])
        .spread(function (target1, target2) {
            target1['bundle.bemdecl.js'].blocks.must.eql(expected);
            target2[0].blocks.must.eql(expected);
        });
}
