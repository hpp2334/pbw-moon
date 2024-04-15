// Fork from https://github.com/protobufjs/protobuf.js/blob/master/src/writer.js

import { isString } from "./utils"
import pbFloat from '@protobufjs/float'
import pbBase64 from '@protobufjs/base64'
import pbUtf8 from '@protobufjs/utf8'
import { ByteVec, ByteVecIter, ByteVecSnapshot, AllocatedChunk, createInitialByteVecIter, AllocatedChunkRef } from "./byte-vec"
import { IIntoLongBits, LongBits } from "./longbits"

const GUESS_VARINT_LEN_FOR_LDELIM = 1

function _varint32Len(value: number) {
    value = value >>> 0;
    return value < 128 ? 1
        : value < 16384 ? 2
            : value < 2097152 ? 3
                : value < 268435456 ? 4
                    : 5
}

export class Writer {
    private _vec: ByteVec = new ByteVec()
    private _snapshots: ByteVecSnapshot[] = []
    private _emptySnapshot: ByteVecSnapshot
    private _vecAllocated: AllocatedChunkRef = {
        chunk: {
            bytes: new Uint8Array([]),
            len: 0,
        }
    }
    private _iter1: ByteVecIter = createInitialByteVecIter()

    public get len(): number {
        return this._vec.len()
    }

    public get head(): never {
        throw Error("head is not support")
    }

    public get tail(): never {
        throw Error("tail is not support")
    }

    public get states(): never {
        throw Error("states is not support")
    }

    constructor() {
        this._emptySnapshot = this._vec.snapshotEmpty()
    }

    // Writes an unsigned 32 bit value as a varint.
    public uint32(value: number) {
        value = value >>> 0;
        this._writeVarint32(value)
        return this
    }

    // Writes a signed 32 bit value as a varint.
    public int32(value: number) {
        value < 0
            ? this._writeVarint64(LongBits.fromNumber(value))
            : this.uint32(value);
        return this
    }

    // Writes a 32 bit value as a varint, zig-zag encoded.
    public sint32(value: number) {
        this.uint32((value << 1 ^ value >> 31) >>> 0);
        return this
    }

    // Writes an unsigned 64 bit value as a varint.
    public uint64(_value: IIntoLongBits) {
        const value = LongBits.from(_value)
        this._writeVarint64(value)
        return this
    }

    // Writes a signed 64 bit value as a varint.
    public int64 = this.uint64

    // Writes a signed 64 bit value as a varint, zig-zag encoded.
    public sint64(_value: IIntoLongBits) {
        const value = LongBits.from(_value).zzEncode()
        this._writeVarint64(value)
        return this
    }

    // Writes a boolish value as a varint.
    public bool(value: boolean) {
        this._writeByte(value ? 1 : 0)
        return this
    }

    // Writes an unsigned 32 bit value as fixed 32 bits.
    public fixed32(value: number) {
        this._writeFixed32(value)
        return this
    }

    // Writes a signed 32 bit value as fixed 32 bits.
    public sfixed32 = this.fixed32

    public fixed64(_value: IIntoLongBits) {
        const value = LongBits.from(_value)
        this._writeFixed32(value.lo)
        this._writeFixed32(value.hi)
        return this
    }

    // Writes a signed 64 bit value as fixed 64 bits.
    public sfixed64 = this.fixed64

    // Writes a float (32 bit).
    public float(value: number) {
        this._vec.reserveMore(4, this._vecAllocated)
        pbFloat.writeFloatLE(value, this._vecAllocated.chunk.bytes, this._vecAllocated.chunk.len)
        this._vec.addLen(4)
        return this
    }

    // Writes a double (64 bit float).
    public double(value: number) {
        this._vec.reserveMore(8, this._vecAllocated)
        pbFloat.writeDoubleLE(value, this._vecAllocated.chunk.bytes, this._vecAllocated.chunk.len)
        this._vec.addLen(8)
        return this
    }

    // Writes a sequence of bytes.
    public bytes(value: Uint8Array | string) {
        const len = value.length >>> 0;
        if (!len) {
            this._writeByte(0)
            return this
        }
        if (isString(value)) {
            const len = pbBase64.length(value)
            this.uint32(len)
            this._vec.reserveMore(len, this._vecAllocated)
            pbBase64.decode(value, this._vecAllocated.chunk.bytes, this._vecAllocated.chunk.len)
            this._vec.addLen(len)
            return this
        }
        this.uint32(len)
        this._vec.reserveMore(len, this._vecAllocated)
        // copy bytes
        this._vecAllocated.chunk.bytes.set(value, this._vecAllocated.chunk.len)
        this._vec.addLen(value.byteLength)
        return this
    }

    // Writes a string.
    public string(value: string) {
        const len = pbUtf8.length(value)
        if (len === 0) {
            this._writeByte(0)
        } else {
            this.uint32(len)
            this._vec.reserveMore(len, this._vecAllocated)
            pbUtf8.write(value, this._vecAllocated.chunk.bytes, this._vecAllocated.chunk.len)
            this._vec.addLen(len)
        }
        return this
    }

    // Forks this writer's state
    public fork() {
        this._snapshots.push(this._vec.snapshot())
        // reserve 1 byte for writing vec lenth as varin32 when "ldelim"
        // if vec length is greater or equalt or 128, we cannot use it
        this._writeByte(0)
        return this
    }

    // Resets this instance to the last state.
    public reset() {
        if (this._snapshots.length) {
            const snapshot = this._snapshots.pop()!
            this._vec.restoreSnapshot(snapshot)
        } else {
            this._vec.restoreSnapshot(this._emptySnapshot)
        }
        return this
    }

    // Resets to the last state and appends the fork state's current write length as a varint followed by its operations.
    public ldelim() {
        if (this._snapshots.length === 0) {
            return this
        }

        const snapshot = this._snapshots.pop()!
        const len = this._vec.len() - snapshot.len - GUESS_VARINT_LEN_FOR_LDELIM;
        const varint32Len = _varint32Len(len)

        if (varint32Len !== GUESS_VARINT_LEN_FOR_LDELIM) {
            const maxLen = Math.max(snapshot.len + GUESS_VARINT_LEN_FOR_LDELIM, snapshot.len + varint32Len) + len
            if (maxLen > this._vec.len()) {
                const left = maxLen - this._vec.len()
                this._vec.reserveMore(left, this._vecAllocated);
                this._vec.addLen(left)
            }

            this._vec.moveBackward(snapshot.len + GUESS_VARINT_LEN_FOR_LDELIM, snapshot.len + varint32Len, len)
            this._vec.getIter(snapshot.len, this._iter1)
            this._writeVarint32ByAtIter(len, this._iter1)
        } else {
            // reuse
            // write length as varint32
            this._vec.getIter(snapshot.len, this._iter1)
            this._writeVarint32ByAtIter(len, this._iter1)
        }
        return this
    }

    public finish() {
        if (this._snapshots.length) {
            const snapshot = this._snapshots.pop()!
            this._snapshots = []
            return this._vec.toBufferAndClear(snapshot.len + GUESS_VARINT_LEN_FOR_LDELIM)
        } else {
            return this._vec.toBufferAndClear(0)
        }
    }

    private _writeVarint32(val: number) {
        while (val > 127) {
            this._vec.pushByte(val & 127 | 128);
            val >>>= 7;
        }
        this._vec.pushByte(val);
    }

    private _writeVarint32ByAtIter(val: number, iter: ByteVecIter) {
        while (val > 127) {
            this._vec.writeByteAtIter(iter, val & 127 | 128)
            this._vec.fowardIter(iter)
            val >>>= 7;
        }
        this._vec.writeByteAtIter(iter, val);
    }

    private _writeVarint64(val: LongBits) {
        while (val.hi) {
            this._vec.pushByte(val.lo & 127 | 128);
            val.lo = (val.lo >>> 7 | val.hi << 25) >>> 0;
            val.hi >>>= 7;
        }
        while (val.lo > 127) {
            this._vec.pushByte(val.lo & 127 | 128);
            val.lo = val.lo >>> 7;
        }
        this._vec.pushByte(val.lo);
    }

    private _writeFixed32(val: number) {
        this._vec.pushByte(val & 255);
        this._vec.pushByte(val >>> 8 & 255);
        this._vec.pushByte(val >>> 16 & 255);
        this._vec.pushByte(val >>> 24);
    }

    private _writeByte(val: number) {
        this._vec.pushByte(val)
    }
}