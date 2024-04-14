

import { newSuite } from './suite'
import { Writer } from 'pbw-moon'
import * as protos from 'pbw-moon-testing-protos'

// payloads
import { readFileSync } from 'fs'
import path from 'path'

const benchMessagePayload = JSON.parse(readFileSync(path.resolve(__dirname, './data/bench.json'), 'utf-8'))

newSuite("encoding")
    .add("[offical] protobuf.js (static) - bench", function () {
        protos.Test.encode(benchMessagePayload).finish();
    })
    .add("[pbw-moon] protobuf.js (static) - bench", function () {
        protos.Test.encode(benchMessagePayload, new Writer()).finish();
    })
    .run();

