import fs, { readFileSync } from "fs"
// @ts-ignore
import { Session } from 'node:inspector/promises'
import { Writer } from 'pbw-moon'
import * as protos from 'pbw-moon-testing-protos'
import path from "path"

const benchMessagePayload = JSON.parse(readFileSync(path.resolve(__dirname, './data/bench.json'), 'utf-8'))

const count = 10000000;

async function main() {
    console.log("profile bench.proto");

    const session = new Session();
    session.connect();
    await session.post('Profiler.enable');
    await session.post('Profiler.start');

    for (var i = 0; i < count; ++i)
        protos.Test.encode(benchMessagePayload, new Writer()).finish();

    const { profile } = await session.post('Profiler.stop');
    fs.writeFileSync('./profile.cpuprofile', JSON.stringify(profile));
}
main()