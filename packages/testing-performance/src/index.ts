import { Chance } from 'chance'
import { generateRandomLayers } from './utils'
import * as protos from 'pbw-moon-testing-protos'
import { Writer } from 'pbw-moon'

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

const btnBenchOffical = document.createElement('button')
const textBenchOffical = document.createElement('div')
const btnBenchCustom = document.createElement('button')
const textBenchCustom = document.createElement('div')

setupBench('Offical', btnBenchOffical, textBenchOffical, benchOfficalImpl)
setupBench('Custom', btnBenchCustom, textBenchCustom, benchCustomImpl)