import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'https://synapse-nexus-trajectory.onrender.com'

async function handler(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const targetUrl = `${BACKEND}/${path.join('/')}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  const auth = req.headers.get('authorization')
  if (auth) headers['Authorization'] = auth

  const init: RequestInit = {
    method: req.method,
    headers,
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const body = await req.text()
    if (body) init.body = body
  }

  try {
    const res = await fetch(targetUrl, init)
    const data = await res.text()
    return new NextResponse(data, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Proxy error:', err)
    return NextResponse.json({ detail: 'Backend unavailable' }, { status: 502 })
  }
}

export const GET = handler
export const POST = handler
export const PUT = handler
export const PATCH = handler
export const DELETE = handler
