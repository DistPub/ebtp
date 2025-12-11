export async function getProfile(env, actor) {
	const url = new URL('https://fatesky.hukoubook.com/xrpc/app.bsky.actor.getProfile')
	url.searchParams.set('actor', actor)
	const res = await env.fatesky.fetch(new Request(url))
	return await res.json()
}

export async function currentEBTPGate(env, did) {
	const data = await getRecord(env, did, 'com.hukoubook.ebtp.gate', 'self')
	return data?.value?.service
}

export async function getRecord(env, repo, collection, rkey) {
	const url = new URL('https://fatesky.hukoubook.com/xrpc/com.atproto.repo.getRecord')
	url.searchParams.set('repo', repo)
	url.searchParams.set('collection', collection)
	url.searchParams.set('rkey', rkey)
	const res = await env.fatesky.fetch(new Request(url))
	return await res.json()
}

export async function getBlob(env, did, cid) {
	const url = new URL('https://fatesky.hukoubook.com/xrpc/com.atproto.sync.getBlob')
	url.searchParams.set('did', did)
	url.searchParams.set('cid', cid)
	const res = await env.fatesky.fetch(new Request(url))
	return await res.text()
}
