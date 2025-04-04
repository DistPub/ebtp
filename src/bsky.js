export async function handleRequest(request, env, ctx) {
  const url = new URL(request.url)

  if (url.pathname.startsWith('/xrpc/'))
    url.host = env.API_HOST
  else
    url.host = env.CDN_HOST
  url.protocol = 'https:'
  url.port = ''

  // note: direct use request got random 500, so copy headers
  const labelers = request.headers.get('atproto-accept-labelers')
  let headers = {}
  if (labelers) headers = {'atproto-accept-labelers': labelers}

  if (url.host === 'api.hukoubook.com') {
		return env.blueskyapi.fetch(new Request(url.toString(), {headers}))
	} else {
    return fetch(new Request(url.toString(), {headers}))
  }
}