#!/usr/bin/env node

/**
 * Direkte Screenshot-Erstellung mit besserem Error-Handling
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const SCREENSHOT_DIR = path.join(__dirname, '../public/docs/screenshots');
const BASE_URL = process.env.BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://whatsapp.owona.de';
const LOCALE = 'de';

const sections = [
  'checkout-page',
  'payment-method-selector',
  'payment-method-card',
  'checkout-form',
  'payment-status-success',
  'payment-status-failed',
  'checkout-success',
  'checkout-cancel',
];

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function takeScreenshot(section) {
  let browser;
  let page;
  
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });

    page = await browser.newPage();
    
    await page.setViewport({ width: 1920, height: 1080 });
    
    const url = `${BASE_URL}/${LOCALE}/screenshots?section=${section}`;
    console.log(`📸 ${section}: Navigiere zu ${url}`);
    
    await page.goto(url, { 
      waitUntil: 'load',
      timeout: 30000 
    });
    
    // Warte auf Content
    await page.waitForTimeout(3000);
    
    const screenshotPath = path.join(SCREENSHOT_DIR, `${section}.png`);
    
    // Versuche Element-Screenshot
    try {
      await page.waitForSelector('#screenshot-content', { timeout: 5000 });
      const element = await page.$('#screenshot-content');
      if (element) {
        await element.screenshot({ path: screenshotPath });
        console.log(`   ✅ Gespeichert: ${section}.png`);
        return true;
      }
    } catch (e) {
      // Element nicht gefunden, mache Full-Page
    }
    
    // Fallback: Full-Page Screenshot
    await page.screenshot({ 
      path: screenshotPath,
      fullPage: true 
    });
    console.log(`   ✅ Gespeichert (Full-Page): ${section}.png`);
    return true;
    
  } catch (error) {
    console.error(`   ❌ Fehler: ${error.message}`);
    return false;
  } finally {
    if (page) {
      try {
        await page.close();
      } catch (e) {}
    }
    if (browser) {
      try {
        await browser.close();
      } catch (e) {}
    }
  }
}

async function main() {
  console.log('🚀 Erstelle Payment-Screenshots...\n');
  
  const results = [];
  
  for (const section of sections) {
    const success = await takeScreenshot(section);
    results.push({ section, success });
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 Ergebnis:');
  const successCount = results.filter(r => r.success).length;
  console.log(`✅ Erfolgreich: ${successCount}/${sections.length}`);
  
  if (successCount < sections.length) {
    console.log('\n❌ Fehlgeschlagen:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.section}`);
    });
  }
  
  console.log(`\n📁 Screenshots: ${SCREENSHOT_DIR}`);
}

main().catch(console.error);

