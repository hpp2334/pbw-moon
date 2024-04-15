
const path = require("path");
const HtmlWebpackPlugin = require('html-webpack-plugin');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

const config = {
    mode: "production",
    entry: "./src/index.ts",
    devtool: "eval",
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.raw$/,
                type: 'asset/resource'
            }
        ],
    },
    output: {
        filename: 'index.js',
        path: path.resolve(__dirname, 'dist'),
    },
    resolve: {
        extensions: ['.ts', '.js', '.json'],
    },
    externals: {
        benchmark: 'benchmark',
    },
    plugins: [new HtmlWebpackPlugin(),
    new NodePolyfillPlugin()],
};

module.exports = config;