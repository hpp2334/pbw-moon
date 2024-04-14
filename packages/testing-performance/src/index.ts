import { Chance } from 'chance'
import { generateRandomLayers } from './utils'
import * as protos from 'pbw-moon-testing-protos'
import { Writer } from 'pbw-moon'
import { newSuite } from './suite'
// @ts-ignore
import benchPayloadUrl from './payloads/bench.json.raw'
// @ts-ignore
import partialSketchPayloadUrl from './payloads/partialSketch.bin.raw'

const generateLayer = () => {
    const chance = new Chance(0)
    return generateRandomLayers(chance, {
        layerCount: 5 * 1000,
        fillsCount: [2, 300],
        link: 80,
    })
}

const benchOfficalImpl = () => {
    const p = generateLayer()

    const start = performance.now()
    protos.partialsketch.Layer.encode(p).finish()
    const end = performance.now()
    return end - start
}

const benchCustomImpl = () => {
    const p = generateLayer()

    const start = performance.now()
    protos.partialsketch.Layer.encode(p, new Writer()).finish()
    const end = performance.now()
    return end - start
}

const setupBench = (scope: string, btn: HTMLButtonElement, textDiv: HTMLDivElement, benchImpl: () => number) => {
    textDiv.innerText = 'Wait...'
    btn.innerText = scope

    btn.addEventListener('click', () => {
        textDiv.innerText = "Executing..."
        setTimeout(() => {
            const time = benchImpl()
            textDiv.innerText = `${time} ms`
        }, 100)
    })

    const container = document.body
    container.append(btn)
    container.append(textDiv)
}

const setupBenchmarkSuite = (btn: HTMLButtonElement, textDiv: HTMLDivElement) => {
    btn.innerText = 'Benchmark Suite'
    textDiv.innerText = 'Wait...'
    btn.addEventListener('click', async () => {
        textDiv.innerText = ''

        const _benchMessagePayload = await fetch(benchPayloadUrl).then(resp => resp.text())
        const _partialSketchMessagePayload = await fetch(partialSketchPayloadUrl).then(resp => resp.blob()).then(blob => blob.arrayBuffer()).then(bytes => new Uint8Array(bytes))

        const benchMessagePayload = JSON.parse(_benchMessagePayload)
        const partialSketchMessagePayload = protos.partialsketch.Layer.decode(_partialSketchMessagePayload)

        const log = (msg: string) => {
            const t = document.createElement('div')
            t.innerText = msg
            textDiv.append(t)
        }

        newSuite("encoding - bench", log)
            .add("[offical] protobuf.js (static)", function () {
                protos.Test.encode(benchMessagePayload).finish();
            })
            .add("[pbw-moon] protobuf.js (static)", function () {
                protos.Test.encode(benchMessagePayload, new Writer()).finish();
            })
            .run();


        newSuite("encoding - partialSketch", log)
            .add("[offical] protobuf.js (static)", function () {
                protos.partialsketch.Layer.encode(partialSketchMessagePayload).finish();
            })
            .add("[pbw-moon] protobuf.js (static)", function () {
                protos.partialsketch.Layer.encode(partialSketchMessagePayload, new Writer()).finish();
            })
            .run();

    })

    const container = document.body
    container.append(btn)
    container.append(textDiv)
}

const btnBenchOffical = document.createElement('button')
const textBenchOffical = document.createElement('div')
const btnBenchCustom = document.createElement('button')
const textBenchCustom = document.createElement('div')
const btnBenchmarkSuite = document.createElement('button')
const textBenchmarkSuite = document.createElement('div')

setupBench('Offical', btnBenchOffical, textBenchOffical, benchOfficalImpl)
setupBench('Custom', btnBenchCustom, textBenchCustom, benchCustomImpl)
setupBenchmarkSuite(btnBenchmarkSuite, textBenchmarkSuite)