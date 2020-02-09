import {cs2ts} from './Csharp2ts/extension'
import {getConfig} from './utils'
import {removeSpaces} from './main'

test('test csharp', () => {
    let tsContentFromCs: string = cs2ts(
        'public class Test {public string test;}',
        getConfig()
    )
    tsContentFromCs = removeSpaces(tsContentFromCs)
    let ts: string = removeSpaces('export interface Test {test: string;}')
    let ts1: string = removeSpaces('export interface Test{test: string;}')
    let ts2: string = removeSpaces('export interface Test test string;}')
    let tsFalse: string = removeSpaces('export interface Test {teststring;}')
    expect(ts).toBe(tsContentFromCs)
    expect(ts1).toBe(tsContentFromCs)
    expect(ts2).toBe(tsContentFromCs)
    expect(tsFalse).not.toBe(tsContentFromCs)
})
