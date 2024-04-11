const typescript = require('@rollup/plugin-typescript');
const nodePolyfills = require('rollup-plugin-polyfill-node');

module.exports = {
    input: 'src/index.ts',
    output: {
        dir: `dist`,
        format: 'esm'
    },
    plugins: [typescript(), nodePolyfills()]
}
