
import * as protos from 'pbw-moon-testing-protos'

export function generateRandomLayers(chance: Chance.Chance, opts: {
    layerCount: number,
    fillsCount: [number, number],
    /** 1 - 100 */
    link: number,
}): protos.partialsketch.Layer {
    if (opts.layerCount <= 0) {
        throw Error("layerCount is 0")
    }

    const generateFill = (): protos.partialsketch.Fill => {
        return protos.partialsketch.Fill.create({
            _class: chance.address(),
            isEnabled: chance.bool(),
            color: {
                _class: "color",
                green: chance.floating(),
                blue: chance.floating(),
                alpha: chance.floating(),
            }
        })
    }

    const generateLayer = (): protos.partialsketch.Layer => {
        return protos.partialsketch.Layer.create({
            doObjectID: chance.string({ length: 36 }),
            _class: chance.address(),
            booleanOperation: chance.integer({ min: 0, max: 5 }),
            isFlippedHorizontal: chance.bool(),
            isFlippedVertical: chance.bool(),
            isLocked: chance.bool(),
            isVisible: chance.bool(),
            layerListExpandedType: chance.bool(),
            resizingConstraint: chance.integer({ min: 0, max: 63 }),
            resizingType: chance.integer({ min: 0, max: 1 }),
            rotation: chance.floating() * 360,
            shouldBreakMaskChain: chance.bool(),
            clippingMaskMode: chance.bool(),
            hasClippingMask: chance.bool(),
            frame: {
                _class: "frame",
                x: (chance.floating() - 0.5) * 1000,
                y: (chance.floating() - 0.5) * 1000,
                width: (chance.floating() - 0.5) * 1000,
                height: (chance.floating() - 0.5) * 1000,
            },
            style: {
                _class: chance.address(),
                fills: Array.from({ length: chance.integer({ min: opts.fillsCount[0], max: opts.fillsCount[1] }) })
                    .fill(0).map(_ => generateFill())
            },
            layers: []
        })
    }

    const layers: protos.partialsketch.Layer[] = Array.from({ length: opts.layerCount }).fill(0).map(_ => generateLayer())

    for (let i = 2; i < layers.length; i++) {
        const linkToPrevious = chance.integer({ min: 1, max: 100 }) <= opts.link
        if (linkToPrevious) {
            const prev = layers[chance.integer({ min: 0, max: i - 1 })]
            prev.layers.push(layers[i])
        } else {
            layers[0].layers.push(layers[i])
        }
    }
    return layers[0]
}