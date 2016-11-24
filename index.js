module.exports = {
    levels: require('./techs/levels'),
    levelsToBemdecl: require('./techs/levels-to-bemdecl'),

    bemjsonToBemdecl: require('./techs/bemjson-to-bemdecl'),

    deps: require('./techs/deps'),
    depsOld: require('./techs/deps-old'),
    depsByTechToBemdecl: require('./techs/deps-by-tech-to-bemdecl'),

    files: require('./techs/files'),

    provideBemdecl: require('./techs/provide-bemdecl'),
    provideDeps: require('./techs/provide-deps'),

    mergeBemdecl: require('./techs/merge-bemdecl'),
    mergeDeps: require('./techs/merge-deps'),

    intersectBemdecl: require('./techs/intersect-bemdecl'),
    intersectDeps: require('./techs/intersect-deps'),

    subtractDeps: require('./techs/subtract-deps')
};
