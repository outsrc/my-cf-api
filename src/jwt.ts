export interface ValidateJWT {
  valid: boolean
  payload?: any
}

export async function isValidJwt (request: Request): Promise<ValidateJWT> {
  const encodedToken = getJwt(request)
  if (encodedToken === null) {
    return { valid: false }
  }

  const token = decodeJwt(encodedToken)

  let expiryDate = new Date(token.payload.exp * 1000)
  let currentDate = new Date(Date.now())
  if (expiryDate <= currentDate) {
    return { valid: false }
  }

  const valid = await isValidJwtSignature(token)
  return { valid, payload: token.payload }
}

function getJwt (request: Request) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || authHeader.substring(0, 6) !== 'Bearer') {
    return null
  }
  return authHeader.substring(6).trim()
}

function decodeJwt (token: any) {
  const parts = token.split('.')
  const header = JSON.parse(atob(parts[0]))
  const payload = JSON.parse(atob(parts[1]))
  const signature = atob(parts[2].replace(/_/g, '/').replace(/-/g, '+'))

  return {
    header: header,
    payload: payload,
    signature: signature,
    raw: { header: parts[0], payload: parts[1], signature: parts[2] }
  }
}

async function isValidJwtSignature (token: any) {
  const encoder = new TextEncoder()
  const data = encoder.encode([token.raw.header, token.raw.payload].join('.'))
  const signature = new Uint8Array(
    Array.from(token.signature).map((c: any) => c.charCodeAt(0))
  )

  const jwts = {
    keys: [
      {
        alg: 'RS256',
        kty: 'RSA',
        use: 'sig',
        n: 'rPB7M3RQ0LZ...',
        e: 'AQAB',
        kid: 'QzQ1QUZCNTI...',
        x5t: 'QzQ1QUZCNTI...',
        x5c: ['MIIC/zCCAeegAwIBAgI...']
      }
    ]
  }

  const key = await crypto.subtle.importKey(
    'jwk',
    jwts.keys[0],
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  )
  return crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, data)
}
