#!/usr/bin/env node
/**
 * Link-Test-Skript für whatsapp.owona.de
 * 
 * Testet alle Links auf allen Seiten und generiert einen Report
 * Verwendet einfache HTTP-Requests statt Puppeteer für bessere Performance
 */

import { writeFileSync } from 'fs';
import { join } from 'path';

const BASE_URL = process.env.TEST_BASE_URL || 'https://whatsapp.owona.de';
const LOCALE = 'de';

interface LinkResult {
  url: string;
  status: number | 'timeout' | 'error' | 'skipped';
  error?: string;
  sourcePage: string;
  isExternal: boolean;
}

interface PageResult {
  url: string;
  status: number | 'timeout' | 'error';
  links: LinkResult[];
  error?: string;
}

const publicPages = [
  '/',
  '/pricing',
  '/templates',
  '/docs',
  '/legal/privacy',
  '/legal/terms',
  '/legal/cookies',
  '/legal/data-processing',
  '/demo/bot-builder',
  '/demo/dashboard',
  '/demo/analytics',
  '/demo/knowledge',
  '/demo/settings',
  '/demo/features',
  '/demo/designs/minimal',
  '/demo/designs/night',
  '/demo/designs/datawave',
  '/auth/login',
  '/auth/signup',
  '/auth/forgot-password',
  '/contact',
  '/resources',
  '/screenshots',
  '/tools/geoview',
];

const protectedPages = [
  '/dashboard',
  '/bots',
  '/bots/new',
  '/settings',
  '/support/messages',
  '/dashboard/monitoring',
  '/checkout',
];

async function testUrl(url: string, method: 'GET' | 'HEAD' = 'HEAD'): Promise<{ status: number; error?: string }> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 Sekunden Timeout
    
    const response = await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LinkTester/1.0)',
      },
    });
    
    clearTimeout(timeoutId);
    return { status: response.status };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return { status: 'timeout' as const, error: 'Request timeout' };
    }
    return { status: 'error' as const, error: error.message || 'Unknown error' };
  }
}

async function extractLinksFromHtml(html: string, baseUrl: string): Promise<string[]> {
  const links: string[] = [];
  const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>/gi;
  let match;
  
  while ((match = linkRegex.exec(html)) !== null) {
    const href = match[1];
    if (href && !href.startsWith('javascript:') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
      // Relative URLs zu absoluten URLs konvertieren
      let absoluteUrl: string;
      if (href.startsWith('http')) {
        absoluteUrl = href;
      } else if (href.startsWith('/')) {
        absoluteUrl = `${BASE_URL}${href}`;
      } else {
        absoluteUrl = new URL(href, baseUrl).href;
      }
      links.push(absoluteUrl);
    }
  }
  
  return [...new Set(links)]; // Duplikate entfernen
}

async function testPage(path: string, requiresAuth = false): Promise<PageResult> {
  const fullUrl = `${BASE_URL}/${LOCALE}${path}`;
  
  console.log(`Testing page: ${fullUrl}`);
  
  try {
    // Seite abrufen
    const pageResponse = await testUrl(fullUrl, 'GET');
    
    if (typeof pageResponse.status === 'string') {
      return {
        url: fullUrl,
        status: pageResponse.status,
        error: pageResponse.error,
        links: [],
      };
    }
    
    // HTML abrufen für Link-Extraktion
    const htmlResponse = await fetch(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LinkTester/1.0)',
      },
    });
    
    if (!htmlResponse.ok) {
      return {
        url: fullUrl,
        status: htmlResponse.status,
        links: [],
      };
    }
    
    const html = await htmlResponse.text();
    const links = await extractLinksFromHtml(html, fullUrl);
    
    console.log(`  Found ${links.length} links`);
    
    // Links testen (max 50 pro Seite um Zeit zu sparen)
    const linksToTest = links.slice(0, 50);
    const linkResults: LinkResult[] = [];
    
    for (const link of linksToTest) {
      const isExternal = link.startsWith('http') && !link.includes('whatsapp.owona.de');
      const result = await testUrl(link, isExternal ? 'HEAD' : 'GET');
      
      linkResults.push({
        url: link,
        status: typeof result.status === 'number' ? result.status : result.status,
        error: result.error,
        sourcePage: fullUrl,
        isExternal,
      });
      
      if (result.status === 200 || result.status === 301 || result.status === 302) {
        process.stdout.write('.');
      } else {
        process.stdout.write('X');
      }
    }
    
    console.log(`\n  Tested ${linkResults.length} links`);
    
    return {
      url: fullUrl,
      status: pageResponse.status,
      links: linkResults,
    };
  } catch (error: any) {
    return {
      url: fullUrl,
      status: 'error',
      error: error.message,
      links: [],
    };
  }
}

async function main() {
  console.log('🚀 Starting Link Test for whatsapp.owona.de\n');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Locale: ${LOCALE}\n`);
  
  const results: PageResult[] = [];
  const allLinks = new Map<string, LinkResult[]>();
  
  // Öffentliche Seiten testen
  console.log('\n📄 Testing public pages...\n');
  for (const path of publicPages) {
    const result = await testPage(path, false);
    results.push(result);
    
    // Links sammeln
    result.links.forEach((link) => {
      if (!allLinks.has(link.url)) {
        allLinks.set(link.url, []);
      }
      allLinks.get(link.url)!.push(link);
    });
  }
  
  // Geschützte Seiten testen (ohne Login - sollte Redirect zeigen)
  console.log('\n🔒 Testing protected pages (without auth)...\n');
  for (const path of protectedPages) {
    const result = await testPage(path, true);
    results.push(result);
    
    result.links.forEach((link) => {
      if (!allLinks.has(link.url)) {
        allLinks.set(link.url, []);
      }
      allLinks.get(link.url)!.push(link);
    });
  }
  
  // Report generieren
  console.log('\n📊 Generating report...\n');
  
  const brokenLinks = Array.from(allLinks.entries())
    .filter(([_, links]) => {
      return links.some((link) => {
        const status = link.status;
        return status !== 200 && status !== 301 && status !== 302 && status !== 'skipped';
      });
    })
    .map(([url, links]) => ({
      url,
      results: links,
      firstError: links.find((l) => l.status !== 200 && l.status !== 301 && l.status !== 302 && l.status !== 'skipped'),
    }));
  
  const report = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    locale: LOCALE,
    summary: {
      totalPages: results.length,
      pagesWithErrors: results.filter((r) => r.status !== 200 && r.status !== 301 && r.status !== 302).length,
      totalLinks: Array.from(allLinks.keys()).length,
      brokenLinks: brokenLinks.length,
    },
    pages: results,
    brokenLinks: brokenLinks.map((bl) => ({
      url: bl.url,
      status: bl.firstError?.status,
      error: bl.firstError?.error,
      foundOn: bl.results.map((r) => r.sourcePage),
    })),
  };
  
  const reportPath = join(process.cwd(), 'link-test-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log('\n✅ Report generated:', reportPath);
  console.log('\n📈 Summary:');
  console.log(`  Total pages tested: ${report.summary.totalPages}`);
  console.log(`  Pages with errors: ${report.summary.pagesWithErrors}`);
  console.log(`  Total unique links: ${report.summary.totalLinks}`);
  console.log(`  Broken links: ${report.summary.brokenLinks}`);
  
  if (brokenLinks.length > 0) {
    console.log('\n❌ Broken links:');
    brokenLinks.forEach((bl) => {
      console.log(`  - ${bl.url} (Status: ${bl.firstError?.status})`);
      console.log(`    Found on: ${bl.results[0]?.sourcePage}`);
    });
  }
  
  console.log('\n✅ Link test completed!');
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
