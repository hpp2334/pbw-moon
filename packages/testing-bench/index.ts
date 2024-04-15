import fs, { readFileSync } from "fs"
// @ts-ignore
import { Session } from 'node:inspector/promises'
import { Writer } from 'pbw-moon'
import * as protos from 'pbw-moon-testing-protos'
import path from "path"
import zlib from 'node:zlib'

// payloads

const benchPayloadPath = path.resolve(__dirname, './data/bench.json')
const partialSketchPayloadPath = path.resolve(__dirname, './data/partialSketch.bin.br')

const benchPayloadStr = readFileSync(benchPayloadPath, 'utf-8')
const partialSketchPayload = zlib.brotliDecompressSync(readFileSync(partialSketchPayloadPath))

const benchMessagePayload = JSON.parse(benchPayloadStr)
const partialSketchMessagePayload = protos.partialsketch.Layer.decode(partialSketchPayload)

// bench

const benchmark = (msg: string, f: () => void) => {
    console.log(msg)

    const startUsage = process.memoryUsage()
    const start = performance.now()
    f()
    const end = performance.now()
    const endUsage = process.memoryUsage()

    console.log('time', (end - start) / 1000 + ' s')
    console.log('heapTotal increase', (endUsage.heapTotal - startUsage.heapTotal) / 1024 / 1024 + ' MB')

    console.log()

    return {
        heapTotal: endUsage.heapTotal - startUsage.heapTotal,
        time: end - start
    }
}

const officalBench = benchmark(`[Offical] encode bench`, () => {
    for (var i = 0; i < 10000000; ++i)
        protos.partialsketch.Layer.encode(benchMessagePayload).finish()
})

const pbwmoonBench = benchmark(`[pbw-moon] encode bench`, () => {
    for (var i = 0; i < 10000000; ++i)
        protos.partialsketch.Layer.encode(benchMessagePayload, new Writer()).finish()
})

const officalPartialSketch = benchmark(`[Offical] encode partialSketch`, () => {
    protos.partialsketch.Layer.encode(partialSketchMessagePayload).finish()
})

const pbwmoonPartialSketch = benchmark(`[pbw-moon] encode partialSketch`, () => {
    protos.partialsketch.Layer.encode(partialSketchMessagePayload, new Writer()).finish()
})

// Verify
console.assert(pbwmoonBench.time / 4 < officalBench.time, 'bench time verify')
console.assert(pbwmoonBench.heapTotal < officalBench.heapTotal / 5, 'bench heapTotal verify')
console.assert(pbwmoonPartialSketch.time < officalPartialSketch.time / 2, 'partialSketch time verify')
console.assert(pbwmoonPartialSketch.heapTotal < officalPartialSketch.heapTotal / 20, 'partialSketch heapTotal verify')