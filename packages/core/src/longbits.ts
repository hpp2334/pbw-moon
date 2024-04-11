// Fork from https://github.com/protobufjs/protobuf.js/blob/master/src/util/longbits.js

import Long from "long";
import { isString } from "./utils";

export type IIntoLongBits = number | string | Long

export class LongBits {
    constructor(public lo: number, public hi: number) { }

    public static fromNumber(value: number) {
        if (value === 0)
            return LongBits.zero;
        const sign = value < 0;
        if (sign)
            value = -value;
        let lo = value >>> 0;
        let hi = (value - lo) / 4294967296 >>> 0;
        if (sign) {
            hi = ~hi >>> 0;
            lo = ~lo >>> 0;
            if (++lo > 4294967295) {
                lo = 0;
                if (++hi > 4294967295)
                    hi = 0;
            }
        }
        return new LongBits(lo, hi);
    }

    public static from(value: IIntoLongBits) {
        if (typeof value === "number")
            return LongBits.fromNumber(value);
        if (isString(value)) {
            value = Long.fromString(value);
        }
        return value.low || value.high ? new LongBits(value.low >>> 0, value.high >>> 0) : LongBits.zero;
    }

    public zzEncode() {
        const mask = this.hi >> 31;
        this.hi = ((this.hi << 1 | this.lo >>> 31) ^ mask) >>> 0;
        this.lo = (this.lo << 1 ^ mask) >>> 0;
        return this;
    }

    public length() {
        const part0 = this.lo,
            part1 = (this.lo >>> 28 | this.hi << 4) >>> 0,
            part2 = this.hi >>> 24;
        return part2 === 0
            ? part1 === 0
                ? part0 < 16384
                    ? part0 < 128 ? 1 : 2
                    : part0 < 2097152 ? 3 : 4
                : part1 < 16384
                    ? part1 < 128 ? 5 : 6
                    : part1 < 2097152 ? 7 : 8
            : part2 < 128 ? 9 : 10;
    }

    static zero: LongBits = new LongBits(0, 0)
}
