import { Writer, protos, expect, chance, generateRandomLayers } from "../dist"

function isEqual(lhs: Uint8Array, rhs: Uint8Array) {
    if (lhs.byteLength !== rhs.byteLength) {
        return false
    }
    for (let i = 0; i < lhs.byteLength; i++) {
        if (lhs[i] !== rhs[i]) {
            return false
        }
    }
    return true
}

it('Text 1', async () => {
    const p = protos.shapepackage.Text.create({
        id: 1,
        text: "abcdの😄",
        position: {
            id: 2,
            x: 1.5,
            y: 2,
        },
        size: {
            id: 3,
            width: 200,
            height: 300,
        },
        glyphs: [
            {
                id: 1,
                position: {
                    id: 2,
                    x: 998244353,
                    y: 1234512,
                },
                size: {
                    id: 3,
                    width: 200.0,
                    height: 300.0,
                },
                extraData: new Uint8Array([1, 2, 3]),
            },
            {
                id: 1,
                position: {
                    id: -2,
                    x: -998244353,
                    y: -1234512,
                },
                size: {
                    id: -3,
                    width: -200.0,
                    height: -300.0,
                },
                extraData: new Uint8Array([1]),
            }
        ]
    })

    const Message = protos.shapepackage.Text;
    const expected = Message.encode(p).finish()
    const received = Message.encode(p, new Writer()).finish()
    expect(expected.length).to.greaterThan(0)
    expect(received).to.equalBytes(expected)
})


describe('fuzz', () => {
    for (let caseNum = 0; caseNum < 500; caseNum++) {
        const seed = Date.now() + caseNum
        const gen = new chance(seed)

        const p = generateRandomLayers(gen, {
            layerCount: gen.integer({ min: 1, max: 1000, }),
            fillsCount: [0, 10],
            link: 80,
        })

        it(`Writer FuzzTest [${seed}] ${caseNum + 1}`, () => {
            const Message = protos.partialsketch.Layer;
            const expected = Message.encode(p).finish()
            const received = Message.encode(p, new Writer()).finish()
            expect(expected.length).to.greaterThan(0)
            expect(isEqual(received, expected)).to.be.true
        })
    }
})