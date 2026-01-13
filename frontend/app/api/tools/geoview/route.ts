import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const requestSchema = z.object({
  url: z
    .string()
    .url({ message: 'Invalid URL. Please include http:// or https://' })
    .refine((value) => value.startsWith('http://') || value.startsWith('https://'), {
      message: 'Only http/https URLs are supported.',
    }),
  country: z
    .string()
    .length(2, 'Country code must be a 2-letter ISO code.')
    .transform((value) => value.toUpperCase()),
});

const SUPPORTED_COUNTRIES = new Set([
  'DE',
  'US',
  'GB',
  'FR',
  'ES',
  'IT',
  'NL',
  'SE',
  'NO',
  'CA',
  'AU',
  'NZ',
  'BR',
  'MX',
  'JP',
  'KR',
  'CN',
  'IN',
  'AE',
  'ZA',
  'KE',
  'GH',
  'NG',
  'UG',
  'RW',
]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, country } = requestSchema.parse(body);

    if (!SUPPORTED_COUNTRIES.has(country)) {
      return NextResponse.json(
        {
          success: false,
          error: `Country ${country} is not supported yet.`,
        },
        { status: 400 },
      );
    }

    const apiKey = process.env.SCRAPINGBEE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'SCRAPINGBEE_API_KEY is not configured on the server.',
        },
        { status: 500 },
      );
    }

    const scrapingBeeUrl = new URL('https://app.scrapingbee.com/api/v1/');
    scrapingBeeUrl.searchParams.set('api_key', apiKey);
    scrapingBeeUrl.searchParams.set('url', url);
    scrapingBeeUrl.searchParams.set('country_code', country.toLowerCase());
    scrapingBeeUrl.searchParams.set('render_js', 'false');
    scrapingBeeUrl.searchParams.set('block_ads', 'true');
    scrapingBeeUrl.searchParams.set('timeout', '30000');

    const response = await fetch(scrapingBeeUrl.toString(), {
      headers: {
        Accept: 'text/html',
      },
      cache: 'no-store',
    });

    const html = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `ScrapingBee error: ${response.status} ${response.statusText}`,
          details: html?.slice(0, 2000) ?? null,
        },
        { status: response.status },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        url,
        country,
        html,
      },
    });
  } catch (error: any) {
    console.error('[GeoView API] error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: error.issues.map((issue) => issue.message).join(', '),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Unable to load the requested page. Please try again later.',
      },
      { status: 500 },
    );
  }
}

