#!/usr/bin/env ts-node
/**
 * Fast Regression Test Suite
 * 
 * Schnelle Regression-Tests ohne Datei-Scanning.
 * Fokus auf kritische Checks die schnell durchführbar sind.
 * 
 * Usage: npm run regression-test:fast
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, resolve } from 'path';

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

const results: TestResult[] = [];

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

// Test 1: Payment Logos (schnell - nur Verzeichnis prüfen)
function testPaymentLogos(): boolean {
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

  const expectedLogos = ['visa.svg', 'mastercard.svg', 'paypal.svg', 'stripe.svg'];
  const existingFiles = readdirSync(paymentLogosDir);
  const missingLogos = expectedLogos.filter(logo => !existingFiles.includes(logo));

  if (missingLogos.length > 0) {
    logResult({
      name: 'Payment Logos (Critical)',
      passed: false,
      critical: true,
      error: `Missing: ${missingLogos.join(', ')}`,
    });
    return false;
  }

  logResult({
    name: 'Payment Logos',
    passed: true,
    critical: true,
    details: `All critical logos present (${existingFiles.length} total)`,
  });
  return true;
}

// Test 2: Critical Routes (schnell - nur page.tsx prüfen)
function testCriticalRoutes(): boolean {
  const criticalRoutes = [
    'page.tsx',
    'dashboard/page.tsx',
    'pricing/page.tsx',
    'contact/page.tsx',
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
      error: `Missing: ${missingRoutes.join(', ')}`,
    });
    return false;
  }

  logResult({
    name: 'Critical Routes',
    passed: true,
    critical: true,
    details: `All ${criticalRoutes.length} routes present`,
  });
  return true;
}

// Test 3: Middleware Static Files (schnell - nur Pattern-Check)
function testMiddlewareStaticFiles(): boolean {
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
  
  // Schnelle Pattern-Prüfung
  const hasStaticFileCheck = 
    content.includes('.svg') || 
    content.includes('.png') || 
    content.includes('NextResponse.next()');

  if (!hasStaticFileCheck) {
    logResult({
      name: 'Middleware Static Files',
      passed: false,
      critical: true,
      error: 'No static file handling found',
    });
    return false;
  }

  logResult({
    name: 'Middleware Static Files',
    passed: true,
    critical: true,
    details: 'Static file handling detected',
  });
  return true;
}

// Test 4: TypeScript Config (schnell)
function testTypeScriptConfig(): boolean {
  const tsconfigPath = join(PROJECT_ROOT, 'tsconfig.json');
  if (!existsSync(tsconfigPath)) {
    logResult({
      name: 'TypeScript Config',
      passed: false,
      critical: false,
      error: 'tsconfig.json not found',
    });
    return false;
  }

  logResult({
    name: 'TypeScript Config',
    passed: true,
    critical: false,
    details: 'tsconfig.json exists',
  });
  return true;
}

// Main Test Runner
function runFastRegressionTests() {
  console.log('⚡ Running Fast Regression Tests...\n');

  const tests = [
    { name: 'Payment Logos', test: testPaymentLogos, critical: true },
    { name: 'Critical Routes', test: testCriticalRoutes, critical: true },
    { name: 'Middleware Static Files', test: testMiddlewareStaticFiles, critical: true },
    { name: 'TypeScript Config', test: testTypeScriptConfig, critical: false },
  ];

  // Run all tests synchronously (schnell)
  for (const test of tests) {
    try {
      test.test();
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
    console.log('\n⚠️  Some tests failed, but none are critical.');
    process.exit(0);
  } else {
    console.log('\n✅ All regression tests passed! Safe to deploy.');
    process.exit(0);
  }
}

// Run tests
runFastRegressionTests();

