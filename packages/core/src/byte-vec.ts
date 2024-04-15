import assert from 'assert'

export interface AllocatedChunk {
    bytes: Uint8Array
    len: number
}

export interface AllocatedChunkRef {
    chunk: AllocatedChunk
}

export interface ByteVecSnapshot {
    chunksIndex: number,
    chunkLen: number,
    len: number,
    nextCapacity: number,
}

export interface ByteVecIter {
    _indexInChunkList: number,
    _indexInChunk: number,
    _byte: number
    _chunk: AllocatedChunk
}

export function createInitialByteVecIter(): ByteVecIter {
    return {
        _indexInChunkList: 0,
        _indexInChunk: 0,
        _byte: 0,
        _chunk: null as any
    }
}

let _InitialChunkCapacity = 2048 // 2KB
const _InitialChunkPoolLimit = 4;
// use a pool to avoid create initial chunk frequently
const _InitialChunkPool: Uint8Array[] = []

// use a chunk to avoid create chunk frequently when toBuffer
const _ToBufferChunkCapacity = 16384; // 16KB
const _ToBufferChunkByteLengthLimit = 4096; // 4KB
let _ToBufferChunk = new Uint8Array(_ToBufferChunkCapacity)
let _ToBufferOffset = 0

function obtainInitialChunk(): Uint8Array {
    if (_InitialChunkPool.length === 0) {
        return new Uint8Array(_InitialChunkCapacity)
    }
    return _InitialChunkPool.pop()!
}

function freeInitialChunk(bytes: Uint8Array) {
    if (_InitialChunkPool.length >= _InitialChunkPoolLimit) {
        return;
    }
    _InitialChunkPool.push(bytes)
}

function allocateToBuffer(len: number): Uint8Array {
    if (len > _ToBufferChunkByteLengthLimit || len <= 0) {
        return new Uint8Array(len)
    }
    if (_ToBufferOffset + len > _ToBufferChunkCapacity) {
        _ToBufferChunk = new Uint8Array(_ToBufferChunkCapacity)
        _ToBufferOffset = 0
    }
    const buffer = _ToBufferChunk.subarray(_ToBufferOffset, _ToBufferOffset + len)
    _ToBufferOffset += len
    return buffer
}

export class ByteVec {
    private _chunks: Array<AllocatedChunk> = [{ bytes: obtainInitialChunk(), len: 0 }]
    private _freeChunks: Array<AllocatedChunk> = []
    private _currentChunk: AllocatedChunk = this._chunks[0]
    private _len = 0
    private _nextCapacity = _InitialChunkCapacity * 2;

    private _iter1: ByteVecIter = createInitialByteVecIter()
    private _iter2: ByteVecIter = createInitialByteVecIter()

    constructor() { }

    public pushByte(value: number) {
        assert(this._chunks.length > 0, "unexpected empty buffers in 'pushByte'")

        if (this._currentChunk.len === this._currentChunk.bytes.byteLength) {
            this._allocateNewChunk()
        }
        this._len++
        this._currentChunk.bytes[this._currentChunk.len++] = value
        assert(this._currentChunk === this._chunks[this._chunks.length - 1], 'current chunk is not the last chunk');
    }

    public addLen(len: number) {
        this._currentChunk.len += len
        this._len += len
    }

    public reserveMore(len: number, allocated: AllocatedChunkRef): void {
        const currentChunkLeft = this._currentChunk.bytes.byteLength - this._currentChunk.len

        // If current chunk is enough, just allocate in it
        if (len <= currentChunkLeft) {
            allocated.chunk = this._currentChunk;

            assert(this._currentChunk.len <= this._currentChunk.bytes.byteLength, `currentChunk byteLength is ${this._currentChunk.bytes.byteLength}, but required length is ${this._currentChunk.len}`)
            return;
        }
        // enlarge nextCapacity
        while (len > this._nextCapacity) {
            this._nextCapacity = this._nextCapacity * 2
        }
        // now next chunk is enough, create it and allocate
        this._allocateNewChunk()

        allocated.chunk = this._currentChunk;
        assert(this._currentChunk.len <= this._currentChunk.bytes.byteLength, `currentChunk byteLength is ${this._currentChunk.bytes.byteLength}, but required length is ${this._currentChunk.len}`)
        assert(this._currentChunk === this._chunks[this._chunks.length - 1], 'current chunk is not the last chunk')
    }

    public len() {
        return this._len
    }

    public toBufferAndClear(startIndex: number): Uint8Array {
        const ret = this.toBuffer(startIndex)
        assert(this._chunks.length > 0, "unexpected empty buffers in 'toBufferAndClear'")
        freeInitialChunk(this._chunks[0].bytes)
        this._chunks = []
        this._freeChunks = []
        return ret
    }

    public toBuffer(startIndex: number): Uint8Array {
        const len = this._len - startIndex
        if (len == 0) {
            return new Uint8Array([])
        }
        assert(this._chunks.length > 0, "unexpected empty buffers in 'toBuffer'")

        let startChunksIndex = 0
        let startOffset = 0
        {
            let start = 0
            while (startChunksIndex < this._chunks.length) {
                const chunk = this._chunks[startChunksIndex]
                const end = start + chunk.len

                if (startIndex < end) {
                    startOffset = startIndex - start
                    assert(startIndex >= start, `startIndex ${startIndex} is not greater or equal to start ${start}`)
                    break;
                }
                startChunksIndex++
                start = end
            }
        }

        assert(startChunksIndex < this._chunks.length, `startBuffersIndex ${startChunksIndex} invalid`)

        const ret = allocateToBuffer(len)

        const startArray = this._chunks[startChunksIndex]
        ret.set(startArray.bytes.subarray(startOffset, startArray.len))
        let offset = startArray.len - startOffset

        for (let i = startChunksIndex + 1; i < this._chunks.length; i++) {
            const chunk = this._chunks[i]
            ret.set(chunk.bytes.byteLength === chunk.len ? chunk.bytes : chunk.bytes.subarray(0, chunk.len), offset)
            offset += chunk.len
            assert(chunk.len > 0, `The length of chunk ${i} is zero`)
        }
        assert(offset === len, `offset ${offset} is not equal required len ${len}`)
        return ret
    }

    public snapshot(): ByteVecSnapshot {
        return {
            chunksIndex: this._chunks.length - 1,
            chunkLen: this._currentChunk.len,
            len: this._len,
            nextCapacity: this._nextCapacity,
        }
    }

    public snapshotEmpty(): ByteVecSnapshot {
        return {
            chunksIndex: 0,
            chunkLen: 0,
            len: 0,
            nextCapacity: _InitialChunkCapacity * 2
        }
    }

    public restoreSnapshot(snapshot: ByteVecSnapshot) {
        while (this._chunks.length - 1 > snapshot.chunksIndex) {
            const chunk = this._chunks.pop()!
            this._freeChunks.push(chunk)
        }
        this._currentChunk = this._chunks[this._chunks.length - 1]
        this._currentChunk.len = snapshot.chunkLen
        this._len = snapshot.len
        this._nextCapacity = snapshot.nextCapacity

        assert(this._chunks.length > 0, "unexpected empty buffers by 'restoreSnapshot'")
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
            if (fromRbeginIter._indexInChunk === 0 || toRbeginIter._indexInChunk === 0) {
                this.writeByteAtIter(toRbeginIter, fromRbeginIter._byte)
                left--;
                if (left > 0) {
                    this._backwardIter(fromRbeginIter)
                    this._backwardIter(toRbeginIter)
                }
            } else {
                const toMoveFoward = Math.min(toRbeginIter._indexInChunk, fromRbeginIter._indexInChunk, left)
                toRbeginIter._chunk.bytes.set(fromRbeginIter._chunk.bytes.subarray(fromRbeginIter._indexInChunk - toMoveFoward + 1, fromRbeginIter._indexInChunk + 1), toRbeginIter._indexInChunk - toMoveFoward + 1)

                fromRbeginIter._indexInChunk -= toMoveFoward;
                fromRbeginIter._byte = fromRbeginIter._chunk.bytes[fromRbeginIter._indexInChunk]
                toRbeginIter._indexInChunk -= toMoveFoward;
                toRbeginIter._byte = toRbeginIter._chunk.bytes[fromRbeginIter._indexInChunk]
                left -= toMoveFoward;
            }
        }
    }

    public getIter(index: number, iter: ByteVecIter) {
        let start = 0
        for (let i = 0; i < this._chunks.length; i++) {
            const chunk = this._chunks[i]
            const end = start + chunk.len

            if (index < end) {
                assert(index >= start, `[getIter] index ${index} is not greater or equal to start ${start}`)
                iter._indexInChunkList = i
                iter._indexInChunk = index - start
                iter._chunk = chunk
                iter._byte = chunk.bytes[index - start]
                return
            }
            start = end
        }
        assert(false, `[getIter] getIter at ${index} out of range`)
    }

    public fowardIter(iter: ByteVecIter) {
        assert(iter._chunk.len > 0, `[fowardIter] chunk len is 0`)
        if (iter._indexInChunk === iter._chunk.len - 1) {
            iter._indexInChunkList++
            iter._indexInChunk = 0
            iter._chunk = this._chunks[iter._indexInChunkList]
            assert(Boolean(iter._chunk), `[fowardIter] chunk is null, indexInArrayList = ${iter._indexInChunkList}`)
            iter._byte = iter._chunk.bytes[iter._indexInChunk]
        } else {
            iter._indexInChunk++
            iter._byte = iter._chunk.bytes[iter._indexInChunk]
        }
    }

    private _backwardIter(iter: ByteVecIter) {
        assert(iter._chunk.len > 0, `[backwardIter] chunk len is 0`)
        if (iter._indexInChunk === 0) {
            iter._indexInChunkList--
            iter._chunk = this._chunks[iter._indexInChunkList]
            assert(Boolean(iter._chunk), `[backwardIter] chunk is null, indexInArrayList = ${iter._indexInChunkList}`)
            assert(iter._chunk.len > 0, `[backwardIter] chunk len is 0, indexInArrayList = ${iter._indexInChunkList}`)
            iter._indexInChunk = iter._chunk.len - 1
            iter._byte = iter._chunk.bytes[iter._indexInChunk]
        } else {
            iter._indexInChunk--
            iter._byte = iter._chunk.bytes[iter._indexInChunk]
        }
    }

    public writeByteAtIter(iter: ByteVecIter, byte: number) {
        iter._chunk.bytes[iter._indexInChunk] = byte
    }

    private _allocateNewChunk() {
        while (this._freeChunks.length) {
            const chunk = this._freeChunks.pop()!
            if (chunk.bytes.byteLength === this._nextCapacity) {
                chunk.len = 0
                this._chunks.push(chunk)
                this._currentChunk = chunk
                this._nextCapacity = 2 * this._nextCapacity;
                return;
            }
        }

        const chunk: AllocatedChunk = {
            bytes: new Uint8Array(this._nextCapacity),
            len: 0,
        }
        this._chunks.push(chunk)
        this._currentChunk = chunk
        this._nextCapacity = 2 * this._nextCapacity;
    }
}

assert((() => {
    (ByteVec as any).prototype._chunksSize = function () {
        return (this as any)._chunks.length
    };
    (ByteVec as any)._setInitializeVecCapacity = function (value: number) {
        _InitialChunkCapacity = value
    };
    return true;
})())