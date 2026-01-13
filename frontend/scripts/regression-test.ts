#!/usr/bin/env ts-node
/**
 * Regression Test Suite
 * 
 * Validates that previously fixed issues don't regress after code changes.
 * Run before every deployment to catch regression issues early.
 * 
 * Usage: npm run regression-test
 *        or: ts-node scripts/regression-test.ts
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { readdir } from 'fs/promises';

interface RegressionTest {
  name: string;
  test: () => Promise<boolean>;
  critical: boolean;
  description: string;
}

interface TestResult {
  name: string;
  passed: boolean;
  critical: boolean;
  error?: string;
  details?: string;
}

const PROJECT_ROOT = resolve(__dirname, '..');
const PUBLIC_DIR = join(PROJECT_ROOT, 'public');
const APP_DIR = join(PROJECT_ROOT, 'app', '[locale]');

// Test Results
const results: TestResult[] = [];

// Helper: Log test result
function logResult(result: TestResult) {
  results.push(result);
  const icon = result.passed ? '✅' : '❌';
  const critical = result.critical ? ' [CRITICAL]' : '';
  console.log(`${icon} ${result.name}${critical}`);
  if (result.error) {
    console.log(`   Error: ${result.error}`);
  }
  if (result.details) {
    console.log(`   ${result.details}`);
  }
}

// Test 1: Payment Logos Exist
async function testPaymentLogos(): Promise<boolean> {
  const paymentLogosDir = join(PUBLIC_DIR, 'payment-logos');
  if (!existsSync(paymentLogosDir)) {
    logResult({
      name: 'Payment Logos Directory',
      passed: false,
      critical: true,
      error: `Directory ${paymentLogosDir} does not exist`,
    });
    return false;
  }

  const expectedLogos = [
    'visa.svg',
    'mastercard.svg',
    'paypal.svg',
    'stripe.svg',
    'apple-pay.svg',
    'google-pay.svg',
    'amazon-pay.svg',
    'klarna.svg',
    'mollie.svg',
    'samsung-pay.svg',
    'revolut-pay.svg',
    'link.svg',
    'kakao-pay.svg',
    'naver-pay.svg',
    'payco.svg',
  ];

  const existingFiles = readdirSync(paymentLogosDir);
  const missingLogos = expectedLogos.filter(logo => !existingFiles.includes(logo));

  if (missingLogos.length > 0) {
    logResult({
      name: 'Payment Logos Files',
      passed: false,
      critical: true,
      error: `Missing logos: ${missingLogos.join(', ')}`,
      details: `Found ${existingFiles.length} files, expected ${expectedLogos.length}`,
    });
    return false;
  }

  logResult({
    name: 'Payment Logos',
    passed: true,
    critical: true,
    details: `All ${expectedLogos.length} payment logos present`,
  });
  return true;
}

// Test 2: Critical Routes Have page.tsx
async function testCriticalRoutes(): Promise<boolean> {
  const criticalRoutes = [
    'page.tsx', // Homepage
    'dashboard/page.tsx',
    'bots/page.tsx',
    'auth/login/page.tsx',
    'auth/signup/page.tsx',
    'pricing/page.tsx',
    'contact/page.tsx',
    'support/messages/page.tsx',
    'settings/page.tsx',
    'legal/privacy/page.tsx',
    'legal/terms/page.tsx',
  ];

  const missingRoutes: string[] = [];

  for (const route of criticalRoutes) {
    const routePath = join(APP_DIR, route);
    if (!existsSync(routePath)) {
      missingRoutes.push(route);
    }
  }

  if (missingRoutes.length > 0) {
    logResult({
      name: 'Critical Routes',
      passed: false,
      critical: true,
      error: `Missing routes: ${missingRoutes.join(', ')}`,
      details: `Found ${criticalRoutes.length - missingRoutes.length}/${criticalRoutes.length} routes`,
    });
    return false;
  }

  logResult({
    name: 'Critical Routes',
    passed: true,
    critical: true,
    details: `All ${criticalRoutes.length} critical routes present`,
  });
  return true;
}

// Helper: Recursively find TypeScript files
function findTsFiles(dir: string, fileList: string[] = []): string[] {
  const files = readdirSync(dir, { withFileTypes: true });
  
  for (const file of files) {
    const filePath = join(dir, file.name);
    
    // Skip node_modules, .next, and test files
    if (file.name === 'node_modules' || file.name === '.next' || file.name.startsWith('.')) {
      continue;
    }
    
    if (file.isDirectory()) {
      findTsFiles(filePath, fileList);
    } else if (file.isFile() && /\.(ts|tsx)$/.test(file.name) && !file.name.includes('.test.') && !file.name.includes('.spec.')) {
      fileList.push(filePath);
    }
  }
  
  return fileList;
}

// Test 3: Static Assets Referenced in Code
async function testAssetReferences(): Promise<boolean> {
  // Find all TypeScript/TSX files (simplified approach without glob)
  const codeFiles = findTsFiles(PROJECT_ROOT);

  const assetReferences: string[] = [];
  const missingAssets: string[] = [];

  for (const file of codeFiles) {
    const filePath = join(PROJECT_ROOT, file);
    try {
      const content = readFileSync(filePath, 'utf-8');
      
      // Find asset references (payment-logos, screenshots, images)
      const assetPatterns = [
        /payment-logos\/([^'"`\s]+)/g,
        /screenshots\/([^'"`\s]+)/g,
        /images\/([^'"`\s]+)/g,
      ];

      for (const pattern of assetPatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const assetPath = match[1];
          assetReferences.push(assetPath);
          
          // Check if asset exists
          const assetDir = match[0].includes('payment-logos') 
            ? join(PUBLIC_DIR, 'payment-logos')
            : match[0].includes('screenshots')
            ? join(PUBLIC_DIR, 'screenshots')
            : join(PUBLIC_DIR, 'images');
          
          const fullAssetPath = join(assetDir, assetPath);
          if (!existsSync(fullAssetPath)) {
            missingAssets.push(`${match[0]} (referenced in ${file})`);
          }
        }
      }
    } catch (error) {
      // Skip files that can't be read
      continue;
    }
  }

  if (missingAssets.length > 0) {
    logResult({
      name: 'Asset References',
      passed: false,
      critical: true,
      error: `Missing assets referenced in code: ${missingAssets.slice(0, 5).join(', ')}${missingAssets.length > 5 ? '...' : ''}`,
      details: `Found ${assetReferences.length} asset references, ${missingAssets.length} missing`,
    });
    return false;
  }

  logResult({
    name: 'Asset References',
    passed: true,
    critical: true,
    details: `All ${assetReferences.length} asset references valid`,
  });
  return true;
}

// Test 4: Middleware Allows Static Files
async function testMiddlewareStaticFiles(): Promise<boolean> {
  const middlewarePath = join(PROJECT_ROOT, 'middleware.ts');
  if (!existsSync(middlewarePath)) {
    logResult({
      name: 'Middleware Static Files',
      passed: false,
      critical: true,
      error: 'middleware.ts not found',
    });
    return false;
  }

  const content = readFileSync(middlewarePath, 'utf-8');
  
  // Check if middleware allows static files
  const staticFilePatterns = [
    /\.(svg|png|jpg|jpeg|gif|ico)/i,
    /\.(mp4|webm)/i,
    /\.(woff|woff2|ttf|eot)/i,
    /\.(js|css)/i,
  ];

  const hasStaticFileCheck = staticFilePatterns.some(pattern => 
    content.match(new RegExp(pattern.source.replace(/\\\./g, '\\.'), 'i'))
  );

  // Check for early return for static files
  const hasEarlyReturn = content.includes('NextResponse.next()') && 
    (content.includes('pathname.match') || content.includes('pathname.startsWith'));

  if (!hasStaticFileCheck && !hasEarlyReturn) {
    logResult({
      name: 'Middleware Static Files',
      passed: false,
      critical: true,
      error: 'Middleware may block static files',
      details: 'No explicit static file handling found in middleware',
    });
    return false;
  }

  logResult({
    name: 'Middleware Static Files',
    passed: true,
    critical: true,
    details: 'Middleware allows static files',
  });
  return true;
}

// Test 5: TypeScript Compilation
async function testTypeScriptCompilation(): Promise<boolean> {
  // This is a simplified check - in production, you'd run `tsc --noEmit`
  const tsconfigPath = join(PROJECT_ROOT, 'tsconfig.json');
  if (!existsSync(tsconfigPath)) {
    logResult({
      name: 'TypeScript Config',
      passed: false,
      critical: true,
      error: 'tsconfig.json not found',
    });
    return false;
  }

  logResult({
    name: 'TypeScript Config',
    passed: true,
    critical: false,
    details: 'tsconfig.json exists (run `npm run build` for full check)',
  });
  return true;
}

// Test 6: Screenshots Directory
async function testScreenshotsDirectory(): Promise<boolean> {
  const screenshotsDir = join(PUBLIC_DIR, 'screenshots');
  if (!existsSync(screenshotsDir)) {
    logResult({
      name: 'Screenshots Directory',
      passed: false,
      critical: false,
      error: `Directory ${screenshotsDir} does not exist`,
    });
    return false;
  }

  const files = readdirSync(screenshotsDir).filter(file => 
    /\.(png|jpg|jpeg|webp)$/i.test(file)
  );

  if (files.length === 0) {
    logResult({
      name: 'Screenshots Directory',
      passed: false,
      critical: false,
      error: 'No screenshot files found',
    });
    return false;
  }

  logResult({
    name: 'Screenshots Directory',
    passed: true,
    critical: false,
    details: `Found ${files.length} screenshot files`,
  });
  return true;
}

// Main Test Runner
async function runRegressionTests() {
  console.log('🧪 Running Regression Tests...\n');
  console.log('⏱️  Starting tests (max 60 seconds)...\n');
  
  // Set overall timeout
  const startTime = Date.now();
  const MAX_DURATION = 60000; // 60 seconds

  const tests: RegressionTest[] = [
    {
      name: 'Payment Logos',
      test: testPaymentLogos,
      critical: true,
      description: 'Validates all payment logos exist',
    },
    {
      name: 'Critical Routes',
      test: testCriticalRoutes,
      critical: true,
      description: 'Validates all critical routes have page.tsx files',
    },
    {
      name: 'Asset References',
      test: testAssetReferences,
      critical: true,
      description: 'Validates all asset references in code point to existing files',
    },
    {
      name: 'Middleware Static Files',
      test: testMiddlewareStaticFiles,
      critical: true,
      description: 'Validates middleware allows static files',
    },
    {
      name: 'TypeScript Config',
      test: testTypeScriptCompilation,
      critical: false,
      description: 'Validates TypeScript configuration exists',
    },
    {
      name: 'Screenshots Directory',
      test: testScreenshotsDirectory,
      critical: false,
      description: 'Validates screenshots directory exists',
    },
  ];

  // Run all tests
  for (const test of tests) {
    // Check timeout
    if (Date.now() - startTime > MAX_DURATION) {
      logResult({
        name: 'Test Timeout',
        passed: false,
        critical: true,
        error: 'Tests exceeded 60 second timeout',
      });
      break;
    }
    
    try {
      await test.test();
    } catch (error) {
      logResult({
        name: test.name,
        passed: false,
        critical: test.critical,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Summary
  console.log('\n📊 Test Summary:');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const criticalFailed = results.filter(r => !r.passed && r.critical).length;

  console.log(`✅ Passed: ${passed}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  if (criticalFailed > 0) {
    console.log(`🚨 Critical Failures: ${criticalFailed}`);
  }

  // Exit code
  if (criticalFailed > 0) {
    console.log('\n❌ Regression tests failed! Do not deploy.');
    process.exit(1);
  } else if (failed > 0) {
    console.log('\n⚠️  Some tests failed, but none are critical. Review before deploying.');
    process.exit(0);
  } else {
    console.log('\n✅ All regression tests passed! Safe to deploy.');
    process.exit(0);
  }
}

// Run tests
runRegressionTests().catch(error => {
  console.error('Fatal error running regression tests:', error);
  process.exit(1);
});

