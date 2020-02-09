import * as core from '@actions/core'
import * as github from '@actions/github'
import * as yaml from 'js-yaml'
import {Minimatch} from 'minimatch'
import {cs2ts} from './Csharp2ts/extension'

async function run() {
    try {
        const token = core.getInput('repo-token', {required: true})
        const configPath = core.getInput('configuration-path', {required: true})

        const prNumber = getPrNumber()
        if (!prNumber) {
            console.log(
                'Could not get pull request number from context, exiting'
            )
            return
        }

        const client = new github.GitHub(token)

        core.debug(`fetching changed files for pr #${prNumber}`)
        const changedFiles: changedFile[] = await getChangedFiles(
            client,
            prNumber
        )
        const labelGlobs: Map<string, string[]> = await getLabelGlobs(
            client,
            configPath
        )

        const labels: string[] = []
        const csGlob = labelGlobs['cs']
        const changedCsFile: changedFile[] = []
        for (const changedFile of changedFiles.entries()) {
            if (checkGlob(changedFile[1], csGlob)) {
                changedCsFile.push(changedFile[1])
            }
        }

        if (changedCsFile.length > 0) {
            await addLabels(client, prNumber, ['csFileChanged'])
        }
    } catch (error) {
        core.error(error)
        core.setFailed(error.message)
    }
}

function getPrNumber(): number | undefined {
    const pullRequest = github.context.payload.pull_request
    if (!pullRequest) {
        return undefined
    }

    return pullRequest.number
}

interface changedFile {
    name: string
    contentUrl: string
}

async function getChangedFiles(
    client: github.GitHub,
    prNumber: number
): Promise<changedFile[]> {
    const listFilesResponse = await client.pulls.listFiles({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        pull_number: prNumber
    })

    const changedFiles = listFilesResponse.data.map(f => {
        return {name: f.filename, contentUrl: f.contents_url}
    })

    core.debug('found changed files:')
    for (const file of changedFiles) {
        core.debug('  ' + file)
    }

    return changedFiles
}

async function getLabelGlobs(
    client: github.GitHub,
    configurationPath: string
): Promise<Map<string, string[]>> {
    const configurationContent: string = await fetchContent(
        client,
        configurationPath
    )

    // loads (hopefully) a `{[label:string]: string | string[]}`, but is `any`:
    const configObject: any = yaml.safeLoad(configurationContent)

    // transform `any` => `Map<string,string[]>` or throw if yaml is malformed:
    return getLabelGlobMapFromObject(configObject)
}

async function fetchContent(
    client: github.GitHub,
    repoPath: string
): Promise<string> {
    const response = await client.repos.getContents({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        path: repoPath,
        ref: github.context.sha
    })

    return Buffer.from(response.data.content, 'base64').toString()
}

function getLabelGlobMapFromObject(configObject: any): Map<string, string[]> {
    const labelGlobs: Map<string, string[]> = new Map()
    for (const label in configObject) {
        if (typeof configObject[label] === 'string') {
            labelGlobs.set(label, [configObject[label]])
        } else if (configObject[label] instanceof Array) {
            labelGlobs.set(label, configObject[label])
        } else {
            throw Error(
                `found unexpected type for label ${label} (should be string or array of globs)`
            )
        }
    }

    return labelGlobs
}

function checkGlob(changedFile: changedFile, glob: string): boolean {
    core.debug(` checking pattern ${glob}`)
    const matcher = new Minimatch(glob)
    core.debug(` - ${changedFile}`)
    if (matcher.match(changedFile.name)) {
        core.debug(` ${changedFile} matches`)
        return true
    }
    return false
}

async function addLabels(
    client: github.GitHub,
    prNumber: number,
    labels: string[]
) {
    await client.issues.addLabels({
        owner: github.context.repo.owner,
        repo: github.context.repo.repo,
        issue_number: prNumber,
        labels: labels
    })
}

run()
