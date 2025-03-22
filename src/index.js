export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);

		if (/\/blog\/.+?\/.+?/.test(url.pathname)) {
			url.pathname = '/blog'
			return env.ASSETS.fetch(new Request(url.toString()));
		}
		switch (url.pathname) {
			case '/go':
				return await go(env, url.searchParams.get('u'))
			case '/data':
				let data = await getData(env, url.searchParams.get('id'), url.searchParams.get('rkey'))
				return new Response(JSON.stringify(data), {
					headers: {
						'content-type': 'application/json'
					}
				})
			default:
				return new Response('Not Found', { status: 404 });
		}
	},
};

async function getData(env, id, rkey) {
	if (!id || !rkey) return { error: 'BadParams', message: `bad params`}
	let profile = await getProfile(id)
	let {did, handle} = profile
	let instance = await resolveInstance(env, did)

	let params = {repo: did, collection: 'app.bsky.feed.post', rkey}
	let result = await xrpc(instance, 'com.atproto.repo.getRecord', { params })
	let post = result.value
	let blog_blob = post?.embed?.external?.blog
	if (!blog_blob) return { error: 'NotEBTP', message: 'not found embed blog in the post'}

	params = {
		did,
		cid: blog_blob.ref.$link
	}
	let blog = await xrpc(instance, 'com.atproto.sync.getBlob', {params})
	let meta = post?.embed?.external?.meta
	return {profile, meta, blog}
}

// go service

async function getProfile(id) {
	return await xrpc('public.api.bsky.app', 'app.bsky.actor.getProfile', {params: {actor: id}})
}

async function go(env, postAt) {
	let [id, _, rkey] = postAt.slice('at://'.length).split('/')
	let profile = await getProfile(id)
	let {did, handle} = profile
	let instance = await resolveInstance(env, did)
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

async function resolveInstance(env, at_did) {
	let did_uri = undefined
	if (at_did.startsWith('did:plc:')) {
		did_uri = `https://plc.directory/${at_did}`
	} else {
		did_uri = `https://${at_did.slice('did:web:'.length)}/.well-known/did.json`
	}

	let response = undefined

	// special for hukoubook user
	if (did_uri.endsWith('.hukoubook.com/.well-known/did.json')) {
		response = await env.nginx.fetch(new Request(did_uri))
	} else {
		response = await fetch(did_uri)
	}

	let result = await response.json()
	for (let service of result.service) {
		if (service.id === '#atproto_pds') {
			let endpoint = new URL(service.serviceEndpoint)
			return endpoint.host
		}
	}
	throw Error('failed resolve #atproto_pds service')
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
