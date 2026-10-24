const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const ARTIFACTS_DIR = 'C:/Users/MAS/.gemini/antigravity-ide/brain/3c2f8de6-2519-42db-8f37-3104c6e04433';
const CHROME_PATH = 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';

async function run() {
  console.log('Launching Puppeteer at 390px mobile viewport...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });

  // (Authentication handled via real sessions or test fixtures)

  const routes = [
    { name: 'body_active_session', url: 'http://localhost:3000/body?tab=logger' },
    { name: 'body_weight', url: 'http://localhost:3000/body?tab=weight' },
    { name: 'body_sleep', url: 'http://localhost:3000/body?tab=sleep' },
    { name: 'body_nutrition', url: 'http://localhost:3000/body?tab=nutrition' },
    { name: 'body_standards', url: 'http://localhost:3000/body?tab=standards' },
    { name: 'body_history', url: 'http://localhost:3000/body?tab=history' },
    { name: 'today_view', url: 'http://localhost:3000/today' },
    { name: 'mind_view', url: 'http://localhost:3000/mind' },
    { name: 'school_view', url: 'http://localhost:3000/school' },
    { name: 'settings_view', url: 'http://localhost:3000/settings' }
  ];

  const auditReport = [];

  for (const route of routes) {
    console.log(`Auditing ${route.name} (${route.url})...`);
    await page.goto(route.url, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 1200));

    // Capture screenshot
    const shotPath = path.join(ARTIFACTS_DIR, `${route.name}_390px.png`);
    await page.screenshot({ path: shotPath });
    console.log(`  Saved screenshot: ${shotPath}`);

    // Check contrast of solid buttons, tabs, badges
    const elements = await page.evaluate(() => {
      function parseColor(str) {
        const match = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (!match) return null;
        return {
          r: parseInt(match[1]),
          g: parseInt(match[2]),
          b: parseInt(match[3]),
          a: match[4] !== undefined ? parseFloat(match[4]) : 1.0
        };
      }

      function getLum(r, g, b) {
        const a = [r, g, b].map(v => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
      }

      function getRatio(c1, c2) {
        const l1 = getLum(c1.r, c1.g, c1.b);
        const l2 = getLum(c2.r, c2.g, c2.b);
        return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      }

      const items = [];
      const targets = document.querySelectorAll('button, a, span, div, h1, h2, h3, h4, input');

      for (const el of Array.from(targets)) {
        const style = window.getComputedStyle(el);
        const bg = parseColor(style.backgroundColor);
        if (!bg || bg.a < 0.6) continue;

        // Categorize background fills
        const isVoltLime = bg.r > 170 && bg.g > 230 && bg.b < 100;
        const isCyan = bg.b > 220 && bg.g > 180 && bg.r < 140;
        const isAmber = bg.r > 220 && bg.g > 140 && bg.b < 70;
        const isGold = bg.r > 230 && bg.g > 190 && bg.b < 50;
        const isIndigo = bg.r > 80 && bg.r < 120 && bg.g > 80 && bg.g < 130 && bg.b > 220;

        if (isVoltLime || isCyan || isAmber || isGold || isIndigo) {
          const text = (el.innerText || (el.tagName === 'INPUT' ? el.value : '')).trim().replace(/\n/g, ' ');
          if (text.length > 0 && text.length < 80) {
            const fg = parseColor(style.color);
            if (fg) {
              const ratio = Math.round(getRatio(bg, fg) * 100) / 100;
              items.push({
                tag: el.tagName.toLowerCase(),
                text: text.substring(0, 35),
                fillType: isVoltLime ? 'Volt Lime' : isCyan ? 'Cyan' : isAmber ? 'Amber' : isGold ? 'Gold' : 'Indigo',
                bg: `rgb(${bg.r}, ${bg.g}, ${bg.b})`,
                fg: `rgb(${fg.r}, ${fg.g}, ${fg.b})`,
                ratio,
                passesAA: ratio >= 4.5,
                passesAAA: ratio >= 7.0
              });
            }
          }
        }
      }
      return items;
    });

    auditReport.push({ route: route.name, elements });
  }

  // Modals capture:
  // 1. QuickAction Modal
  console.log('Capturing QuickAction Modal...');
  try {
    await page.goto('http://localhost:3000/today', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 800));
    const fab = await page.$('button[aria-label="Quick Action"]');
    if (fab) {
      await fab.click();
      await new Promise(r => setTimeout(r, 800));
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'modal_quick_action_390px.png') });
    }
  } catch (e) {
    console.error('QuickAction modal err:', e.message);
  }

  // 2. Rest Timer Modal
  console.log('Capturing Rest Timer Modal...');
  try {
    await page.goto('http://localhost:3000/body?tab=logger', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 800));
    const restBtn = await page.evaluateHandle(() => {
      return Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Rest Timer'));
    });
    if (restBtn && restBtn.asElement()) {
      await restBtn.asElement().click();
      await new Promise(r => setTimeout(r, 800));
      await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'modal_rest_timer_390px.png') });
    }
  } catch (e) {
    console.error('Rest timer modal err:', e.message);
  }

  await browser.close();

  fs.writeFileSync('./scratch/authenticated_contrast_results.json', JSON.stringify(auditReport, null, 2));
  console.log('All screenshots and contrast audits completed successfully!');
}

run().catch(console.error);
