#!/usr/bin/env tsx

/**
 * Umfassendes Prüfungs-Script für alle Seiten, Bilder und Links
 * Prüft Verfügbarkeit, Funktionalität und erstellt detaillierte Reports
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const frontendRoot = join(__dirname, '..');
const appDir = join(frontendRoot, 'app', '[locale]');
const publicDir = join(frontendRoot, 'public');

interface PageInfo {
  route: string;
  filePath: string;
  existsLocal: boolean;
  existsServer?: boolean;
  httpStatus?: number;
  error?: string;
}

interface ImageInfo {
  src: string;
  filePath: string;
  existsLocal: boolean;
  existsServer?: boolean;
  size?: number;
  referencedIn: string[];
}

interface LinkInfo {
  href: string;
  type: 'internal' | 'external' | 'anchor' | 'mailto';
  targetRoute?: string;
  exists?: boolean;
  httpStatus?: number;
  referencedIn: string[];
}

interface ValidationReport {
  timestamp: string;
  pages: {
    total: number;
    local: number;
    server: number;
    missing: PageInfo[];
    broken: PageInfo[];
    all: PageInfo[];
  };
  images: {
    total: number;
    local: number;
    server: number;
    missing: ImageInfo[];
    broken: ImageInfo[];
    all: ImageInfo[];
  };
  links: {
    total: number;
    internal: number;
    external: number;
    broken: LinkInfo[];
    missing: LinkInfo[];
    all: LinkInfo[];
  };
  fixes: Array<{
    type: 'page' | 'image' | 'link';
    issue: string;
    fix: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
  }>;
}

// Finde alle Seiten
function findAllPages(): PageInfo[] {
  const pages: PageInfo[] = [];
  
  function walkDir(dir: string, baseRoute: string = '') {
    const entries = readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory()) {
        const newRoute = baseRoute ? `${baseRoute}/${entry.name}` : entry.name;
        walkDir(fullPath, newRoute);
      } else if (entry.name === 'page.tsx') {
        // Konvertiere Dateipfad zu Route
        const relativePath = relative(appDir, dirname(fullPath));
        const routeParts = relativePath.split('/').filter(p => p !== '[locale]');
        let route = '/de';
        
        if (routeParts.length === 0 || (routeParts.length === 1 && routeParts[0] === '')) {
          route = '/de';
        } else {
          route = `/de/${routeParts.join('/')}`;
        }
        
        pages.push({
          route,
          filePath: fullPath,
          existsLocal: true,
        });
      }
    }
  }
  
  walkDir(appDir);
  return pages;
}

// Extrahiere Bild-Referenzen aus Code
function extractImageReferences(): Map<string, Set<string>> {
  const imageMap = new Map<string, Set<string>>();
  
  function extractFromFile(filePath: string) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const relativePath = relative(frontendRoot, filePath);
      
      // Suche nach imageSrc, src=, href= mit Bild-Endungen
      const patterns = [
        /imageSrc:\s*['"]([^'"]+\.(png|jpg|jpeg|gif|svg|webp))['"]/g,
        /src=['"]([^'"]+\.(png|jpg|jpeg|gif|svg|webp))['"]/g,
        /href=['"]([^'"]+\.(png|jpg|jpeg|gif|svg|webp))['"]/g,
        /imageSrc:\s*\{([^}]+)\}/g,
        /src=\{([^}]+)\}/g,
      ];
      
      patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          let imagePath = match[1] || match[0];
          
          // Bereinige Template-Strings
          imagePath = imagePath.replace(/`/g, '').replace(/\$\{.*?\}/g, '').trim();
          
          // Normalisiere Pfad
          if (!imagePath.startsWith('/')) {
            imagePath = `/${imagePath}`;
          }
          
          if (!imageMap.has(imagePath)) {
            imageMap.set(imagePath, new Set());
          }
          imageMap.get(imagePath)!.add(relativePath);
        }
      });
    } catch (error) {
      // Datei konnte nicht gelesen werden
    }
  }
  
  function walkDir(dir: string) {
    const entries = readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        walkDir(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts') || entry.name.endsWith('.jsx') || entry.name.endsWith('.js'))) {
        extractFromFile(fullPath);
      }
    }
  }
  
  walkDir(join(frontendRoot, 'app'));
  walkDir(join(frontendRoot, 'components'));
  
  return imageMap;
}

// Extrahiere Link-Referenzen aus Code
function extractLinkReferences(): Map<string, Set<string>> {
  const linkMap = new Map<string, Set<string>>();
  
  function extractFromFile(filePath: string) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      const relativePath = relative(frontendRoot, filePath);
      
      // Suche nach href=, linkHref, linkPath
      const patterns = [
        /href=['"]([^'"]+)['"]/g,
        /linkHref=['"]([^'"]+)['"]/g,
        /linkPath:\s*['"]([^'"]+)['"]/g,
        /href=\{([^}]+)\}/g,
        /linkHref=\{([^}]+)\}/g,
      ];
      
      patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          let linkPath = match[1] || match[0];
          
          // Bereinige Template-Strings
          linkPath = linkPath.replace(/`/g, '').replace(/\$\{.*?\}/g, '').trim();
          
          // Überspringe externe Links, Mailto, Anchors
          if (linkPath.startsWith('http') || linkPath.startsWith('mailto:') || linkPath.startsWith('#')) {
            return;
          }
          
          // Normalisiere Pfad
          if (!linkPath.startsWith('/')) {
            linkPath = `/${linkPath}`;
          }
          
          // Füge /de Prefix hinzu wenn nicht vorhanden
          if (!linkPath.startsWith('/de/') && !linkPath.startsWith('/api/')) {
            linkPath = `/de${linkPath}`;
          }
          
          if (!linkMap.has(linkPath)) {
            linkMap.set(linkPath, new Set());
          }
          linkMap.get(linkPath)!.add(relativePath);
        }
      });
    } catch (error) {
      // Datei konnte nicht gelesen werden
    }
  }
  
  function walkDir(dir: string) {
    const entries = readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        walkDir(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts') || entry.name.endsWith('.jsx') || entry.name.endsWith('.js'))) {
        extractFromFile(fullPath);
      }
    }
  }
  
  walkDir(join(frontendRoot, 'app'));
  walkDir(join(frontendRoot, 'components'));
  
  return linkMap;
}

// Prüfe Server-Status
function checkServerStatus(route: string): { exists: boolean; status?: number; error?: string } {
  try {
    const result = execSync(
      `ssh root@whatsapp.owona.de "curl -s -o /dev/null -w '%{http_code}' http://localhost:3000${route}"`,
      { encoding: 'utf-8', timeout: 5000 }
    );
    const status = parseInt(result.trim(), 10);
    return { exists: status < 400, status };
  } catch (error: any) {
    return { exists: false, error: error.message };
  }
}

// Prüfe Bild auf Server
function checkImageOnServer(imagePath: string): boolean {
  try {
    const publicPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
    const result = execSync(
      `ssh root@whatsapp.owona.de "test -f /var/www/whatsapp-bot-builder/products/ai-whatsapp-bot-builder/frontend/public/${publicPath} && echo 'exists' || echo 'missing'"`,
      { encoding: 'utf-8', timeout: 5000 }
    );
    return result.trim() === 'exists';
  } catch {
    return false;
  }
}

// Hauptfunktion
async function main() {
  console.log('🔍 Starte umfassende Prüfung...\n');
  
  // 1. Seiten finden und prüfen
  console.log('📄 Prüfe Seiten...');
  const pages = findAllPages();
  
  for (const page of pages) {
    // Prüfe Server-Status
    const serverStatus = checkServerStatus(page.route);
    page.existsServer = serverStatus.exists;
    page.httpStatus = serverStatus.status;
    page.error = serverStatus.error;
  }
  
  // 2. Bilder finden und prüfen
  console.log('🖼️  Prüfe Bilder...');
  const imageRefs = extractImageReferences();
  const images: ImageInfo[] = [];
  
  for (const [imagePath, referencedIn] of imageRefs.entries()) {
    const publicPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
    const localPath = join(publicDir, publicPath);
    
    const imageInfo: ImageInfo = {
      src: imagePath,
      filePath: localPath,
      existsLocal: existsSync(localPath),
      existsServer: checkImageOnServer(imagePath),
      referencedIn: Array.from(referencedIn),
    };
    
    if (imageInfo.existsLocal) {
      try {
        const stats = statSync(localPath);
        imageInfo.size = stats.size;
      } catch {}
    }
    
    images.push(imageInfo);
  }
  
  // 3. Links finden und prüfen
  console.log('🔗 Prüfe Links...');
  const linkRefs = extractLinkReferences();
  const links: LinkInfo[] = [];
  
  for (const [linkPath, referencedIn] of linkRefs.entries()) {
    const linkInfo: LinkInfo = {
      href: linkPath,
      type: linkPath.startsWith('http') ? 'external' : linkPath.startsWith('mailto:') ? 'mailto' : linkPath.startsWith('#') ? 'anchor' : 'internal',
      referencedIn: Array.from(referencedIn),
    };
    
    if (linkInfo.type === 'internal') {
      linkInfo.targetRoute = linkPath;
      const serverStatus = checkServerStatus(linkPath);
      linkInfo.exists = serverStatus.exists;
      linkInfo.httpStatus = serverStatus.status;
    }
    
    links.push(linkInfo);
  }
  
  // 4. Report erstellen
  const report: ValidationReport = {
    timestamp: new Date().toISOString(),
    pages: {
      total: pages.length,
      local: pages.filter(p => p.existsLocal).length,
      server: pages.filter(p => p.existsServer).length,
      missing: pages.filter(p => !p.existsServer),
      broken: pages.filter(p => p.existsServer && (p.httpStatus || 0) >= 400),
      all: pages,
    },
    images: {
      total: images.length,
      local: images.filter(i => i.existsLocal).length,
      server: images.filter(i => i.existsServer).length,
      missing: images.filter(i => !i.existsLocal || !i.existsServer),
      broken: images.filter(i => !i.existsLocal && !i.existsServer),
      all: images,
    },
    links: {
      total: links.length,
      internal: links.filter(l => l.type === 'internal').length,
      external: links.filter(l => l.type === 'external').length,
      broken: links.filter(l => l.type === 'internal' && !l.exists),
      missing: links.filter(l => l.type === 'internal' && l.exists === false),
      all: links,
    },
    fixes: [],
  };
  
  // 5. Fixes generieren
  // Fehlende Seiten
  for (const page of report.pages.missing) {
    report.fixes.push({
      type: 'page',
      issue: `Seite ${page.route} fehlt auf Server`,
      fix: `rsync -avz ${page.filePath} root@whatsapp.owona.de:/var/www/whatsapp-bot-builder/products/ai-whatsapp-bot-builder/frontend/${relative(frontendRoot, page.filePath)}`,
      priority: page.route === '/de' ? 'critical' : page.route.startsWith('/de/demo') ? 'high' : 'medium',
    });
  }
  
  // Fehlende Bilder
  for (const image of report.images.missing) {
    if (!image.existsServer) {
      report.fixes.push({
        type: 'image',
        issue: `Bild ${image.src} fehlt auf Server`,
        fix: `rsync -avz ${image.filePath} root@whatsapp.owona.de:/var/www/whatsapp-bot-builder/products/ai-whatsapp-bot-builder/frontend/public/${image.src.startsWith('/') ? image.src.slice(1) : image.src}`,
        priority: 'medium',
      });
    }
  }
  
  // Broken Links
  for (const link of report.links.broken) {
    report.fixes.push({
      type: 'link',
      issue: `Link ${link.href} führt zu nicht-existierender Seite`,
      fix: `Prüfe Route ${link.href} - Seite muss erstellt oder Link korrigiert werden`,
      priority: 'high',
    });
  }
  
  // 6. Reports speichern
  const reportsDir = join(frontendRoot, 'reports');
  if (!existsSync(reportsDir)) {
    execSync(`mkdir -p ${reportsDir}`);
  }
  
  // JSON Report
  const jsonReport = JSON.stringify(report, null, 2);
  require('fs').writeFileSync(join(reportsDir, 'pages-validation-report.json'), jsonReport);
  
  // Markdown Report
  let mdReport = `# Seiten-Bilder-Links Validierungs-Report\n\n`;
  mdReport += `**Erstellt:** ${new Date(report.timestamp).toLocaleString('de-DE')}\n\n`;
  
  mdReport += `## Übersicht\n\n`;
  mdReport += `- **Seiten:** ${report.pages.total} total, ${report.pages.local} lokal, ${report.pages.server} auf Server\n`;
  mdReport += `- **Bilder:** ${report.images.total} total, ${report.images.local} lokal, ${report.images.server} auf Server\n`;
  mdReport += `- **Links:** ${report.links.total} total, ${report.links.internal} intern, ${report.links.external} extern\n\n`;
  
  mdReport += `## Fehlende Seiten (${report.pages.missing.length})\n\n`;
  if (report.pages.missing.length > 0) {
    mdReport += `| Route | Datei | Status |\n`;
    mdReport += `|-------|-------|--------|\n`;
    for (const page of report.pages.missing) {
      mdReport += `| ${page.route} | ${relative(frontendRoot, page.filePath)} | ❌ Fehlt |\n`;
    }
  } else {
    mdReport += `✅ Alle Seiten vorhanden\n\n`;
  }
  
  mdReport += `\n## Fehlende Bilder (${report.images.missing.length})\n\n`;
  if (report.images.missing.length > 0) {
    mdReport += `| Bild | Lokal | Server | Referenziert in |\n`;
    mdReport += `|------|-------|--------|-----------------|\n`;
    for (const image of report.images.missing.slice(0, 20)) {
      mdReport += `| ${image.src} | ${image.existsLocal ? '✅' : '❌'} | ${image.existsServer ? '✅' : '❌'} | ${image.referencedIn.join(', ')} |\n`;
    }
    if (report.images.missing.length > 20) {
      mdReport += `| ... | ${report.images.missing.length - 20} weitere |\n`;
    }
  } else {
    mdReport += `✅ Alle Bilder vorhanden\n\n`;
  }
  
  mdReport += `\n## Broken Links (${report.links.broken.length})\n\n`;
  if (report.links.broken.length > 0) {
    mdReport += `| Link | Status | Referenziert in |\n`;
    mdReport += `|------|--------|-----------------|\n`;
    for (const link of report.links.broken.slice(0, 20)) {
      mdReport += `| ${link.href} | ${link.httpStatus || 'N/A'} | ${link.referencedIn.join(', ')} |\n`;
    }
    if (report.links.broken.length > 20) {
      mdReport += `| ... | ${report.links.broken.length - 20} weitere |\n`;
    }
  } else {
    mdReport += `✅ Alle Links funktionieren\n\n`;
  }
  
  mdReport += `\n## Fixes\n\n`;
  const criticalFixes = report.fixes.filter(f => f.priority === 'critical');
  const highFixes = report.fixes.filter(f => f.priority === 'high');
  const mediumFixes = report.fixes.filter(f => f.priority === 'medium');
  
  if (criticalFixes.length > 0) {
    mdReport += `### 🔴 Kritisch (${criticalFixes.length})\n\n`;
    for (const fix of criticalFixes) {
      mdReport += `- **${fix.issue}**\n  \`\`\`bash\n  ${fix.fix}\n  \`\`\`\n\n`;
    }
  }
  
  if (highFixes.length > 0) {
    mdReport += `### 🟠 Hoch (${highFixes.length})\n\n`;
    for (const fix of highFixes.slice(0, 10)) {
      mdReport += `- **${fix.issue}**\n  \`\`\`bash\n  ${fix.fix}\n  \`\`\`\n\n`;
    }
  }
  
  if (mediumFixes.length > 0) {
    mdReport += `### 🟡 Mittel (${mediumFixes.length})\n\n`;
    mdReport += `_${mediumFixes.length} weitere Fixes - siehe JSON-Report für Details_\n\n`;
  }
  
  require('fs').writeFileSync(join(reportsDir, 'pages-validation-report.md'), mdReport);
  
  // 7. Zusammenfassung ausgeben
  console.log('\n✅ Prüfung abgeschlossen!\n');
  console.log(`📊 Ergebnisse:`);
  console.log(`  Seiten: ${report.pages.server}/${report.pages.total} auf Server`);
  console.log(`  Bilder: ${report.images.server}/${report.images.total} auf Server`);
  console.log(`  Links: ${report.links.total - report.links.broken.length}/${report.links.total} funktionieren`);
  console.log(`\n📁 Reports gespeichert:`);
  console.log(`  - reports/pages-validation-report.json`);
  console.log(`  - reports/pages-validation-report.md`);
  console.log(`\n🔧 ${report.fixes.length} Fixes identifiziert`);
}

main().catch(console.error);

