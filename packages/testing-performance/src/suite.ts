import _ from 'lodash'
import process from 'process'

function loadScript(src: string) {
    const script = document.createElement('script')
    script.src = src
    document.head.append(script)
}

// load benchmark.js
loadScript('https://cdnjs.cloudflare.com/ajax/libs/benchmark/2.1.4/benchmark.min.js')

var padSize = 23;

export function newSuite(name: string, log: (msg: string) => void) {
    var benches: any[] = [];

    const benchmark = (window as any).Benchmark.runInContext({ _, process });

    return new benchmark.Suite(name)
        .on("add", function (event: any) {
            benches.push(event.target);
        })
        .on("start", function () {
            log("benchmarking " + name + " performance ...");
        })
        .on("cycle", function (event: any) {
            log(String(event.target));
        })
        .on("complete", function () {
            if (benches.length > 1) {
                benches.sort(function (a, b) { return getHz(b) - getHz(a); });
                var fastest = benches[0],
                    fastestHz = getHz(fastest);
                log(pad(fastest.name, padSize) + " was " + "fastest");
                benches.slice(1).forEach(function (bench) {
                    var hz = getHz(bench);
                    var percent = 1 - hz / fastestHz;
                    log(pad(bench.name, padSize) + " was " + (percent * 100).toFixed(1) + "% ops/sec slower (factor " + (fastestHz / hz).toFixed(1) + ")");
                });
            }
        });
}

function getHz(bench: any) {
    return 1 / (bench.stats.mean + bench.stats.moe);
}

function pad(str: string, len: number) {
    while (str.length < len)
        str = " " + str;
    return str;
}
