#!/usr/bin/env node

/**
 * Automatisches Screenshot-Generierungs-Script
 * Erstellt Screenshots für alle Dokumentations-Bereiche
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, '../public/docs/screenshots');
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const LOCALE = 'de';
const AUTH_EMAIL = process.env.AUTH_EMAIL;
const AUTH_PASSWORD = process.env.AUTH_PASSWORD;
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.5993.90 Safari/537.36';
const CHROME_EXECUTABLE =
  process.env.CHROME_EXECUTABLE_PATH ||
  (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined);

// Alle Screenshot-Bereiche
const sections = [
  'registration-form',
  'registration-email',
  'registration-password',
  'dashboard-overview',
  'dashboard-stats',
  'bot-creation-form',
  'bot-builder-canvas',
  'node-palette',
  'node-properties',
  'node-connections',
  'message-node',
  'question-node',
  'condition-node',
  'ai-node',
  'knowledge-node',
  'whatsapp-setup-wizard',
  'bsp-selection',
  'gdpr-consent',
  '360dialog-dashboard',
  '360dialog-api-key',
  '360dialog-success',
  'twilio-credentials',
  'messagebird-api-key',
  'knowledge-overview',
  'pdf-upload',
  'url-add',
  'text-input',
  'knowledge-processing',
  'analytics-dashboard',
  'analytics-metrics',
  'analytics-trends',
  'template-selector',
  'template-customer-service',
  'template-e-commerce',
  'template-booking',
  'template-multi-tier',
  'compliance-panel',
  'settings-profile',
  'settings-account',
  'embed-code-generator',
  'embed-simple-mode',
  'embed-expert-mode',
  'embed-website-code',
  'embed-wordpress-code',
  'embed-shopify-code',
  'embed-whatsapp-link',
  'checkout-page',
  'payment-method-selector',
  'payment-method-card',
  'checkout-form',
  'payment-status-success',
  'payment-status-failed',
  'checkout-success',
  'checkout-cancel',
];

// Prüfe ob nur eine Sektion erstellt werden soll
const args = process.argv.slice(2);
const sectionArg = args.find(arg => arg.startsWith('--section='));
const singleSection = sectionArg ? sectionArg.split('=')[1] : null;

const sectionsToProcess = singleSection ? [singleSection] : sections;

async function loginIfNeeded(browser) {
  if (!AUTH_EMAIL || !AUTH_PASSWORD) {
    console.log('ℹ️  Keine Login-Daten gesetzt – Screenshots werden anonym erstellt.');
    return;
  }

  const page = await browser.newPage();
  await page.setUserAgent(DEFAULT_USER_AGENT);
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });

  try {
    console.log('🔐 Melde mich in der Live-App an…');
    const loginUrl = `${BASE_URL}/${LOCALE}/auth/login`;
    await page.goto(loginUrl, {
      waitUntil: 'networkidle2',
      timeout: 45000,
    });

    if (page.url().includes(`/${LOCALE}/dashboard`)) {
      console.log('✅ Bereits eingeloggt.');
      return;
    }

    await page.waitForSelector('form', { timeout: 20000 });
    await page.waitForSelector('input[name="email"], input[type="email"]', { timeout: 20000 });
    await page.waitForSelector('input[name="password"], input[type="password"]', { timeout: 20000 });
    await page.type('input[name="email"], input[type="email"]', AUTH_EMAIL, { delay: 20 });
    await page.type('input[name="password"], input[type="password"]', AUTH_PASSWORD, { delay: 20 });

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 45000 }),
      page.click('button[type="submit"]'),
    ]);

    if (!page.url().includes(`/${LOCALE}/dashboard`)) {
      throw new Error(`Login fehlgeschlagen – aktuelle URL: ${page.url()}`);
    }

    console.log('✅ Login erfolgreich, Session aktiv.');

    console.log('✅ Login erfolgreich, Session aktiv.');
  } catch (error) {
    console.error('❌ Login fehlgeschlagen:', error.message);
    throw error;
  } finally {
    await page.close().catch(() => {});
  }
}

async function takeScreenshot(browser, sectionId) {
  const page = await browser.newPage();
  await page.setUserAgent(DEFAULT_USER_AGENT);
  await page.setViewport({ width: 1600, height: 900, deviceScaleFactor: 1 });
  
  try {
    console.log(`📸 Erstelle Screenshot für: ${sectionId}`);
    
    const url = `${BASE_URL}/${LOCALE}/screenshots?section=${sectionId}`;
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    await page.waitForSelector('#screenshot-content', { timeout: 10000 });
    await page.waitForTimeout(1000);
    
    const element = await page.$('#screenshot-content');
    
    if (!element) {
      throw new Error(`Element #screenshot-content nicht gefunden für ${sectionId}`);
    }
    
    const screenshotPath = path.join(SCREENSHOT_DIR, `${sectionId}.png`);
    await element.screenshot({
      path: screenshotPath,
      type: 'png',
    });
    
    console.log(`✅ Screenshot gespeichert: ${screenshotPath}`);
    
    return screenshotPath;
  } catch (error) {
    console.error(`❌ Fehler bei ${sectionId}:`, error.message);
    return null;
  } finally {
    await page.close();
  }
}

async function main() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    console.log(`📁 Verzeichnis erstellt: ${SCREENSHOT_DIR}`);
  }
  
  console.log(`🚀 Starte Screenshot-Generierung...`);
  console.log(`📂 Ziel-Verzeichnis: ${SCREENSHOT_DIR}`);
  console.log(`🌐 Base URL: ${BASE_URL}`);
  if (singleSection) {
    console.log(`🎯 Einzelne Sektion: ${singleSection}`);
  }
  console.log(``);
  
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--window-size=1600,900',
      '--ignore-certificate-errors',
      '--disable-dev-shm-usage',
    ],
    defaultViewport: {
      width: 1600,
      height: 900,
      deviceScaleFactor: 1,
    },
    executablePath: CHROME_EXECUTABLE,
  });
  
  const results = [];
  
  try {
    await loginIfNeeded(browser);

    for (const section of sectionsToProcess) {
      const result = await takeScreenshot(browser, section);
      results.push({ section, success: result !== null });
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    console.log(``);
    console.log(`📊 Statistiken:`);
    console.log(`✅ Erfolgreich: ${successCount}/${sectionsToProcess.length}`);
    console.log(`❌ Fehlgeschlagen: ${failCount}/${sectionsToProcess.length}`);
    
    if (failCount > 0) {
      console.log(``);
      console.log(`⚠️  Fehlgeschlagene Screenshots:`);
      results
        .filter(r => !r.success)
        .forEach(r => console.log(`   - ${r.section}`));
    }
    
  } finally {
    await browser.close();
  }
  
  console.log(``);
  console.log(`🎉 Screenshot-Generierung abgeschlossen!`);
}

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Fataler Fehler:', error);
    process.exit(1);
  });
}

module.exports = { takeScreenshot, sections };
