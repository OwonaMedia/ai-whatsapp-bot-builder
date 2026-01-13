#!/usr/bin/env ts-node
/**
 * Server-Diagnose-Script für whatsapp.owona.de
 * Prüft Server-Status, PM2, Nginx, Environment Variables, etc.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface DiagnosisResult {
  category: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  details?: string;
}

const results: DiagnosisResult[] = [];

function addResult(category: string, status: 'ok' | 'warning' | 'error', message: string, details?: string) {
  results.push({ category, status, message, details });
  const icon = status === 'ok' ? '✅' : status === 'warning' ? '⚠️' : '❌';
  console.log(`${icon} [${category}] ${message}`);
  if (details) {
    console.log(`   ${details}`);
  }
}

async function checkEnvironmentVariables() {
  console.log('\n📋 Prüfe Environment Variables...');
  
  const envPath = path.join(process.cwd(), '.env.local');
  const envExamplePath = path.join(process.cwd(), '.env.example');
  
  if (!fs.existsSync(envPath)) {
    addResult('ENV', 'error', '.env.local nicht gefunden', 'Erstelle .env.local mit erforderlichen Variablen');
    return;
  }
  
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_APP_URL',
  ];
  
  const missing: string[] = [];
  requiredVars.forEach(varName => {
    if (!envContent.includes(varName) || !envContent.match(new RegExp(`${varName}=.+`))) {
      missing.push(varName);
    }
  });
  
  if (missing.length > 0) {
    addResult('ENV', 'error', `Fehlende Environment Variables: ${missing.join(', ')}`);
  } else {
    addResult('ENV', 'ok', 'Alle erforderlichen Environment Variables vorhanden');
  }
  
  // Prüfe auf leere Werte
  const emptyVars: string[] = [];
  requiredVars.forEach(varName => {
    const match = envContent.match(new RegExp(`${varName}=(.+)`));
    if (match && (!match[1] || match[1].trim() === '')) {
      emptyVars.push(varName);
    }
  });
  
  if (emptyVars.length > 0) {
    addResult('ENV', 'warning', `Leere Environment Variables: ${emptyVars.join(', ')}`);
  }
}

async function checkTypeScriptErrors() {
  console.log('\n📋 Prüfe TypeScript-Fehler...');
  
  try {
    const output = execSync('npx tsc --noEmit --pretty false', { 
      encoding: 'utf-8',
      stdio: 'pipe',
      cwd: process.cwd()
    });
    addResult('TypeScript', 'ok', 'Keine TypeScript-Fehler gefunden');
  } catch (error: unknown) {
    const errorOutput = error instanceof Error ? error.message : String(error);
    const errorCount = (errorOutput.match(/error TS/g) || []).length;
    if (errorCount > 0) {
      addResult('TypeScript', 'error', `${errorCount} TypeScript-Fehler gefunden`, 'Führe "npx tsc --noEmit" aus für Details');
    } else {
      addResult('TypeScript', 'warning', 'TypeScript-Check fehlgeschlagen', errorOutput.substring(0, 200));
    }
  }
}

async function checkBuildOutput() {
  console.log('\n📋 Prüfe Build-Output...');
  
  const nextPath = path.join(process.cwd(), '.next');
  if (!fs.existsSync(nextPath)) {
    addResult('Build', 'warning', '.next Verzeichnis nicht gefunden', 'Führe "npm run build" aus');
    return;
  }
  
  const buildManifestPath = path.join(nextPath, 'BUILD_ID');
  if (!fs.existsSync(buildManifestPath)) {
    addResult('Build', 'warning', 'BUILD_ID nicht gefunden', 'Build möglicherweise unvollständig');
  } else {
    const buildId = fs.readFileSync(buildManifestPath, 'utf-8').trim();
    addResult('Build', 'ok', `Build gefunden (ID: ${buildId})`);
  }
}

async function checkPackageJson() {
  console.log('\n📋 Prüfe package.json...');
  
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    addResult('Package', 'error', 'package.json nicht gefunden');
    return;
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  
  // Prüfe kritische Dependencies
  const criticalDeps = ['next', 'react', 'react-dom', '@supabase/ssr', '@supabase/supabase-js'];
  const missing: string[] = [];
  criticalDeps.forEach(dep => {
    if (!packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]) {
      missing.push(dep);
    }
  });
  
  if (missing.length > 0) {
    addResult('Package', 'error', `Fehlende Dependencies: ${missing.join(', ')}`);
  } else {
    addResult('Package', 'ok', 'Alle kritischen Dependencies vorhanden');
  }
}

async function checkNextConfig() {
  console.log('\n📋 Prüfe next.config.js...');
  
  const configPath = path.join(process.cwd(), 'next.config.js');
  if (!fs.existsSync(configPath)) {
    addResult('Config', 'error', 'next.config.js nicht gefunden');
    return;
  }
  
  const configContent = fs.readFileSync(configPath, 'utf-8');
  
  // Prüfe auf ignoreBuildErrors
  if (configContent.includes('ignoreBuildErrors: true')) {
    addResult('Config', 'warning', 'TypeScript Build-Errors werden ignoriert', 'Sollte auf false gesetzt werden');
  } else {
    addResult('Config', 'ok', 'TypeScript Build-Errors werden nicht ignoriert');
  }
  
  // Prüfe auf Security Headers
  if (configContent.includes('Strict-Transport-Security')) {
    addResult('Config', 'ok', 'Security Headers konfiguriert');
  } else {
    addResult('Config', 'warning', 'Security Headers fehlen');
  }
}

async function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 DIAGNOSE-REPORT');
  console.log('='.repeat(60));
  
  const okCount = results.filter(r => r.status === 'ok').length;
  const warningCount = results.filter(r => r.status === 'warning').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  
  console.log(`\n✅ OK: ${okCount}`);
  console.log(`⚠️  Warnings: ${warningCount}`);
  console.log(`❌ Errors: ${errorCount}`);
  
  if (errorCount > 0) {
    console.log('\n🔴 KRITISCHE PROBLEME:');
    results.filter(r => r.status === 'error').forEach(r => {
      console.log(`   - [${r.category}] ${r.message}`);
    });
  }
  
  if (warningCount > 0) {
    console.log('\n🟡 WARNUNGEN:');
    results.filter(r => r.status === 'warning').forEach(r => {
      console.log(`   - [${r.category}] ${r.message}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
}

async function main() {
  console.log('🔍 WhatsApp.owona.de Server-Diagnose');
  console.log('='.repeat(60));
  
  await checkEnvironmentVariables();
  await checkTypeScriptErrors();
  await checkBuildOutput();
  await checkPackageJson();
  await checkNextConfig();
  
  await generateReport();
  
  process.exit(results.filter(r => r.status === 'error').length > 0 ? 1 : 0);
}

main().catch(console.error);

