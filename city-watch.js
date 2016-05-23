
const qs = require('qs')
const CryptoJS = require('crypto-js')

const hash = {

	password(password) {
		const scramble = 'z9(p&NE|Y7o_yi8o|AY}mykoZ"6Boy}ZH3\\vSf@Dfh$M)+"+1"xjCxC_t>;]apv'
		return CryptoJS.HmacSHA512(password, scramble).toString()
	},

	utp(username, time, password) {
		return CryptoJS.MD5(username.toLowerCase() + time + password).toString()
	},

}

class Account {

	constructor(username, password, os = 'win') {

		this.username = username
		this.password = CityWatch.hash.password(password)
		this.os = os

	}

}

class Endpoint {

	constructor({ https = false, urls = CityWatch.endpoints.production.urls, ttl = 1800 } = {}) {

		this.protocol = https ? 'https://' : 'http://'
		this.urls = urls
		this.ttl = ttl

		this.lastTimeServerSec = 0
		this.lastTimeLocalMsec = 0

	}

	get base()   { return this.protocol + this.urls.domain }
	get api()    { return this.protocol + this.urls.api    }
	get time()   { return this.protocol + this.urls.time   }
	get launch() { return this.protocol + this.urls.launch }

	getTime() {

		const deltaSec = (Date.now() - this.lastTimeLocalMsec) / 1000 |0

		if (deltaSec < this.ttl) {

			// Cache server time for the ttl, avoiding a round-trip
			return Promise.resolve(this.lastTimeServerSec + deltaSec)

		} else {

			return fetch(this.time)
				.then((response) => response.text())
				.then((time) => {

					this.lastTimeServerSec = parseInt(time, 10)
					this.lastTimeLocalMsec = Date.now()

					return this.lastTimeServerSec

				})

		}

	}

}

class Monitor {

	constructor(account, endpoint = CityWatch.endpoints.production) {

		this.account = account
		this.endpoint = endpoint

		this.lastResults = new Map()
		this.lastErrors = new Map()

	}

	request(type) {

		const lastResult = this.lastResults[type] || {}

		return this.endpoint.getTime()
			.then((time) => {

				const headers = {
					'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
				}

				const data = {
					version: CityWatch.API_VERSION,
					os: this.account.os,
					request: type,
					username: this.account.username,
					time: time,
					hashutp: CityWatch.hash.utp(this.account.username, time, this.account.password),
					lastchecksum: lastResult.checksum,
				}

				return fetch(this.endpoint.api, {
					method: 'POST',
					headers: headers,
					body: qs.stringify(data),
				})

			})
			.then((response) => response.text())
			.then((text) => {

				let result

				try {
					result = JSON.parse(text)
				} catch (err) {
					result = {
						success: false,
						error_text: text,
					}
				}

				if (result.success !== true) {

					this.lastErrors[type] = result.error_text
					throw new Error(result.error_text)

				} else if (result.nochange) {

					lastResult.nochange = result.nochange
					result = lastResult

				}

				result.local_time = Date.now()

				this.lastErrors[type] = null
				this.lastResults[type] = result

				return result

			})

	}

	getStatus() {

		return this.request(CityWatch.REQUEST_TYPES.GET_USER_INFO)

	}

	getLaunchURL(redirect = undefined, id = undefined) {

		return this.endpoint.getTime()
			.then((time) => {

				const query = {
					version: CityWatch.API_VERSION,
					username: this.account.username,
					time: time,
					hashutp: CityWatch.hash.utp(this.account.username, time, this.account.password),
					redirect: redirect,
					id: id,
				}

				return this.endpoint.launch + '?' + qs.stringify(query)

			})

	}

	getMessageURL(id = undefined) {

		return this.getLaunchURL('messages', id)

	}

	getEventURL(id = undefined) {

		return this.getLaunchURL('events', id)

	}

}

const CityWatch = module.exports = {

	API_VERSION: '2.0.6',
	REQUEST_TYPES: { GET_USER_INFO: 'getUserInfo' },

	Account,
	Monitor,
	Endpoint,

	hash,

	endpoints: {

		production: new Endpoint({
			urls: {
				domain: 'www.torn.com',
				api:    'www.torn.com/citywatch/api.php',
				time:   'www.torn.com/citywatch/time.php',
				launch: 'www.torn.com/citywatch-auth.php',
			}
		}),

		development: new Endpoint({
			urls: {
				domain: 'dev-www.torn.com',
				api:    'dev-www.torn.com/citywatch/api.php',
				time:   'dev-www.torn.com/citywatch/time.php',
				launch: 'dev-www.torn.com/citywatch-auth.php',
			}
		}),

		debug: new Endpoint({
			urls: {
				domain: 'files.jamesgooding.co.uk',
				api:    'files.jamesgooding.co.uk/torn/info.php',
				time:   'files.jamesgooding.co.uk/torn/time.php',
				launch: 'files.jamesgooding.co.uk/torn/auth.php',
			}
		}),

	},

}
