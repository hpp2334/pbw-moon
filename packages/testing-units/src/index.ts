import * as chai from 'chai'
import chaiBytes from 'chai-bytes'
import { ByteVec, Writer, ByteVecSnapshot } from "pbw-moon"
import chance from 'chance'
import * as protos from 'pbw-moon-testing-protos'
import { generateRandomLayers } from './utils'
const { expect } = chai.use(chaiBytes)

export {
    expect,
    chance,
    ByteVec,
    Writer,
    protos,
    ByteVecSnapshot,
    generateRandomLayers,
}