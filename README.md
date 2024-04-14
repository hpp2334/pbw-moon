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

Currently, on the browser, encoding small objects has similar performance compared to official writer, but encoding large objects (30 MB) is faster. Run `pnpm dev` in `testing-performance` package, and click "Benchmark Suite" to see the result.

```log
benchmarking encoding - bench performance ...
[offical] protobuf.js (static) x 1,242,859 ops/sec ±1.62% (65 runs sampled)
[pbw-moon] protobuf.js (static) x 1,480,685 ops/sec ±0.36% (66 runs sampled)
[pbw-moon] protobuf.js (static) was fastest
[offical] protobuf.js (static) was 17.1% ops/sec slower (factor 1.2)

benchmarking encoding - partialSketch performance ...
[offical] protobuf.js (static) x 0.80 ops/sec ±9.45% (6 runs sampled)
[pbw-moon] protobuf.js (static) x 3.51 ops/sec ±3.34% (13 runs sampled)
[pbw-moon] protobuf.js (static) was fastest
[offical] protobuf.js (static) was 78.6% ops/sec slower (factor 4.7)
```

License
----
Apache-2.0
