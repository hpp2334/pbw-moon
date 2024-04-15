import { expect, ByteVec, chance, ByteVecSnapshot } from "../dist"

const defaultAllocated = {
    bytes: new Uint8Array(),
    len: 0
}

function pushBytes(vec: ByteVec, bytes: Uint8Array) {
    vec.allocate(bytes.byteLength, defaultAllocated);
    defaultAllocated.bytes.set(bytes, defaultAllocated.len)
}

if ((ByteVec as any)._setInitializeVecCapacity) {
    (ByteVec as any)._setInitializeVecCapacity(4)
}

const tryAssertVecChunksSize = (vec: ByteVec, value: number) => {
    if ((vec as any)._chunksSize) {
        expect((vec as any)._chunksSize()).to.eq(value);
    }
}

describe('pushByte/pushBytes', () => {
    it('empty', async () => {
        const vec = new ByteVec()
        expect(vec.toBuffer(0)).to.equalBytes(new Uint8Array([]))
    })

    it('pushByte [1]', async () => {
        const vec = new ByteVec()
        vec.pushByte(1)
        expect(vec.toBuffer(0)).to.equalBytes(new Uint8Array([1]))
    })

    it('pushByte [1,2]', async () => {
        const vec = new ByteVec()
        vec.pushByte(1)
        vec.pushByte(2)
        expect(vec.toBuffer(0)).to.equalBytes(new Uint8Array([1, 2]))
    })

    it('pushByte [1,2,3,4,5]', async () => {
        const vec = new ByteVec()
        vec.pushByte(1)
        vec.pushByte(2)
        vec.pushByte(3)
        vec.pushByte(4)
        vec.pushByte(5)
        expect(vec.toBuffer(0)).to.equalBytes(new Uint8Array([1, 2, 3, 4, 5]))
        tryAssertVecChunksSize(vec, 2)
    })

    it('pushBytes [1]', async () => {
        const vec = new ByteVec()
        pushBytes(vec, new Uint8Array([1]))
        expect(vec.toBuffer(0)).to.equalBytes(new Uint8Array([1]))
    })

    it('pushBytes [1,2]', async () => {
        const vec = new ByteVec()
        pushBytes(vec, new Uint8Array([1, 2]))
        expect(vec.toBuffer(0)).to.equalBytes(new Uint8Array([1, 2]))
    })

    it('pushBytes [1,2,3,4,5]', async () => {
        const vec = new ByteVec()
        pushBytes(vec, new Uint8Array([1, 2, 3, 4, 5]))
        expect(vec.toBuffer(0)).to.equalBytes(new Uint8Array([1, 2, 3, 4, 5]))
    })
})

describe('move', () => {
    it('move backward', () => {
        const expected = new Uint8Array([1, 2, 3, 1, 2])
        const vec = new ByteVec()
        pushBytes(vec, new Uint8Array([1, 2, 3, 4, 5]))
        vec.moveBackward(0, 3, 2)
        expect(vec.toBuffer(0)).to.equalBytes(expected)
        tryAssertVecChunksSize(vec, 2)
    })
})

describe('snapshot', () => {
    it('snapshot/restore 1', () => {
        const expected = new Uint8Array([2, 3, 4, 5])
        const vec = new ByteVec()
        pushBytes(vec, new Uint8Array([1, 2, 3]))
        const snapshot = vec.snapshot()
        expect(snapshot.len === 3)
        expect(snapshot.chunkLen === 3)
        vec.pushByte(8)
        vec.pushByte(6)
        vec.restoreSnapshot(snapshot)
        pushBytes(vec, new Uint8Array([4, 5]))
        expect(vec.toBuffer(1)).to.equalBytes(expected)
    })
})


describe('fuzz', () => {
    enum OperationType {
        PushByte = 0,
        PushBytes = 1,
        MoveBackward = 2,
        Snapshot = 3,
        RestoreLastSnapshot = 4,
    }
    interface Operation {
        type: OperationType,
    }

    for (let caseNum = 0; caseNum < 100; caseNum++) {
        const seed = Date.now() + caseNum
        const gen = new chance(seed)

        const generateUint8Array = (len: number) => {
            const res = new Uint8Array(len)
            for (let i = 0; i < len; i++) {
                res.set([gen.integer({ min: 0, max: 255 })])
            }
            return res
        }

        const opsLen = gen.integer({ min: 10, max: 100 })
        const ops: Array<Operation> = Array.from({ length: opsLen }).fill(0).map(_ => ({ type: gen.integer({ min: 0, max: 4 }) as OperationType }))

        it(`Bytevec FuzzTest [${seed}] ${caseNum + 1}`, async () => {
            const vec = new ByteVec()
            const snapshots: ByteVecSnapshot[] = []
            const snapshotsForVerify: number[] = []
            let array = new Uint8Array()
            let opCount = 0

            for (const { type } of ops) {
                ++opCount
                switch (type) {
                    case OperationType.PushByte: {
                        const value = gen.integer({ min: 0, max: 255 })
                        vec.pushByte(value)
                        array = new Uint8Array([...array, value])
                        break;
                    }
                    case OperationType.PushBytes: {
                        const len = gen.integer({ min: 1, max: 20 })
                        const bytes = generateUint8Array(len)
                        pushBytes(vec, bytes)
                        array = new Uint8Array([...array, ...bytes])
                        break
                    }
                    case OperationType.MoveBackward: {
                        if (array.byteLength <= 1) {
                            break
                        }

                        const len = gen.integer({ min: 0, max: Math.min(100, array.byteLength - 2) })
                        const to = gen.integer({ min: 1, max: array.byteLength - 1 - len })
                        const from = gen.integer({ min: 0, max: to - 1 })

                        const maxLen = Math.max(from + len, to + len)
                        if (array.byteLength < maxLen) {
                            throw Error(`[FuzzInternalError] maxLen ${maxLen} out of range ${array.byteLength}`)
                        }
                        array.set(array.subarray(from, from + len), to)
                        vec.moveBackward(from, to, len)
                        break
                    }
                    case OperationType.Snapshot: {
                        const snapshot = vec.snapshot()
                        snapshots.push(snapshot)
                        snapshotsForVerify.push(array.byteLength)
                        break
                    }
                    case OperationType.RestoreLastSnapshot: {
                        if (snapshots.length === 0) {
                            expect(snapshotsForVerify.length).to.eq(0)
                            break
                        }
                        const snapshot = snapshots.pop()!
                        vec.restoreSnapshot(snapshot)
                        const lastLen = snapshotsForVerify.pop()!
                        array = array.slice(0, lastLen)
                        break
                    }
                }

                // verify
                for (let i = 0; i < array.byteLength; i++) {
                    const expected = array.subarray(i)
                    const received = vec.toBuffer(i)

                    expect(received, `[${opCount}] operation ${OperationType[type]}, verify i = ${i}`).to.equalBytes(expected)

                    // make received dirty
                    for (let i = 0; i < received.length; i++) {
                        received[i] = gen.integer({ min: 0, max: 255 })
                    }
                }
            }
        })
    }
})