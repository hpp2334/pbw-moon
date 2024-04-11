const typescript = require('@rollup/plugin-typescript');
const nodeResolve = require("@rollup/plugin-node-resolve");
const commonjs = require("@rollup/plugin-commonjs")

module.exports = {
    input: './src/index.ts',
    output: {
        dir: `./dist`,
        format: 'esm'
    },
    plugins: [typescript(), commonjs({
        include: /node_modules/
    }), nodeResolve({
        preferBuiltins: false,
    }),]
}
