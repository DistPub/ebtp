import { currentEBTPGate, getBlob, getProfile, getRecord } from "./agent";

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
	let profile = await getProfile(env, id)
	let {did, handle} = profile
	let result = await getRecord(env, did, 'app.bsky.feed.post', rkey)
	let post = result.value
	console.log(JSON.stringify(result))
	let blog_blob = post?.embed?.external?.blog
	if (!blog_blob) return { error: 'NotEBTP', message: 'not found embed blog in the post'}

	let blog = await getBlob(env, did, blog_blob.ref.$link)
	let meta = post?.embed?.external?.meta
	return {profile, meta, blog}
}

// go service

async function go(env, postAt) {
	let [id, _, rkey] = postAt.slice('at://'.length).split('/')
	let profile = await getProfile(env, id)
	let {did, handle} = profile
	let gate = await currentEBTPGate(env, did)
	let uri = `/blog/${handle}/${rkey}`
	if (gate) {
		let gate_url = new URL(gate)
		if (gate_url.host !== 'ebtp.hukoubook.com' || gate_url.pathname !== '/go')
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
