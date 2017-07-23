
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

	constructor({ urls = CityWatch.endpoints.production.urls, ttl = 1800 } = {}) {

		this.urls = urls
		this.ttl = ttl

		this.lastTimeServerSec = 0
		this.lastTimeLocalMsec = 0

	}

	async getTime() {

		const deltaSec = Math.ceil((Date.now() - this.lastTimeLocalMsec) / 1000)

		if (deltaSec < this.ttl) {

			// Cache server time for the ttl, avoiding a round-trip
			return this.lastTimeServerSec + deltaSec

		} else {

			const response = await fetch(this.urls.time)
			const time = await response.text()

			this.lastTimeServerSec = parseInt(time, 10)
			this.lastTimeLocalMsec = Date.now()

			return this.lastTimeServerSec

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

	async request(type) {

		const lastResult = this.lastResults[type] || {}

		const time = await this.endpoint.getTime()

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

		const response = await fetch(this.endpoint.urls.api, {
			method: 'POST',
			headers: headers,
			body: qs.stringify(data),
		})

		let result

		try {
			result = await response.json()
		} catch (err) {
			result = {
				success: false,
				error_text: err.toString(),
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

	}

	async getStatus() {

		return this.request(CityWatch.REQUEST_TYPES.GET_USER_INFO)

	}

	async getLaunchURL(redirect, id) {

		const time = await this.endpoint.getTime()

		const query = {
			version: CityWatch.API_VERSION,
			username: this.account.username,
			time: time,
			hashutp: CityWatch.hash.utp(this.account.username, time, this.account.password),
			redirect: redirect,
			id: id,
		}

		return this.endpoint.urls.launch + '?' + qs.stringify(query)

	}

	async getMessageURL(id) {

		return this.getLaunchURL('messages', id)

	}

	async getEventURL(id) {

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
				base:   'https://www.torn.com/',
				api:    'https://www.torn.com/citywatch/api.php',
				time:   'https://www.torn.com/citywatch/time.php',
				launch: 'https://www.torn.com/citywatch-auth.php',
			}
		}),

		development: new Endpoint({
			urls: {
				base:   'https://dev-www.torn.com/',
				api:    'https://dev-www.torn.com/citywatch/api.php',
				time:   'https://dev-www.torn.com/citywatch/time.php',
				launch: 'https://dev-www.torn.com/citywatch-auth.php',
			}
		}),

		debug: new Endpoint({
			urls: {
				base:   'https://files.jamesgooding.co.uk/',
				api:    'https://files.jamesgooding.co.uk/torn/info.php',
				time:   'https://files.jamesgooding.co.uk/torn/time.php',
				launch: 'https://files.jamesgooding.co.uk/torn/auth.php',
			}
		}),

	},

}
