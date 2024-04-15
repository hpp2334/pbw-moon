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

Currently, encoding small objects is slower than the official writer (in Node.js), but encoding large objects (30 MB) is faster. Run `pnpm benchmark` to see the result.

```log
[Offical] encode bench
time 0.519778804987669 s
heapTotal increase 10.75 MB

[pbw-moon] encode bench
time 1.882222745001316 s
heapTotal increase 0 MB

[Offical] encode partialSketch
time 0.9394721720218658 s
heapTotal increase 318.75 MB

[pbw-moon] encode partialSketch
time 0.30044887098670003 s
heapTotal increase 8.25 MB
```

License
----
Apache-2.0
