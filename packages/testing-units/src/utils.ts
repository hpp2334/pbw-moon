
import * as protos from 'pbw-moon-testing-protos'
import Long from 'long'
import { Writer } from 'pbw-moon'

function getWriter(useWriter: boolean) {
    return useWriter ? new Writer() : undefined
}

function generateRandomText(chance: Chance.Chance, glyphCount: number, useWriter: boolean): protos.shapepackage.Text {
    return protos.shapepackage.Text.create({
        id: Long.fromBits(chance.integer({ min: -10000000, max: 100000000 }), chance.integer({ min: -10000000, max: 100000000 })),
        text: chance.string({ length: 10 }),
        position: {
            x: chance.floating() * 1000,
            y: chance.floating() * 1000,
        },
        size: {
            width: chance.floating() * 1000,
            height: chance.floating() * 1000,
        },
        glyphs: Array.from({ length: glyphCount }).fill(0).map(_ => protos.shapepackage.Glyph.create({
            id: Long.fromBits(chance.integer({ min: -10000000, max: 100000000 }), chance.integer({ min: -10000000, max: 100000000 })),
            scale: chance.floating() * 1000,
            position: {
                x: chance.floating() * 1000,
                y: chance.floating() * 1000,
            },
            size: {
                width: chance.floating() * 1000,
                height: chance.floating() * 1000,
            },
            extraData: protos.shapepackage.Text.encode(generateRandomText(chance, 0, useWriter), getWriter(useWriter)).finish(),
        }))
    })
}

export function generateRandomLayers(chance: Chance.Chance, useWriter: boolean, opts: {
    layerCount: number,
    fillsCount: [number, number],
    /** 1 - 100 */
    link: number,
}): Uint8Array {
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
        let bin: Uint8Array | null = null;
        if (chance.integer({ min: 0, max: 4 }) === 0) {
            const len = chance.integer({ min: 0, max: 10 })
            bin = protos.shapepackage.Text.encode(generateRandomText(chance, len, useWriter), getWriter(useWriter)).finish()
        }

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
            _binary: bin,
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
    return protos.partialsketch.Layer.encode(layers[0], getWriter(useWriter)).finish()
}