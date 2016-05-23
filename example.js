#!/usr/bin/env node

require('isomorphic-fetch')
// Or use any other `fetch` implementation:
//   global.fetch = require('node-fetch')

const CityWatch = require('.')
// Of course, in your own projects you should use the npm package name:
//   const CityWatch = require('city-watch')

const help = `
Usage:
	./example <username> <password>

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

const json = (object) => JSON.stringify(object, null, '\t')
const wait = (msec) => new Promise((resolve) => setTimeout(resolve, msec))

// In reality, you probably wouldn't use promises and arrow functions this way.
// In this quick example, it's a hacky approach to ensure everything happens
// sequentially without the introduction of named functions

Promise.resolve()
	.then(() => console.log(`Getting login url...`))
	.then(() => monitor.getLaunchURL())
	.then((url) => console.log(`Login url: ${ url }`))

	.then(() => console.log(`Getting status...`))
	.then(() => monitor.getStatus())
	.then((status) => console.log(`Status for "${ status.playername }": ${ json(status) }`))

	.then(() => console.log(`Waiting ${ delay } seconds...`))
	.then(() => wait(delay * 1000))

	.then(() => console.log(`Getting status...`))
	.then(() => monitor.getStatus())
	.then((status) => console.log(`Status ${ status.nochange ?
		'not yet changed!' : `already changed: ${ json(status) }` }`))

	.catch((error) => console.error(error))
