var deps = require('../../lib/deps/deps'),
    path = require('path'),
    Resolver = require('../../lib/deps/deps-resolver'),
    levels = {
        getModValues: function () {
            return ['val1', 'val2'];
        },
        getElemFiles: function (name) {
            return name === 'noFiles' ? [] : getFiles();
        },
        getBlockFiles: function () {
            return [];
        }
    },
    pathToFixtures = path.join('test', 'units', 'fixtures', 'deps'),
    resolver = new Resolver(levels);

function getFiles() {
    return [{
        fullname: path.resolve(pathToFixtures, 'mustDeps.deps.js'),
        suffix: 'deps.js'
    }, {
        fullname: path.resolve(pathToFixtures, 'shouldDeps.deps.js'),
        suffix: 'deps.js'
    }, {
        fullname: path.resolve(pathToFixtures, '*.deps.yaml'),
        suffix: 'deps.yaml'
    }, {
        fullname: path.resolve(pathToFixtures, 'blah.blah.js'),
        suffix: 'blah.js'
    }];
}

describe('units', function () {
    describe('\'deps.js\'', function () {
        it('must merge deps', function () {
            var firstDecl = [
                    { block: 'block1' },
                    { block: 'block1', mod: 'mod1', val: 'val1' },
                    { block: 'block1', elem: 'elem1' },
                    {}
                ],
                secondDecl = [
                    { block: 'block1' },
                    { block: 'block1', mod: 'mod1', val: 'val1' },
                    { block: 'block1', mod: 'mod2' }
                ],
                output = [
                    { block: 'block1' },
                    { block: 'block1', mod: 'mod1', val: 'val1' },
                    { block: 'block1', elem: 'elem1' },
                    {},
                    { block: 'block1', mod: 'mod2' }
                ];

            deps.merge([firstDecl, secondDecl]).must.be.eql(output);
        });

        it('must substract deps', function () {
            var firstDecl = [
                    { block: 'block1' },
                    { block: 'block1', mod: 'mod1', val: 'val1' },
                    { block: 'block1', elem: 'elem1' }
                ],
                secondDecl = [
                    { block: 'block1' },
                    { block: 'block1', mod: 'mod1', val: 'val1' },
                    { block: 'block1', mod: 'mod2' }
                ],
                output = [
                    { block: 'block1', elem: 'elem1' }
                ];

            deps.subtract(firstDecl, secondDecl).must.be.eql(output);
        });

        it('must transform bemdecl to deps', function () {
            var input = [{
                    name: 'block1',
                    mods: [
                        { name: 'mod1', vals: [{ name: 'val1' }, { name: 'val2' }] },
                        { name: 'mod2' }
                    ],
                    elems: [
                        { name: 'elem1' },
                        { name: 'elem2', mods: [{ name: 'val3' }] },
                        { name: 'elem3', mods: [{ name: 'mod4', vals: [{ name: 'val4' }] }] }]
                }, {
                    name: 'block2',
                    mod: 'mod',
                    elem: 'elem'
                }],
                output = [
                    { block: 'block1' },
                    { block: 'block1', mod: 'mod1', val: 'val1' },
                    { block: 'block1', mod: 'mod1', val: 'val2' },
                    { block: 'block1', elem: 'elem1' },
                    { block: 'block1', elem: 'elem2' },
                    { block: 'block1', elem: 'elem3' },
                    { block: 'block1', elem: 'elem3', mod: 'mod4', val: 'val4' },
                    { block: 'block2' }
                ];

            deps.fromBemdecl(input).must.be.eql(output);
        });

        it('must return empty deps', function () {
            deps.fromBemdecl().must.be.eql([]);
        });

        it('must transform deps to bemdecl', function () {
            var input = [
                    { block: 'block1' },
                    { block: 'block1', mod: 'mod1' },
                    { block: 'block1', mod: 'mod1', val: 'val1' },
                    { block: 'block1', elem: 'elem1' },
                    { block: 'block1', elem: 'elem1', mod: 'mod2' },
                    { block: 'block1', elem: 'elem1', mod: 'mod2', val: 'val2' }
                ],
                output = [
                    { name: 'block1' },
                    { name: 'block1', mods: [{ name: 'mod1' }] },
                    { name: 'block1', mods: [{ name: 'mod1', vals: [{ name: 'val1' }] }] },
                    { name: 'block1', elems: [{ name: 'elem1' }] },
                    { name: 'block1', elems: [{ name: 'elem1', mods: [{ name: 'mod2' }] }] },
                    { name: 'block1', elems: [{ name: 'elem1', mods: [{ name: 'mod2', vals: [{ name: 'val2' }] }] }] }
                ];

            deps.toBemdecl(input).must.be.eql(output);
        });

        it('must return emty bemdecl', function () {
            deps.toBemdecl().must.be.eql([]);
        });

        it('must convert empty shortcut', function () {
            deps.flattenDep({}, 'block1').must.be.eql([{ block: 'block1' }]);
        });

        it('must convert shortcut given as string', function () {
            deps.flattenDeps('block1').must.be.eql([{ block: 'block1' }]);
        });

        it('must convert shortcuts', function () {
            var input = [
                    { block: 'block1', elem: 'elem1', mods: { mod1: [ 'val1', 'val2'], mod2: 'val3' } },
                    { block: 'block1', elem: 'elem1', mod: 'mod1', val: 'val2' },
                    { block: 'block1', elem: 'elem1', mod: 'mod2' },
                    { block: 'block1', elem: 'elem1' },
                    { block: 'block1', mods: { mod1: ['val1', 'val2'], mod2: 'val3' } },
                    { block: 'block1', elems: [{ elem: 'elem1', mods: { mod1: ['val1', 'val2'], mod2: 'val3' } }] },
                    { block: 'block1', elems: ['elem1', 'elem2'] },
                    { block: 'block1', elems: 'elem1' },
                    { block: 'block1', elems: [{ elem: 'elem1', mods: undefined }] },
                    { block: 'block1', mod: 'mod2', val: 'val3' },
                    { block: 'block1', mod: 'mod2' },
                    { block: 'block1', elems: 'elem1', tech: 'tech1' }
                ],
                output = [
                    { block: 'block1', elem: 'elem1', mod: 'mod1', val: 'val1' },
                    { block: 'block1', elem: 'elem1', mod: 'mod1', val: 'val2' },
                    { block: 'block1', elem: 'elem1', mod: 'mod2', val: 'val3' },
                    { block: 'block1', elem: 'elem1', mod: 'mod1', val: 'val2' },
                    { block: 'block1', elem: 'elem1', mod: 'mod2' },
                    { block: 'block1', elem: 'elem1' },
                    { block: 'block1', mod: 'mod1', val: 'val1' },
                    { block: 'block1', mod: 'mod1', val: 'val2' },
                    { block: 'block1', mod: 'mod2', val: 'val3' },
                    { block: 'block1' },
                    { block: 'block1', elem: 'elem1' },
                    { block: 'block1', elem: 'elem1', mod: 'mod1', val: 'val1' },
                    { block: 'block1', elem: 'elem1', mod: 'mod1', val: 'val2' },
                    { block: 'block1', elem: 'elem1', mod: 'mod2', val: 'val3' },
                    { block: 'block1' },
                    { block: 'block1', elem: 'elem1' },
                    { block: 'block1', elem: 'elem2' },
                    { block: 'block1' },
                    { block: 'block1', elem: 'elem1' },
                    { block: 'block1' },
                    { block: 'block1', elem: 'elem1' },
                    { block: 'block1', mod: 'mod2', val: 'val3' },
                    { block: 'block1', mod: 'mod2' },
                    { block: 'block1', tech: 'tech1' },
                    { block: 'block1', elem: 'elem1', tech: 'tech1' }
                ];

            deps.flattenDeps(input).must.be.eql(output);
        });
    });

    describe('\'deps-resolver.js\'', function () {
        it('must normalize shortcuts', function () {
            var input = [
                    { block: 'block1', elem: 'elem1', mods: { mod1: ['val1', 'val2'], mod2: 'val3' } },
                    { block: 'block1', elem: 'elem1', mod: 'mod1', val: 'val1' },
                    { block: 'block1', elem: 'elem1' },
                    { block: 'block1', mod: 'mod2', val: 'val3' },
                    { block: 'block1', mods: { mod1: '*', mod2: 'val4' } },
                    { block: 'block1', elems: [{ elem: 'elem1', mods: { mod1: ['val1', 'val2'], mod2: 'val3' } }] },
                    { block: 'block1', elems: ['elem1', 'elem2'] },
                    { block: 'block1', elems: 'elem1' },
                    { block: 'block1' },
                    { block: 'block1', elems: 'elem1', required: true },
                    'block1'
                ],
                output = [
                    { name: 'block1', elem: 'elem1', modName: 'mod1', modVal: 'val1' },
                    { name: 'block1', elem: 'elem1', modName: 'mod1', modVal: 'val2' },
                    { name: 'block1', elem: 'elem1', modName: 'mod2', modVal: 'val3' },
                    { name: 'block1', elem: 'elem1', modName: 'mod1', modVal: 'val1' },
                    { name: 'block1', elem: 'elem1' },
                    { name: 'block1', modName: 'mod2', modVal: 'val3' },
                    { name: 'block1', modName: 'mod1', modVal: 'val1' },
                    { name: 'block1', modName: 'mod1', modVal: 'val2' },
                    { name: 'block1', modName: 'mod2', modVal: 'val4' },
                    { name: 'block1' },
                    { name: 'block1', elem: 'elem1' },
                    { name: 'block1', elem: 'elem1', modName: 'mod1', modVal: 'val1' },
                    { name: 'block1', elem: 'elem1', modName: 'mod1', modVal: 'val2' },
                    { name: 'block1', elem: 'elem1', modName: 'mod2', modVal: 'val3' },
                    { name: 'block1' },
                    { name: 'block1', elem: 'elem1' },
                    { name: 'block1', elem: 'elem2' },
                    { name: 'block1' },
                    { name: 'block1', elem: 'elem1' },
                    { name: 'block1' },
                    { name: 'block1', required: true },
                    { name: 'block1', elem: 'elem1', required: true },
                    { name: 'block1' }
                ];

            resolver.normalizeDeps(input).must.be.eql(output);
        });

        it('must normalize shortcuts when \'blockName\' is predefined', function () {
            var input = [
                    { elem: 'elem1', mod: 'mod1', val: 'val1' },
                    { elem: 'elem1', mods: { size: 'val4' } },
                    { elem: 'elem1' },
                    { mod: 'size', val: 'val3' },
                    { mods: { mod1: '*', size: 'val4' } },
                    { elems: [{ elem: 'elem1', mods: { mod1: ['val1', 'val2'], size: 'val3' } }] },
                    { elems: ['elem1', 'elem2'] },
                    { elems: 'elem1' },
                    { elems: [{ elem: 'elem1', mods: undefined }] },
                    {}
                ],
                output = [
                    { name: 'block1', elem: 'elem1', modName: 'mod1', modVal: 'val1' },
                    { name: 'block1', elem: 'elem1', modName: 'size', modVal: 'val4' },
                    { name: 'block1', elem: 'elem1' },
                    { name: 'block1', modName: 'size', modVal: 'val3' },
                    { name: 'block1', modName: 'mod1', modVal: 'val1' },
                    { name: 'block1', modName: 'mod1', modVal: 'val2' },
                    { name: 'block1', modName: 'size', modVal: 'val4' },
                    { name: 'block1' },
                    { name: 'block1', elem: 'elem1' },
                    { name: 'block1', elem: 'elem1', modName: 'mod1', modVal: 'val1' },
                    { name: 'block1', elem: 'elem1', modName: 'mod1', modVal: 'val2' },
                    { name: 'block1', elem: 'elem1', modName: 'size', modVal: 'val3' },
                    { name: 'block1' },
                    { name: 'block1', elem: 'elem1' },
                    { name: 'block1', elem: 'elem2' },
                    { name: 'block1' },
                    { name: 'block1', elem: 'elem1' },
                    { name: 'block1' },
                    { name: 'block1', elem: 'elem1' },
                    { name: 'block1' }
                ];

            resolver.normalizeDeps(input, 'block1').must.be.eql(output);
        });

        it('must normalize shortcuts when \'blockName\' and \'elemName\' are predefined', function () {
            var input = { mods: { mod1: '*', mod2: 'val3' } },
                output = [
                    { name: 'block1', elem: 'elem1', modName: 'mod1', modVal: 'val1' },
                    { name: 'block1', elem: 'elem1', modName: 'mod1', modVal: 'val2' },
                    { name: 'block1', elem: 'elem1', modName: 'mod2', modVal: 'val3' }
                ];

            resolver.normalizeDeps(input, 'block1', 'elem1').must.be.eql(output);
        });

        it('must get deps not from files', function () {
            var inputs = [
                    { name: 'noFiles' },
                    { name: 'noFiles', elem: 'elem1', modName: 'mod1' },
                    { name: 'noFiles', elem: 'elem1', modName: 'mod1', modVal: 'val1' },
                    { name: 'noFiles', modName: 'mod1' },
                    { name: 'noFiles', modName: 'mod1', modVal: 'val1' }
                ],
                outputs = [{
                    mustDeps: [],
                    shouldDeps: []
                }, {
                    mustDeps: [{ name: 'noFiles', elem: 'elem1', key: 'noFiles__elem1' }],
                    shouldDeps: []
                }, {
                    mustDeps: [
                        { name: 'noFiles', elem: 'elem1', key: 'noFiles__elem1' },
                        { name: 'noFiles', elem: 'elem1', modName: 'mod1', key: 'noFiles__elem1_mod1' }
                    ],
                    shouldDeps: []
                }, {
                    mustDeps: [{ name: 'noFiles', key: 'noFiles' }],
                    shouldDeps: []
                }, {
                    mustDeps: [
                        { name: 'noFiles', key: 'noFiles' },
                        { name: 'noFiles', modName: 'mod1', key: 'noFiles_mod1' }
                    ],
                    shouldDeps: []
                }];

            for (var i = 0; i < inputs.length; i++) {
                resolver.getDeps(inputs[i])._value.must.be.eql(outputs[i]);
            }
        });

        it('must get deps from files', function (done) {
            var input = { name: 'block1', elem: 'elem1', modName: 'mod1', modVal: 'val1' },
                output = {
                    mustDeps: [
                        { name: 'block1', elem: 'elem1', key: 'block1__elem1' },
                        { name: 'block1', elem: 'elem1', modName: 'mod1', key: 'block1__elem1_mod1' },
                        { name: 'block2', key: 'block2' },
                        { name: 'block2', elem: 'elem2', key: 'block2__elem2' },
                        { name: 'block2', elem: 'elem3', key: 'block2__elem3' },
                        { name: 'block4', key: 'block4', required: true, }
                    ],
                    shouldDeps: [
                        { name: 'block1', key: 'block1' },
                        { name: 'block1', elem: 'elem4', key: 'block1__elem4' }
                    ]
                };

            resolver.getDeps(input)
                .then(function (value) {
                    value.must.be.eql(output);
                })
                .then(done, done);
        });

        it('must add declarations', function (done) {
            var input = [
                    { name: 'noFiles', elem: 'elem1', modName: 'mod1', modVal: 'val1' },
                    { name: 'noFiles', modName: 'mod1', modVal: 'val1' }
                ],
                output = [{
                    name: 'noFiles',
                    elem: 'elem1',
                    modName: 'mod1',
                    modVal: 'val1',
                    key: 'noFiles__elem1_mod1_val1',
                    deps: {},
                    depCount: 2
                }, {
                    name: 'noFiles',
                    elem: 'elem1',
                    key: 'noFiles__elem1',
                    deps: {},
                    depCount: 0
                }, {
                    name: 'noFiles',
                    elem: 'elem1',
                    modName: 'mod1',
                    key: 'noFiles__elem1_mod1',
                    deps: {},
                    depCount: 1
                }, {
                    name: 'noFiles',
                    modName: 'mod1',
                    modVal: 'val1',
                    key: 'noFiles_mod1_val1',
                    deps: {},
                    depCount: 2
                }, {
                    name: 'noFiles',
                    key: 'noFiles',
                    deps: {},
                    depCount: 0
                }, {
                    name: 'noFiles',
                    modName: 'mod1',
                    key: 'noFiles_mod1',
                    deps: {},
                    depCount: 1
                }];

            output[0].deps['noFiles__elem1'] = true;
            output[0].deps['noFiles__elem1_mod1'] = true;
            output[2].deps['noFiles__elem1'] = true;
            output[3].deps['noFiles'] = true;
            output[3].deps['noFiles_mod1'] = true;
            output[5].deps['noFiles'] = true;

            resolver.addDecls(input)
                .then(function () {
                    resolver.declarations.must.be.eql(output);
                })
                .then(done, done);
        });

        it('must resolve deps', function () {
            var output = [
                    { block: 'noFiles', elem: 'elem1' },
                    { block: 'noFiles', elem: 'elem1', mod: 'mod1' },
                    { block: 'noFiles' },
                    { block: 'noFiles', mod: 'mod1' },
                    { block: 'noFiles', elem: 'elem1', mod: 'mod1', val: 'val1' },
                    { block: 'noFiles', mod: 'mod1', val: 'val1' }
                ];

            resolver.resolve().must.eql(output);
        });

        it('must add block with mod', function (done) {
            resolver = new Resolver(levels);
            var output = [{
                    name: 'noFiles',
                    modName: 'mod1',
                    modVal: 'val1',
                    key: 'noFiles_mod1_val1',
                    deps: {},
                    depCount: 2
                }, {
                    name: 'noFiles',
                    key: 'noFiles',
                    deps: {},
                    depCount: 0
                }, {
                    name: 'noFiles',
                    modName: 'mod1',
                    key: 'noFiles_mod1',
                    deps: {},
                    depCount: 1
                }];

                output[0].deps['noFiles'] = true;
                output[0].deps['noFiles_mod1'] = true;
                output[2].deps['noFiles'] = true;

            resolver.addBlock('noFiles', 'mod1', 'val1')
                .then(function () {
                    resolver.declarations.must.be.eql(output);
                })
                .then(done, done);
        });

        it('must add block without mod', function (done) {
            resolver = new Resolver(levels);

            resolver.addBlock('noFiles')
                .then(function () {
                    resolver.declarations.must.be.eql([{ name: 'noFiles', key: 'noFiles', deps: {}, depCount: 0 }]);
                })
                .then(done, done);
        });

        it('must add elem with mod', function (done) {
            resolver = new Resolver(levels);
            var output = [{
                    name: 'noFiles',
                    elem: 'elem1',
                    modName: 'mod1',
                    modVal: 'val1',
                    key: 'noFiles__elem1_mod1_val1',
                    deps: {},
                    depCount: 2
                }, {
                    name: 'noFiles',
                    elem: 'elem1',
                    key: 'noFiles__elem1',
                    deps: {},
                    depCount: 0
                }, {
                    name: 'noFiles',
                    elem: 'elem1',
                    modName: 'mod1',
                    key: 'noFiles__elem1_mod1',
                    deps: {},
                    depCount: 1
                }];

            output[0].deps['noFiles__elem1'] = true;
            output[0].deps['noFiles__elem1_mod1'] = true;
            output[2].deps['noFiles__elem1'] = true;

            resolver.addElem('noFiles', 'elem1', 'mod1', 'val1')
                .then(function () {
                    resolver.declarations.must.be.eql(output);
                })
                .then(done, done);
        });

        it('must add elem without mod', function (done) {
            resolver = new Resolver(levels);
            var output = [{ name: 'noFiles', elem: 'elem1', key: 'noFiles__elem1', deps: {}, depCount: 0 }];

            resolver.addElem('noFiles', 'elem1')
                .then(function () {
                    resolver.declarations.must.be.eql(output);
                })
                .then(done, done);
        });
    });
});
