import * as core from '@actions/core'
import * as github from '@actions/github'
import * as yaml from 'js-yaml'
import { Minimatch } from 'minimatch'
import { cs2ts } from './Csharp2ts/extension'
import { getConfig, errorLabels } from './utils'

async function run() {
	try {
		const token = core.getInput('repo-token', { required: true })
		const configPath = core.getInput('configuration-path', { required: true })

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

		const changedCsFile: changedFile[] = []
		let csPath: string = ''
		let tsPath: string = ''
		for (const [label, globs] of labelGlobs.entries()) {
			if (label === 'cs') {
				for (let i = 0; i < changedFiles.length; i++) {
					if (checkGlob(changedFiles[i], globs)) {
						changedCsFile.push(changedFiles[i])
					}
				}
				csPath = globs[0].replace(/\*/, '')
			} else if (label === 'ts') {
				tsPath = globs[0].replace(/\*/, '')
			}
		}

		let commentList: string[] = ['Cs to ts checks', '']
		let allMatching: boolean = true;

		for (let i = 0; i < changedCsFile.length; i++) {
			let tsFileName: string = changedCsFile[i].name
				.replace(csPath, tsPath)
				.replace(/cs/g, 'ts')
			const csFileContent: string = await fetchContent(
				client,
				changedCsFile[i].name
			)
			let tsContent: string = ''
			try {
				tsContent = await fetchContent(client, tsFileName)
			} catch {

			}
			const tsContentFromCs: string = cs2ts(csFileContent, getConfig())
			if (removeSpaces(tsContentFromCs) !== removeSpaces(tsContent)) {
				commentList.push(
					`**${changedCsFile[i].name} not matching ${tsFileName} content**`
				)
				allMatching = false;
			}
			// TODO : Add the possibility to also show files matching in config
			// else {
			// 	commentList.push(
			// 		`*${changedCsFile[i].name} matching ${tsFileName} content*`
			// 	)
			// }
		}

		if (!allMatching) {
			await addLabels(client, prNumber, [errorLabels.notMatching])
		} else {
			await removeLabel(client, prNumber, errorLabels.notMatching);
			commentList.push("All files matching");
		}
		await addComment(client, prNumber, commentList.join('\n'))
	} catch (error) {
		core.error(error)
		core.setFailed(error.message)
	}
}

export function removeSpaces(str: string): string {
	str = str.replace(/[{};:,]/g, ' ')
	return str.replace(/ +(?= )/g, '')
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
		return { name: f.filename, contentUrl: f.contents_url }
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

function checkGlob(changedFile: changedFile, globs: string[]): boolean {
	for (const glob of globs) {
		core.debug(` checking pattern ${glob}`)
		core.debug(` checking pattern ${glob}`)
		const matcher = new Minimatch(glob)
		core.debug(` - ${changedFile}`)
		if (matcher.match(changedFile.name)) {
			core.debug(` ${changedFile} matches`)
			return true
		}
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

async function removeLabel(
	client: github.GitHub,
	prNumber: number,
	label: string
) {
	try {
		await client.issues.removeLabel({
			owner: github.context.repo.owner,
			repo: github.context.repo.repo,
			issue_number: prNumber,
			name: label
		})
	} catch {
		// Label does not exist
	}
}

async function addComment(
	client: github.GitHub,
	prNumber: number,
	comment: string
) {
	await client.issues.createComment({
		owner: github.context.repo.owner,
		repo: github.context.repo.repo,
		issue_number: prNumber,
		body: comment
	})
}

run()
