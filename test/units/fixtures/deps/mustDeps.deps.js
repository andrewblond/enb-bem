[{
    mustDeps : [
        { block: 'block1', elem: 'elem1' },
        { block : 'block2', elems : ['elem2', 'elem3'] },
        { block: 'block3' }
    ],
    noDeps: [
        { block: 'block3' }
    ]
},
{
    tech : 'spec.js',
    mustDeps : { tech : 'bemhtml', block : 'attach' }
}]
