import { NextResponse } from 'next/server';

/**
 * Health Check Endpoint
 * Wird von nginx verwendet um zu prüfen ob der Server läuft
 * Optimiert für Load-Tests - absolut stateless, keine I/O
 */
export async function GET() {
  // Stateless response - keine Abhängigkeiten, keine Async-Ops
  return new Response(
    JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=5',  // Cache für 5 Sekunden
        'X-Response-Time': Date.now().toString(),
      },
    }
  );
}

// Kein Revalidate - dynamisch
export const dynamic = 'force-dynamic';

