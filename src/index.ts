import { isValidJwt } from './jwt'
import { corsHeaders, handleOptions } from './cors'
import { KVNamespace } from '@cloudflare/workers-types'

declare const TODOS: KVNamespace

const withStatus = (status: number = 200, headers?: any) => ({
  status,
  headers: { ...corsHeaders, ...(headers || {}) }
})

async function handleGETRequests (request: Request, token: any) {
  const url = new URL(request.url)
  switch (url.pathname) {
    case '/status':
      return new Response(JSON.stringify({ hello: 'world' }), withStatus())

    case '/todos': {
      const todos = await TODOS.get(token.sub)

      return new Response(
        todos || '[]',
        withStatus(200, { 'Content-Type': 'application/json' })
      )
    }
  }

  return new Response(null, withStatus(404))
}

async function handlePOSTRequests (request: Request, token: any) {
  const url = new URL(request.url)
  switch (url.pathname) {
    case '/todos': {
      const payload = await request.json()
      const todos: any = (await TODOS.get(token.sub, 'json')) || []
      todos.push(payload.todo)
      await TODOS.put(token.sub, JSON.stringify(todos))

      return new Response(null, withStatus(204))
    }
  }

  return new Response(null, withStatus(400))
}

async function handleDELETERequests (request: Request, token: any) {
  const url = new URL(request.url)
  switch (url.pathname) {
    case '/todos': {
      const payload = await request.json()
      const todos: any = (await TODOS.get(token.sub, 'json')) || []
      const index = payload.index
      if (todos.length > 0 && index >= 0 && index < todos.length) {
        await TODOS.put(
          token.sub,
          JSON.stringify(todos.slice(0, index).concat(todos.slice(index + 1)))
        )
      }

      return new Response(null, withStatus(204))
    }
  }

  return new Response(null, withStatus(400))
}

async function handleRequest (request: Request) {
  const { valid, payload } = await isValidJwt(request)

  if (!valid) {
    return new Response(null, withStatus(403))
  }

  if (request.method === 'POST') {
    return handlePOSTRequests(request, payload)
  }
  if (request.method === 'DELETE') {
    return handleDELETERequests(request, payload)
  }

  return handleGETRequests(request, payload)
}

function handler (event: FetchEvent) {
  if (event.request.method === 'OPTIONS') {
    // Handle CORS preflight requests
    event.respondWith(handleOptions(event.request))
  } else {
    event.respondWith(handleRequest(event.request))
  }
}

addEventListener('fetch', handler)
