import { NextResponse } from 'next/server'

import { orchestratorFetch } from '@/lib/orchestrator'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))

    const data = await orchestratorFetch('/notifications/test-connection', {
      method: 'POST',
      body: { locale: body.locale || 'en', config: body.config }
    })

    
return NextResponse.json(data)
  } catch (error: any) {
    if ((error as any)?.code !== 'ORCHESTRATOR_UNAVAILABLE') {
      console.error('Failed to test SMTP connection:', error)
    }
    
return NextResponse.json(
      { success: false, error: error.message || 'Failed to test SMTP connection' },
      { status: 200 }
    )
  }
}
