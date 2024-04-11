const typescript = require('@rollup/plugin-typescript');
const unassert = require('rollup-plugin-unassert');

module.exports = {
    input: 'src/index.ts',
    output: {
        dir: `dist`,
        format: 'esm'
    },
    plugins: [
        typescript(),
        unassert({
            include: '**/*.ts',
        })
    ]
}
