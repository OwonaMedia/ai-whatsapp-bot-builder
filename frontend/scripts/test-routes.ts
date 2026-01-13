#!/usr/bin/env ts-node
/**
 * Route-Test-Script
 * Prüft alle Routen auf Erreichbarkeit und korrekte Struktur
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { readdirSync, statSync } from 'fs';

const PROJECT_ROOT = join(__dirname, '..');
const APP_DIR = join(PROJECT_ROOT, 'app', '[locale]');

interface RouteStatus {
  route: string;
  hasPage: boolean;
  hasRoute: boolean;
  subRoutes: string[];
  status: 'ok' | 'missing' | 'partial';
}

function checkRoute(routePath: string, routeName: string): RouteStatus {
  const pagePath = join(routePath, 'page.tsx');
  const routePathFile = join(routePath, 'route.ts');
  const hasPage = existsSync(pagePath);
  const hasRoute = existsSync(routePathFile);

  // Prüfe Unterverzeichnisse
  const subRoutes: string[] = [];
  try {
    const items = readdirSync(routePath);
    for (const item of items) {
      const itemPath = join(routePath, item);
      if (statSync(itemPath).isDirectory()) {
        subRoutes.push(item);
      }
    }
  } catch (error) {
    // Verzeichnis existiert nicht
  }

  let status: 'ok' | 'missing' | 'partial' = 'ok';
  if (!hasPage && !hasRoute) {
    if (subRoutes.length > 0) {
      status = 'partial'; // Hat Unterrouten, aber keine Hauptseite
    } else {
      status = 'missing';
    }
  }

  return {
    route: routeName,
    hasPage,
    hasRoute,
    subRoutes,
    status,
  };
}

function main() {
  console.log('🔍 Route-Status-Prüfung\n');
  console.log('━'.repeat(60));

  const routes: RouteStatus[] = [];

  try {
    const items = readdirSync(APP_DIR);
    for (const item of items) {
      const itemPath = join(APP_DIR, item);
      if (statSync(itemPath).isDirectory()) {
        routes.push(checkRoute(itemPath, item));
      }
    }
  } catch (error) {
    console.error('❌ Fehler beim Lesen des app/[locale] Verzeichnisses:', error);
    process.exit(1);
  }

  // Sortiere Routen
  routes.sort((a, b) => a.route.localeCompare(b.route));

  // Drucke Ergebnisse
  console.log('\n📋 Route-Übersicht:\n');
  for (const route of routes) {
    const icon = route.status === 'ok' ? '✅' : route.status === 'partial' ? '⚠️' : '❌';
    const files = [];
    if (route.hasPage) files.push('page.tsx');
    if (route.hasRoute) files.push('route.ts');
    const fileInfo = files.length > 0 ? ` (${files.join(', ')})` : '';
    const subInfo = route.subRoutes.length > 0 ? ` [${route.subRoutes.length} Unterrouten]` : '';
    
    console.log(`${icon} /${route.route}${fileInfo}${subInfo}`);
  }

  // Zusammenfassung
  const ok = routes.filter(r => r.status === 'ok').length;
  const partial = routes.filter(r => r.status === 'partial').length;
  const missing = routes.filter(r => r.status === 'missing').length;

  console.log('\n' + '━'.repeat(60));
  console.log('\n📊 Zusammenfassung:');
  console.log(`  ✅ OK: ${ok}`);
  console.log(`  ⚠️  Partial (nur Unterrouten): ${partial}`);
  console.log(`  ❌ Fehlend: ${missing}`);

  // Kritische Routen prüfen
  const criticalRoutes = ['intern', 'dashboard', 'pricing', 'contact', 'settings'];
  const criticalMissing = routes.filter(
    r => criticalRoutes.includes(r.route) && r.status === 'missing'
  );

  if (criticalMissing.length > 0) {
    console.log('\n🚨 KRITISCH: Fehlende kritische Routen:');
    for (const route of criticalMissing) {
      console.log(`  ❌ /${route.route} - FEHLT`);
    }
    process.exit(1);
  }

  if (missing > 0) {
    console.log('\n⚠️  Warnung: Einige Routen fehlen, aber keine kritischen.');
    process.exit(0);
  }

  console.log('\n✅ Alle Routen sind korrekt konfiguriert!');
  process.exit(0);
}

main();

