import assert from 'assert'

const EMPTY_BUFFER = new Uint8Array([])

export interface IAllocated {
    bytes: Uint8Array,
    offset: number
}

interface InternalArray {
    bytes: Uint8Array
    len: number
}

export interface ByteVecSnapshot {
    buffersIndex: number,
    bufferLen: number,
    len: number,
    nextCapacity: number,
}

export interface ByteVecIter {
    _indexInArrayList: number,
    _indexInArray: number,
    _byte: number
    _array: InternalArray
}

export function createInitialByteVecIter(): ByteVecIter {
    return {
        _indexInArrayList: 0,
        _indexInArray: 0,
        _byte: 0,
        _array: null as any
    }
}

export class ByteVec {
    private _buffers: Array<InternalArray> = [{ bytes: new Uint8Array(this._initVecCapcity), len: 0 }]
    private _freeBuffers: Array<InternalArray> = []
    private _currentChunk: InternalArray = this._buffers[0]
    private _len = 0
    private _nextCapacity = this._initVecCapcity * 2;

    private _iter1: ByteVecIter = createInitialByteVecIter()
    private _iter2: ByteVecIter = createInitialByteVecIter()

    constructor(private _initVecCapcity: number) { }

    public pushByte(value: number) {
        assert(this._buffers.length > 0, "unexpected empty buffers in 'pushByte'")

        if (this._currentChunk.len === this._currentChunk.bytes.byteLength) {
            this._allocateNewInternalArray()
        }
        this._len++
        this._currentChunk.bytes[this._currentChunk.len++] = value
        assert(this._currentChunk === this._buffers[this._buffers.length - 1], 'current chunk is not the last chunk');
    }

    public allocate(len: number, allocated: IAllocated): void {
        const currentChunkLeft = this._currentChunk.bytes.byteLength - this._currentChunk.len

        // If current chunk is enough, just allocate in it
        if (len <= currentChunkLeft) {
            allocated.bytes = this._currentChunk.bytes;
            allocated.offset = this._currentChunk.len;

            this._currentChunk.len += len;
            this._len += len;
            assert(this._currentChunk.len <= this._currentChunk.bytes.byteLength, `currentChunk byteLength is ${this._currentChunk.bytes.byteLength}, but required length is ${this._currentChunk.len}`)
            return;
        }
        // enlarge nextCapacity
        while (len > this._nextCapacity) {
            this._nextCapacity = this._nextCapacity * 2
        }
        // now next chunk is enough, create it and allocate
        this._allocateNewInternalArray()

        allocated.bytes = this._currentChunk.bytes;
        allocated.offset = this._currentChunk.len;
        this._currentChunk.len += len;
        this._len += len;
        assert(this._currentChunk.len <= this._currentChunk.bytes.byteLength, `currentChunk byteLength is ${this._currentChunk.bytes.byteLength}, but required length is ${this._currentChunk.len}`)
        assert(this._currentChunk === this._buffers[this._buffers.length - 1], 'current chunk is not the last chunk')
    }

    public len() {
        return this._len
    }

    public toBufferAndClear(startIndex: number): Uint8Array {
        const ret = this.toBuffer(startIndex)
        this._buffers = []
        this._freeBuffers = []
        return ret
    }

    public toBuffer(startIndex: number): Uint8Array {
        const len = this._len - startIndex
        if (len == 0) {
            return new Uint8Array([])
        }
        assert(this._buffers.length > 0, "unexpected empty buffers in 'toBuffer'")

        let startBuffersIndex = 0
        let startOffset = 0
        {
            let start = 0
            while (startBuffersIndex < this._buffers.length) {
                const array = this._buffers[startBuffersIndex]
                const end = start + array.len

                if (startIndex < end) {
                    startOffset = startIndex - start
                    assert(startIndex >= start, `startIndex ${startIndex} is not greater or equal to start ${start}`)
                    break;
                }
                startBuffersIndex++
                start = end
            }
        }

        assert(startBuffersIndex < this._buffers.length, `startBuffersIndex ${startBuffersIndex} invalid`)

        const ret = new Uint8Array(len)

        const startArray = this._buffers[startBuffersIndex]
        ret.set(startArray.bytes.subarray(startOffset, startArray.len))
        let offset = startArray.len - startOffset

        for (let i = startBuffersIndex + 1; i < this._buffers.length; i++) {
            const buf = this._buffers[i]
            ret.set(buf.bytes.byteLength === buf.len ? buf.bytes : buf.bytes.subarray(0, buf.len), offset)
            offset += buf.len
            assert(buf.len > 0, `The length of array ${i} is zero`)
        }
        assert(offset === len, `offset ${offset} is not equal required len ${len}`)
        return ret
    }

    public snapshot(): ByteVecSnapshot {
        return {
            buffersIndex: this._buffers.length - 1,
            bufferLen: this._currentChunk.len,
            len: this._len,
            nextCapacity: this._nextCapacity,
        }
    }

    public snapshotEmpty(): ByteVecSnapshot {
        return {
            buffersIndex: 0,
            bufferLen: 0,
            len: 0,
            nextCapacity: this._initVecCapcity * 2
        }
    }

    public restoreSnapshot(snapshot: ByteVecSnapshot) {
        while (this._buffers.length - 1 > snapshot.buffersIndex) {
            const array = this._buffers.pop()!
            this._freeBuffers.push(array)
        }
        this._currentChunk = this._buffers[this._buffers.length - 1]
        this._currentChunk.len = snapshot.bufferLen
        this._len = snapshot.len
        this._nextCapacity = snapshot.nextCapacity

        assert(this._buffers.length > 0, "unexpected empty buffers by 'restoreSnapshot'")
    }

    public moveBackward(from: number, to: number, len: number) {
        if (len === 0) {
            return;
        }
        assert(from < to, `from ${from} is less than to ${to}`)
        assert(to + len <= this._len, `maxLen ${to + len} required, but current len is ${this._len}`)

        const fromRbeginIter = this._iter1
        const toRbeginIter = this._iter2
        this.getIter(from + len - 1, fromRbeginIter)
        this.getIter(to + len - 1, toRbeginIter)

        let left = len
        while (left > 0) {
            if (fromRbeginIter._indexInArray === 0 || toRbeginIter._indexInArray === 0) {
                this.writeByteAtIter(toRbeginIter, fromRbeginIter._byte)
                left--;
                if (left > 0) {
                    this._backwardIter(fromRbeginIter)
                    this._backwardIter(toRbeginIter)
                }
            } else {
                const toMoveFoward = Math.min(toRbeginIter._indexInArray, fromRbeginIter._indexInArray, left)
                toRbeginIter._array.bytes.set(fromRbeginIter._array.bytes.subarray(fromRbeginIter._indexInArray - toMoveFoward + 1, fromRbeginIter._indexInArray + 1), toRbeginIter._indexInArray - toMoveFoward + 1)

                fromRbeginIter._indexInArray -= toMoveFoward;
                fromRbeginIter._byte = fromRbeginIter._array.bytes[fromRbeginIter._indexInArray]
                toRbeginIter._indexInArray -= toMoveFoward;
                toRbeginIter._byte = toRbeginIter._array.bytes[fromRbeginIter._indexInArray]
                left -= toMoveFoward;
            }
        }

        // this.writeByteAtIter(toRbeginIter, fromRbeginIter._byte)
        // for (let i = 0; i < len - 1; i++) {
        //     this._backwardIter(fromRbeginIter)
        //     this._backwardIter(toRbeginIter)
        //     this.writeByteAtIter(toRbeginIter, fromRbeginIter._byte)
        // }
    }

    public getIter(index: number, iter: ByteVecIter) {
        let start = 0
        for (let i = 0; i < this._buffers.length; i++) {
            const array = this._buffers[i]
            const end = start + array.len

            if (index < end) {
                assert(index >= start, `[getIter] index ${index} is not greater or equal to start ${start}`)
                iter._indexInArrayList = i
                iter._indexInArray = index - start
                iter._array = array
                iter._byte = array.bytes[index - start]
                return
            }
            start = end
        }
        assert(false, `[getIter] getIter at ${index} out of range`)
    }

    public fowardIter(iter: ByteVecIter) {
        assert(iter._array.len > 0, `[fowardIter] array len is 0`)
        if (iter._indexInArray === iter._array.len - 1) {
            iter._indexInArrayList++
            iter._indexInArray = 0
            iter._array = this._buffers[iter._indexInArrayList]
            assert(Boolean(iter._array), `[fowardIter] array is null, indexInArrayList = ${iter._indexInArrayList}`)
            iter._byte = iter._array.bytes[iter._indexInArray]
        } else {
            iter._indexInArray++
            iter._byte = iter._array.bytes[iter._indexInArray]
        }
    }

    private _backwardIter(iter: ByteVecIter) {
        assert(iter._array.len > 0, `[backwardIter] array len is 0`)
        if (iter._indexInArray === 0) {
            iter._indexInArrayList--
            iter._array = this._buffers[iter._indexInArrayList]
            assert(Boolean(iter._array), `[backwardIter] array is null, indexInArrayList = ${iter._indexInArrayList}`)
            assert(iter._array.len > 0, `[backwardIter] array len is 0, indexInArrayList = ${iter._indexInArrayList}`)
            iter._indexInArray = iter._array.len - 1
            iter._byte = iter._array.bytes[iter._indexInArray]
        } else {
            iter._indexInArray--
            iter._byte = iter._array.bytes[iter._indexInArray]
        }
    }

    public writeByteAtIter(iter: ByteVecIter, byte: number) {
        iter._array.bytes[iter._indexInArray] = byte
    }

    private _allocateNewInternalArray() {
        while (this._freeBuffers.length) {
            const array = this._freeBuffers.pop()!
            if (array.bytes.byteLength === this._nextCapacity) {
                array.len = 0
                this._buffers.push(array)
                this._currentChunk = array
                this._nextCapacity = 2 * this._nextCapacity;
                return;
            }
        }

        const array: InternalArray = {
            bytes: new Uint8Array(this._nextCapacity),
            len: 0,
        }
        this._buffers.push(array)
        this._currentChunk = array
        this._nextCapacity = 2 * this._nextCapacity;
    }
}
