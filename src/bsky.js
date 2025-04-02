export async function handleRequest(request, env, ctx) {
  const url = new URL(request.url)

  if (url.pathname.startsWith('/xrpc/'))
    url.host = env.API_HOST
  else
    url.host = env.CDN_HOST
  url.protocol = 'https:'
  url.port = ''

  if (url.host === 'api.hukoubook.com') {
		return env.blueskyapi.fetch(new Request(url.toString(), request))
	} else {
    return fetch(new Request(url.toString(), request))
  }
}