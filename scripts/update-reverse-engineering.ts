/**
 * Script zum Aktualisieren des Reverse Engineering
 * 
 * Analysiert Frontend und Backend und aktualisiert die Reverse Engineering Dokumentation
 */

import fs from 'node:fs';
import path from 'node:path';
import { readdir, stat } from 'node:fs/promises';

interface APIEndpoint {
  path: string;
  methods: string[];
  file: string;
}

interface FrontendComponent {
  path: string;
  type: 'page' | 'component' | 'layout' | 'api';
  file: string;
}

async function findFiles(dir: string, pattern: RegExp, files: string[] = []): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      await findFiles(fullPath, pattern, files);
    } else if (entry.isFile() && pattern.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

async function analyzeAPIEndpoints(rootDir: string): Promise<APIEndpoint[]> {
  const apiDir = path.join(rootDir, 'app', 'api');
  if (!fs.existsSync(apiDir)) {
    return [];
  }
  const apiFiles = await findFiles(apiDir, /route\.ts$/);

  const endpoints: APIEndpoint[] = [];

  for (const file of apiFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const relativePath = path.relative(rootDir, file);
    const apiPath = relativePath
      .replace(/^app\/api\//, '/api/')
      .replace(/\/route\.ts$/, '')
      .replace(/\[([^\]]+)\]/g, ':$1');

    const methods: string[] = [];
    if (content.includes('export async function GET')) methods.push('GET');
    if (content.includes('export async function POST')) methods.push('POST');
    if (content.includes('export async function PUT')) methods.push('PUT');
    if (content.includes('export async function DELETE')) methods.push('DELETE');
    if (content.includes('export async function PATCH')) methods.push('PATCH');

    if (methods.length > 0) {
      endpoints.push({
        path: apiPath,
        methods,
        file: relativePath,
      });
    }
  }

  return endpoints.sort((a, b) => a.path.localeCompare(b.path));
}

async function analyzeFrontendStructure(rootDir: string): Promise<FrontendComponent[]> {
  const components: FrontendComponent[] = [];

  // Pages
  const appDir = path.join(rootDir, 'app');
  if (fs.existsSync(appDir)) {
    const pages = await findFiles(appDir, /page\.tsx$/);
    for (const file of pages) {
      const relativePath = path.relative(rootDir, file);
      components.push({
        path: relativePath.replace(/^app\//, '/').replace(/\/page\.tsx$/, ''),
        type: 'page',
        file: relativePath,
      });
    }
  }

  // Components
  const componentsDir = path.join(rootDir, 'components');
  if (fs.existsSync(componentsDir)) {
    const compFiles = await findFiles(componentsDir, /\.tsx$/);
    for (const file of compFiles) {
      const relativePath = path.relative(rootDir, file);
      components.push({
        path: relativePath,
        type: 'component',
        file: relativePath,
      });
    }
  }

  return components;
}

async function updateAPIEndpointsDoc(endpoints: APIEndpoint[], docPath: string) {
  let content = fs.readFileSync(docPath, 'utf-8');

  // Finde den Abschnitt mit den API-Endpoints
  const startMarker = '## API Endpoints';
  const endMarker = '## ';
  const startIndex = content.indexOf(startMarker);
  
  if (startIndex === -1) {
    console.warn('API Endpoints Abschnitt nicht gefunden, füge am Ende hinzu');
    content += `\n\n## API Endpoints\n\n`;
  } else {
    // Finde das Ende des Abschnitts
    const nextSectionIndex = content.indexOf(endMarker, startIndex + startMarker.length);
    if (nextSectionIndex !== -1) {
      content = content.slice(0, startIndex) + content.slice(nextSectionIndex);
    } else {
      content = content.slice(0, startIndex);
    }
    content += startMarker + '\n\n';
  }

  // Füge alle Endpoints hinzu
  content += `**Letztes Update:** ${new Date().toISOString()}\n\n`;
  content += `**Anzahl Endpoints:** ${endpoints.length}\n\n`;

  for (const endpoint of endpoints) {
    content += `### ${endpoint.path}\n\n`;
    content += `- **Methoden:** ${endpoint.methods.join(', ')}\n`;
    content += `- **Datei:** \`${endpoint.file}\`\n\n`;
  }

  fs.writeFileSync(docPath, content);
  console.log(`✅ API Endpoints Dokumentation aktualisiert: ${endpoints.length} Endpoints`);
}

async function updateFrontendStructureDoc(components: FrontendComponent[], docPath: string) {
  let content = fs.readFileSync(docPath, 'utf-8');

  // Finde den Abschnitt mit der Frontend-Struktur
  const startMarker = '## Frontend Struktur';
  const endMarker = '## ';
  const startIndex = content.indexOf(startMarker);
  
  if (startIndex === -1) {
    console.warn('Frontend Struktur Abschnitt nicht gefunden, füge am Ende hinzu');
    content += `\n\n## Frontend Struktur\n\n`;
  } else {
    const nextSectionIndex = content.indexOf(endMarker, startIndex + startMarker.length);
    if (nextSectionIndex !== -1) {
      content = content.slice(0, startIndex) + content.slice(nextSectionIndex);
    } else {
      content = content.slice(0, startIndex);
    }
    content += startMarker + '\n\n';
  }

  content += `**Letztes Update:** ${new Date().toISOString()}\n\n`;
  content += `**Anzahl Komponenten:** ${components.length}\n\n`;

  // Gruppiere nach Typ
  const byType = components.reduce((acc, comp) => {
    if (!acc[comp.type]) acc[comp.type] = [];
    acc[comp.type].push(comp);
    return acc;
  }, {} as Record<string, FrontendComponent[]>);

  for (const [type, items] of Object.entries(byType)) {
    content += `### ${type}\n\n`;
    for (const item of items.slice(0, 50)) { // Limit für Lesbarkeit
      content += `- \`${item.path}\` → \`${item.file}\`\n`;
    }
    if (items.length > 50) {
      content += `\n*... und ${items.length - 50} weitere*\n`;
    }
    content += '\n';
  }

  fs.writeFileSync(docPath, content);
  console.log(`✅ Frontend Struktur Dokumentation aktualisiert: ${components.length} Komponenten`);
}

async function main() {
  const rootDir = path.resolve(__dirname, '../frontend');
  const reverseEngDir = path.resolve(__dirname, '../reverse-engineering');

  console.log('🔍 Analysiere Frontend und Backend...\n');

  // Analysiere API Endpoints
  console.log('📡 Analysiere API Endpoints...');
  const endpoints = await analyzeAPIEndpoints(rootDir);
  console.log(`   Gefunden: ${endpoints.length} Endpoints\n`);

  // Analysiere Frontend Struktur
  console.log('🎨 Analysiere Frontend Struktur...');
  const components = await analyzeFrontendStructure(rootDir);
  console.log(`   Gefunden: ${components.length} Komponenten\n`);

  // Aktualisiere Dokumentation
  console.log('📝 Aktualisiere Reverse Engineering Dokumentation...\n');

  const apiDocPath = path.join(reverseEngDir, '03_API_ENDPOINTS.md');
  if (fs.existsSync(apiDocPath)) {
    await updateAPIEndpointsDoc(endpoints, apiDocPath);
  } else {
    console.warn(`⚠️ API Endpoints Dokument nicht gefunden: ${apiDocPath}`);
  }

  const frontendDocPath = path.join(reverseEngDir, '04_FRONTEND_STRUCTURE.md');
  if (fs.existsSync(frontendDocPath)) {
    await updateFrontendStructureDoc(components, frontendDocPath);
  } else {
    console.warn(`⚠️ Frontend Struktur Dokument nicht gefunden: ${frontendDocPath}`);
  }

  console.log('\n✅ Reverse Engineering aktualisiert!');
  console.log(`📋 Endpoints: ${endpoints.length}`);
  console.log(`📋 Komponenten: ${components.length}`);
  console.log(`\n🔗 Dokumentation: ${reverseEngDir}`);
}

main().catch((error) => {
  console.error('❌ Fehler:', error);
  process.exit(1);
});

