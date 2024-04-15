const { copyFileSync, readFileSync } = require('fs')
const path = require('path')
const ROOT = path.resolve(__dirname, '../')

// copy README.md
const README_PATH = path.resolve(ROOT, './README.md')
const OUTPUT_README_PATH = path.resolve(ROOT, './packages/core/README.md')
copyFileSync(README_PATH, OUTPUT_README_PATH)

// validate no assert code in bundle
const CODE_PATH = path.resolve(ROOT, './packages/core/dist/index.js')
const code = readFileSync(CODE_PATH, 'utf-8')
if (code.includes('assert')) {
    throw Error("pattern 'assert' in found in bundle")
}
