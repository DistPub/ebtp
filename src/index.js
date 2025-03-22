export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);
		switch (url.pathname) {
			case '/message':
				return new Response('Hello, World!');
			case '/random':
				return new Response(crypto.randomUUID());
			case '/go':
				return await go(url.searchParams.get('u'))
			default:
				return new Response('Not Found', { status: 404 });
		}
	},
};

async function go(postAt) {
	let [did, _, rkey] = postAt.slice('at://'.length).split('/')
	let [instance, handle] = await resolveInstanceHandle(did)
	let gate = await currentEBTPGate(instance, did)
	let uri = `/blog/${handle}/${rkey}`
	if (gate) {
		let gate_url = new URL(gate)
		if (gate_url.host !== 'ebtp.hukoubook.com' || gate_url.pathname !== 'go')
			uri = convertStringToTemplate(gate, {postAt, did, handle, rkey})
	}
	return new Response(`<html><head><meta http-equiv="refresh" content="0; URL='${uri}'" /><style>:root { color-scheme: light dark; }</style></head></html>`, {
		headers: {
			'content-type': 'text/html'
		}
	})
}

function convertStringToTemplate(templateString, context) {
	const regex = /\${(\w+)}/g;

	// Replace placeholders with actual values from the context
	return templateString.replace(regex, (match, key) => {
		return key in context ? context[key] : match;
	});
}

async function resolveInstanceHandle(at_did) {
	let did_uri = undefined
	if (at_did.startsWith('did:plc:')) {
		did_uri = `https://plc.directory/${at_did}`
	} else {
		did_uri = `${at_did.slice('did:web:'.length)}/.well-known/did.json`
	}

	let response = await fetch(did_uri)
	let result = await response.json()

	let instance = undefined
	let handle = undefined

	for (let service of result.service) {
		if (service.id === '#atproto_pds') {
			let endpoint = new URL(service.serviceEndpoint)
			instance = endpoint.host
			break
		}
	}

	for (let aka of result.alsoKnownAs) {
		handle = aka.slice('at://'.length)
		break
	}

	if (!instance) throw Error('failed resolve #atproto_pds service')
	if (!handle) throw Error('failed resolve aka handle')
	return [instance, handle]
}

async function currentEBTPGate(instance, did) {
	let params = {repo: did, collection: 'com.hukoubook.ebtp.gate', rkey: 'self'}
	let result = await xrpc(instance, 'com.atproto.repo.getRecord', {params})
	return result?.value?.service
}

async function xrpc(instance, xrpc_method, {params = {}}) {
	let api = new URL(`https://${instance}/xrpc/${xrpc_method}`)
	let searchParams = new URLSearchParams()
	for (const [key, value] of Object.entries(params)) {
		searchParams.set(key, value)
	}
	api.search = searchParams.toString()

	let method = 'GET'
	let headers = {}
	let body = null
	let response = await fetch(api.toString(), {headers, method, body})
	let content_type = response.headers.get('content-type')
	if (content_type.startsWith('application/json')) return await response.json()
	return await response.text()
}
