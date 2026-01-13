#!/usr/bin/env node

/**
 * Pre-build checks to catch expensive Supabase usage during `next build`.
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('🔍 Pre-build checks...');

const isServerComponent = (filePath) => filePath.includes('app/');

const warn = (message) => {
  console.warn(`⚠️  ${message}`);
};

const checkFile = (filePath) => {
  const absolutePath = path.resolve(process.cwd(), filePath);
  const content = fs.readFileSync(absolutePath, 'utf-8');

  // Warn when Supabase is initialised at top-level in non-client files
  if (
    !content.includes("'use client'") &&
    /^const\s+\w+\s*=\s*createClient/m.test(content)
  ) {
    warn(`Top-level createClient in ${filePath}`);
  }

  // Async server component without dynamic export
  if (
    isServerComponent(filePath) &&
    content.includes('export default async function') &&
    !content.includes("export const dynamic = 'force-dynamic'") &&
    !content.includes('use client')
  ) {
    warn(`Async Server Component ohne 'dynamic' in ${filePath}`);
  }
};

glob.sync('app/**/*.{ts,tsx}').forEach(checkFile);
glob.sync('lib/**/*.{ts,tsx}').forEach(checkFile);

console.log('✅ Pre-build checks complete\n');

