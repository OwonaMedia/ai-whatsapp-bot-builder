#!/usr/bin/env node

/**
 * Generiert Payment-Screenshots für die Dokumentation
 * Startet automatisch den Dev-Server, erstellt Screenshots und stoppt ihn wieder
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const SCREENSHOT_DIR = path.join(__dirname, '../public/docs/screenshots');
const BASE_URL = process.env.BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://whatsapp.owona.de';
const LOCALE = 'de';

// Payment-Screenshots
const paymentSections = [
  'checkout-page',
  'payment-method-selector',
  'payment-method-card',
  'checkout-form',
  'payment-status-success',
  'payment-status-failed',
  'checkout-success',
  'checkout-cancel',
];

let devServer = null;

async function waitForServer(url, maxRetries = 30) {
  console.log(`⏳ Warte auf Server ${url}...`);
  
  // Node.js fetch verwenden (ab Node 18)
  const https = require('https');
  const http = require('http');
  const urlObj = new URL(url);
  const client = urlObj.protocol === 'https:' ? https : http;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await new Promise((resolve, reject) => {
        const req = client.get(url, (res) => {
          resolve(res);
        });
        req.on('error', reject);
        req.setTimeout(2000, () => {
          req.destroy();
          reject(new Error('Timeout'));
        });
      });
      
      if (response.statusCode === 200 || response.statusCode === 404) {
        console.log(`✅ Server ist bereit!`);
        return true;
      }
    } catch (error) {
      // Server noch nicht bereit
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  return false;
}

function startDevServer() {
  return new Promise((resolve, reject) => {
    console.log('🚀 Starte Development Server...');
    
    devServer = spawn('npm', ['run', 'dev'], {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe',
      shell: true,
    });
    
    devServer.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Ready') || output.includes('started server')) {
        console.log('✅ Server gestartet');
        resolve();
      }
    });
    
    devServer.stderr.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Error') && !output.includes('Warning')) {
        console.error('❌ Server Fehler:', output);
      }
    });
    
    devServer.on('error', (error) => {
      console.error('❌ Fehler beim Starten des Servers:', error);
      reject(error);
    });
    
    // Timeout nach 60 Sekunden
    setTimeout(() => {
      if (devServer) {
        console.log('⚠️  Server-Start-Timeout');
        resolve(); // Versuche trotzdem Screenshots zu erstellen
      }
    }, 60000);
  });
}

function stopDevServer() {
  if (devServer) {
    console.log('🛑 Stoppe Development Server...');
    devServer.kill();
    devServer = null;
  }
}

async function takeScreenshot(browser, sectionId) {
  let page;
  try {
    page = await browser.newPage();
    console.log(`📸 Erstelle Screenshot für: ${sectionId}`);
    
    // Setze Viewport für konsistente Screenshots
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 2, // Retina
    });
    
    const url = `${BASE_URL}/${LOCALE}/screenshots?section=${sectionId}`;
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    // Warte auf Content
    try {
      await page.waitForSelector('#screenshot-content', { timeout: 15000 });
    } catch (error) {
      // Versuche es mit dem gesamten Body
      await page.waitForSelector('body', { timeout: 5000 });
    }
    
    await page.waitForTimeout(3000); // Warte auf vollständiges Rendering
    
    const element = await page.$('#screenshot-content');
    
    const screenshotPath = path.join(SCREENSHOT_DIR, `${sectionId}.png`);
    
    if (element) {
      await element.screenshot({
        path: screenshotPath,
        type: 'png',
        fullPage: false,
      });
    } else {
      // Falls Element nicht gefunden, mache Full-Page Screenshot
      await page.screenshot({
        path: screenshotPath,
        type: 'png',
        fullPage: true,
      });
    }
    
    console.log(`✅ Screenshot gespeichert: ${screenshotPath}`);
    
    return screenshotPath;
  } catch (error) {
    console.error(`❌ Fehler bei ${sectionId}:`, error.message);
    return null;
  } finally {
    try {
      if (page && !page.isClosed()) {
        await page.close();
      }
    } catch (error) {
      // Page bereits geschlossen
    }
  }
}

async function main() {
  // Prüfe ob Screenshot-Verzeichnis existiert
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    console.log(`📁 Verzeichnis erstellt: ${SCREENSHOT_DIR}`);
  }
  
  console.log(`🚀 Starte Payment-Screenshot-Generierung...`);
  console.log(`📂 Ziel-Verzeichnis: ${SCREENSHOT_DIR}`);
  console.log(`🌐 Base URL: ${BASE_URL}`);
  console.log(``);
  
  let serverStarted = false;
  
  try {
    // Prüfe ob Server bereits läuft
    const https = require('https');
    const http = require('http');
    const urlObj = new URL(BASE_URL);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    let serverRunning = false;
    try {
      await new Promise((resolve, reject) => {
        const req = client.get(BASE_URL, (res) => {
          serverRunning = true;
          resolve(res);
        });
        req.on('error', () => {
          serverRunning = false;
          resolve(null);
        });
        req.setTimeout(2000, () => {
          req.destroy();
          serverRunning = false;
          resolve(null);
        });
      });
    } catch (error) {
      serverRunning = false;
    }
    
    if (serverRunning) {
      console.log('✅ Server läuft bereits');
      serverStarted = false; // Server wurde nicht von uns gestartet
    } else {
      // Server läuft nicht - starte ihn
      await startDevServer();
      serverStarted = true;
      
      // Warte auf Server
      const serverReady = await waitForServer(`${BASE_URL}/${LOCALE}`);
      if (!serverReady) {
        console.error('❌ Server konnte nicht gestartet werden oder antwortet nicht');
        console.log('');
        console.log('💡 Tipp: Starten Sie den Server manuell mit:');
        console.log(`   cd frontend && npm run dev`);
        console.log(`   Dann führen Sie dieses Script erneut aus.`);
        process.exit(1);
      }
    }
    
    // Browser starten
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-software-rasterizer',
        ],
      });
    } catch (error) {
      console.error('❌ Fehler beim Starten des Browsers:', error.message);
      console.log('');
      console.log('💡 Versuchen Sie es manuell:');
      console.log('   1. Öffnen Sie http://localhost:3999/de/screenshots?section=checkout-page');
      console.log('   2. Machen Sie Screenshots manuell');
      process.exit(1);
    }
    
    const results = [];
    
    try {
      for (const section of paymentSections) {
        try {
          const result = await takeScreenshot(browser, section);
          results.push({ section, success: result !== null });
          
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`❌ Fehler bei ${section}:`, error.message);
          results.push({ section, success: false });
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      console.log(``);
      console.log(`📊 Statistiken:`);
      console.log(`✅ Erfolgreich: ${successCount}/${paymentSections.length}`);
      console.log(`❌ Fehlgeschlagen: ${failCount}/${paymentSections.length}`);
      
      if (failCount > 0) {
        console.log(``);
        console.log(`⚠️  Fehlgeschlagene Screenshots:`);
        results
          .filter(r => !r.success)
          .forEach(r => console.log(`   - ${r.section}`));
      }
      
      console.log(``);
      console.log(`🎉 Screenshot-Generierung abgeschlossen!`);
      console.log(`📁 Screenshots gespeichert in: ${SCREENSHOT_DIR}`);
      
    } finally {
      await browser.close();
    }
    
  } catch (error) {
    console.error('💥 Fataler Fehler:', error);
    process.exit(1);
  } finally {
    // Stoppe Server nur wenn wir ihn gestartet haben
    if (serverStarted && devServer) {
      stopDevServer();
    }
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Fataler Fehler:', error);
    process.exit(1);
  });
}

module.exports = { takeScreenshot, paymentSections };

