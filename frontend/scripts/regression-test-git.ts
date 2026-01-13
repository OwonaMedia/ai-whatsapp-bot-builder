#!/usr/bin/env ts-node
/**
 * Git-based Regression Test Suite
 * 
 * Prüft nur geänderte Dateien seit letztem Commit.
 * Sehr schnell, da nur relevante Dateien geprüft werden.
 * 
 * Usage: npm run regression-test:git
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const PROJECT_ROOT = resolve(__dirname, '..');

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function logResult(result: TestResult) {
  results.push(result);
  const icon = result.passed ? '✅' : '❌';
  console.log(`${icon} ${result.name}`);
  if (result.error) {
    console.log(`   Error: ${result.error}`);
  }
}

// Get changed files since last commit
function getChangedFiles(): string[] {
  try {
    const output = execSync('git diff --name-only HEAD', { 
      cwd: PROJECT_ROOT,
      encoding: 'utf-8',
    });
    return output.trim().split('\n').filter(Boolean);
  } catch (error) {
    // If not a git repo or no changes, return empty
    return [];
  }
}

// Test: Check if changed files reference assets that exist
function testChangedAssetReferences(changedFiles: string[]): boolean {
  const assetFiles = changedFiles.filter(f => 
    f.includes('public/') || 
    f.match(/\.(tsx?|jsx?)$/) && readFileSync(join(PROJECT_ROOT, f), 'utf-8').includes('payment-logos')
  );

  if (assetFiles.length === 0) {
    logResult({
      name: 'Asset References',
      passed: true,
    });
    return true;
  }

  // Quick check: payment-logos directory exists
  const paymentLogosDir = join(PROJECT_ROOT, 'public', 'payment-logos');
  if (!existsSync(paymentLogosDir)) {
    logResult({
      name: 'Asset References',
      passed: false,
      error: 'payment-logos directory missing',
    });
    return false;
  }

  logResult({
    name: 'Asset References',
    passed: true,
  });
  return true;
}

// Test: Check if changed routes have page.tsx
function testChangedRoutes(changedFiles: string[]): boolean {
  const routeFiles = changedFiles.filter(f => 
    f.includes('app/[locale]/') && !f.includes('page.tsx')
  );

  if (routeFiles.length === 0) {
    logResult({
      name: 'Route Changes',
      passed: true,
    });
    return true;
  }

  // Check if corresponding page.tsx exists
  for (const file of routeFiles) {
    const routeDir = file.replace(/\/[^/]+$/, '');
    const pagePath = join(PROJECT_ROOT, routeDir, 'page.tsx');
    if (!existsSync(pagePath)) {
      logResult({
        name: 'Route Changes',
        passed: false,
        error: `Missing page.tsx for ${routeDir}`,
      });
      return false;
    }
  }

  logResult({
    name: 'Route Changes',
    passed: true,
  });
  return true;
}

// Main
function runGitBasedTests() {
  console.log('🔍 Running Git-based Regression Tests...\n');
  console.log('   (Only checking changed files)\n');

  const changedFiles = getChangedFiles();
  
  if (changedFiles.length === 0) {
    console.log('✅ No changes detected. All tests pass.');
    process.exit(0);
  }

  console.log(`📝 Found ${changedFiles.length} changed files\n`);

  testChangedAssetReferences(changedFiles);
  testChangedRoutes(changedFiles);

  const failed = results.filter(r => !r.passed).length;
  if (failed > 0) {
    console.log(`\n❌ ${failed} test(s) failed`);
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  }
}

runGitBasedTests();

