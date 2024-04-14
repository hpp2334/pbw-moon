

import { newSuite } from './suite'
import { Writer } from 'pbw-moon'
import * as protos from 'pbw-moon-testing-protos'

// payloads
import { readFileSync } from 'fs'
import path from 'path'

const benchMessagePayload = JSON.parse(readFileSync(path.resolve(__dirname, './data/bench.json'), 'utf-8'))
const partialSketchMessagePayload = protos.partialsketch.Layer.decode(readFileSync(path.resolve(__dirname, './data/partialSketch.bin')))

newSuite("encoding - bench")
    .add("[offical] protobuf.js (static)", function () {
        protos.Test.encode(benchMessagePayload).finish();
    })
    .add("[pbw-moon] protobuf.js (static)", function () {
        protos.Test.encode(benchMessagePayload, new Writer()).finish();
    })
    .run();


newSuite("encoding - partialSketch")
    .add("[offical] protobuf.js (static)", function () {
        protos.partialsketch.Layer.encode(partialSketchMessagePayload).finish();
    })
    .add("[pbw-moon] protobuf.js (static)", function () {
        protos.partialsketch.Layer.encode(partialSketchMessagePayload, new Writer()).finish();
    })
    .run();
