# pbw-moon

![Main](https://github.com/hpp2334/pbw-moon/actions/workflows/main.yml/badge.svg)
[![npm version](https://badge.fury.io/js/pbw-moon.svg)](https://badge.fury.io/js/pbw-moon)

Overview
----

Another implementation of protobuf writer for [protobuf.js](https://github.com/protobufjs/protobuf.js), with smaller javascript heap memory usage. Tested on protobufjs v7.2.6.

When to use
----

- encode large Javascript objects

How to use
----

```ts
import * as protos from './protos/proto'
import { Writer } from 'pbw-moon'

// pass to the second argument
protos.partialsketch.Layer.encode(p, new Writer()).finish()
```

Testing
----

### Unit tests and fuzz test

The result of the offical protobuf writer is compared to verify its correctness. See [packages/testing-units](packages/testing-units) for details.

### Conformance tests

Protobuf has [conformance tests](https://github.com/protocolbuffers/protobuf/tree/main/conformance) for testing the completeness and correctness of Protocol Buffers implementations. Repository [protobuf-conformance](https://github.com/bufbuild/protobuf-conformance.git) runs the protocol buffers conformance test suite against various implementations, which include protobuf.js. This repository was forked to test the writer. See [protobuf-conformance/impl/protobuf.js](protobuf-conformance/impl/protobuf.js) for details.

Benchmark
----

### Browser

Encoding small objects has similar performance, and encoding large objects is faster. Run `pnpm dev` in package [pbw-moon-testing-browser-bench](./packages/testing-browser-bench) and click "Benchmark Suite" to see the result.

Chrome 123.0 on Windows

```log
benchmarking encoding - bench performance ...
[offical] protobuf.js (static) x 1,184,402 ops/sec ±1.18% (64 runs sampled)
[pbw-moon] protobuf.js (static) x 1,317,833 ops/sec ±1.09% (66 runs sampled)
[pbw-moon] protobuf.js (static) was fastest
[offical] protobuf.js (static) was 10.2% ops/sec slower (factor 1.1)

benchmarking encoding - partialSketch performance ...
[offical] protobuf.js (static) x 1.49 ops/sec ±8.62% (8 runs sampled)
[pbw-moon] protobuf.js (static) x 5.30 ops/sec ±1.42% (18 runs sampled)
[pbw-moon] protobuf.js (static) was fastest
[offical] protobuf.js (static) was 73.7% ops/sec slower (factor 3.8)
```

Firefox 124.0.2 on Windows

```log
benchmarking encoding - bench performance ...
[offical] protobuf.js (static) x 539,970 ops/sec ±3.31% (56 runs sampled)
[pbw-moon] protobuf.js (static) x 463,409 ops/sec ±2.45% (56 runs sampled)
[offical] protobuf.js (static) was fastest
[pbw-moon] protobuf.js (static) was 13.5% ops/sec slower (factor 1.2)

benchmarking encoding - partialSketch performance ...
[offical] protobuf.js (static) x 1.69 ops/sec ±10.17% (9 runs sampled)
[pbw-moon] protobuf.js (static) x 3.31 ops/sec ±6.42% (13 runs sampled)
[pbw-moon] protobuf.js (static) was fastest
[offical] protobuf.js (static) was 50.7% ops/sec slower (factor 2.0)
```

### NodeJS

Encoding small objects is slower than the official writer (in Node.js), but encoding large objects (30 MB) is faster. Run `pnpm benchmark` to see the result.

```log
[Offical] encode bench
time 8552.496789008379 ms
heapTotal increase 10.5 MB

[pbw-moon] encode bench
time 9201.273878991604 ms
heapTotal increase 0 MB

[Offical] encode partialSketch
time 931.2965700030327 ms
heapTotal increase 316 MB

[pbw-moon] encode partialSketch
time 268.0517299771309 ms
heapTotal increase 11 MB
```

License
----
Apache-2.0
