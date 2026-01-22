import 'server-only'

import { NextResponse } from 'next/server'

export function ensureAdapterSecret(request: Request) {
  const expected = process.env.ADAPTER_SECRET
  const received = request.headers.get('x-adapter-secret')

  if (!expected || received !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}
