export async function handleRequest(request, env, ctx) {
  const url = new URL(request.url)

  if (url.pathname.startsWith('/xrpc/'))
    url.host = env.API_HOST
  else
    url.host = env.CDN_HOST
  url.protocol = 'https:'
  url.port = ''

  return fetch(new Request(url.toString()))
}