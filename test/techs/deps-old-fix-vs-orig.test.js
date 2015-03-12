var vow = require('vow'),
    mockFs = require('mock-fs'),
    TestNode = require('enb/lib/test/mocks/test-node'),
    levelsTech = require('../../techs/levels'),
    oldDepsTechOrig = require('../../techs/deps-old-orig'),
    oldDepsTechFix = require('../../techs/deps-old'),
    DepsGraph = require('../../lib/deps/deps-graph'),
    stat = {
        fails: 0,
        total: 0,
        diffs: [],
        log: function () {
            console.log('deps differ in ' + this.fails + ' of ' + this.total + ' cases');
            var d = this.diffs;
            d.sort(function (a, b) { return a - b; });
            console.log('min: ' + d[0]);
            console.log('1st qu.: ' + d[Math.floor(d.length / 4)]);
            console.log('median: ' + d[Math.floor(d.length / 2)]);
            console.log('mean: ' + (d.reduce(function (a, b) { return a + b; }) / d.length));
            console.log('3rd qu.: ' + d[Math.floor(d.length * 3 / 4)]);
            console.log('max: ' + d[d.length - 1]);
        }
    };

describe('techs', function () {
    describe('deps-old', function () {
        afterEach(function () {
            mockFs.restore();
        });

        describe(
            'property-based testing: fixed deps-old return deps in same order as original deps-old ' +
            'IFF no rollback happens during deps resolving',
            function () {
                after(stat.log.bind(stat));

                [5, 10, 20, 50].forEach(function (nodes) {
                    for (var edges = 5; edges <= 100; edges += 5) {
                        for (var rate = 0; rate <= 100; rate += 5) {
                            var mustEdges = Math.floor(edges * rate / 100);
                            createTestCase(nodes, mustEdges, edges - mustEdges);
                        }
                    }
                });

                var bemdecl = [{ name: 'A' }];

                function createTestCase(nodes, must, should) {
                    it('nodes: ' + nodes + ', mustDeps: ' + must + ', shouldDeps: ' + should, function (done) {
                        var graph = DepsGraph.random(nodes, must, should, 'case-' + [nodes, must, should].join('-'));
                        if (graph) {
                            compareResult(graph, bemdecl, done);
                        } else {
                            done();
                        }
                    });
                }
            }
        );
    });
});

function getResults(tech, fsScheme, bemdecl) {
    var levels = Object.keys(fsScheme),
        fsBundle, dataBundle;

    fsScheme['fs-bundle'] = {
        'fs-bundle.bemdecl.js': 'exports.blocks = ' + JSON.stringify(bemdecl) + ';'
    };
    fsScheme['data-bundle'] = {};

    mockFs(fsScheme);

    fsBundle = new TestNode('fs-bundle');
    dataBundle = new TestNode('data-bundle');

    dataBundle.provideTechData('?.bemdecl.js', { blocks: bemdecl });

    return fsBundle.runTech(levelsTech, { levels: levels })
        .then(function (levels) {
            fsBundle.provideTechData('?.levels', levels);
            dataBundle.provideTechData('?.levels', levels);

            return vow.all([
                fsBundle.runTechAndRequire(tech),
                fsBundle.runTechAndGetResults(tech),
                dataBundle.runTechAndRequire(tech),
                dataBundle.runTechAndGetResults(tech)
            ]);
        })
        .spread(function (res1, res2, res3, res4) {
            var rollbackHappened = false,
                result = [
                res1[0].deps, res2['fs-bundle.deps.js'].deps,
                res3[0].deps, res4['data-bundle.deps.js'].deps
            ];
            result.forEach(function (deps) {
                if (deps.rollbackHappened) {
                    rollbackHappened = true;
                    delete deps.rollbackHappened;
                }
            });
            if (rollbackHappened) {
                result.rollbackHappened = true;
            }
            return result;
        });
}

function compareResult(graph, bemdecl, done) {
    var fsScheme = graph.toTestScheme();
    vow.all([
        getResults(oldDepsTechOrig, fsScheme, bemdecl),
        getResults(oldDepsTechFix, fsScheme, bemdecl)
    ]).spread(function (origResult, fixResult) {
        if (fixResult.rollbackHappened) {
            delete fixResult.rollbackHappened;
            origResult.must.not.eql(fixResult);
            stat.fails++;
            var results = [origResult, fixResult].map(convertToObjResult);
            isCorrect(graph, results[0]).must.be(false);
            isCorrect(graph, results[1]).must.be(true);
            stat.diffs.push(countDifferences(results[0], results[1]));
        } else {
            origResult.must.eql(fixResult);
            isCorrect(graph, convertToObjResult(fixResult)).must.be(true);
        }
        stat.total++;
        done();
    });
}

function convertToObjResult(result) {
    var objResult = {};
    result[1].forEach(function (dep, idx) {
        objResult[dep.block] = idx;
    });
    return objResult;
}

function isCorrect(graph, result) {
    return Object.keys(graph.must).every(function (id) {
        var name = DepsGraph.idToName(id);
        return result.hasOwnProperty(name) && Object.keys(graph.must[id]).every(function (mustId) {
            var mustName = DepsGraph.idToName(mustId);
            return result.hasOwnProperty(mustName) && result[mustName] < result[name];
        });
    }) && Object.keys(graph.should).every(function (id) {
        var name = DepsGraph.idToName(id);
        return result.hasOwnProperty(name) && Object.keys(graph.should[id]).every(function (shouldId) {
            var shouldName = DepsGraph.idToName(shouldId);
            return result.hasOwnProperty(shouldName);
        });
    });
}

function countDifferences(orig, fix) {
    var count = 0;
    Object.keys(orig).forEach(function (block) {
        var fi = fix[block],
            oi = orig[block];
        if (fi === -1) { throw Error('different array contents'); }
        if (fi < oi) { count += oi - fi; }
    });
    return count;
}
