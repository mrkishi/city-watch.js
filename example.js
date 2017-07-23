#!/usr/bin/env node

require('isomorphic-fetch')
// Or use any other `fetch` implementation:
//   global.fetch = require('node-fetch')

const CityWatch = require('.')
// Of course, in your own projects you should use the npm package name:
//   const CityWatch = require('city-watch')

const help = `
Usage:
	./example <email> <password>

Fetches the most up-to-date user information from Torn's City Watch API
`

if (process.argv.length !== 4) {
	console.log(help)
	process.exit(1)
}

const username = process.argv[2]
const password = process.argv[3]
const delay = 5

const account = new CityWatch.Account(username, password)
const monitor = new CityWatch.Monitor(account)

const format = (object) => JSON.stringify(object, null, '\t')
const sleep = (msec) => new Promise((resolve) => setTimeout(resolve, msec))

const example = async function () {

	try {
		console.log(`Getting login url...`)
		const url = await monitor.getLaunchURL()
		console.log(`Login url: ${ url }`)

		console.log(`Getting status...`)
		const status = await monitor.getStatus()
		console.log(`Status for "${ status.playername }": ${ format(status) }`)

		console.log(`Waiting ${ delay } seconds...`)
		await sleep(delay * 1000)

		console.log(`Getting status...`)
		const update = await monitor.getStatus()

		if (update.nochange) {
			console.log(`Status not yet changed!`)
		} else {
			console.log(`Status already changed: ${ format(update) }`)
		}
	} catch (error) {
		console.error(error)
	}

}

example()
