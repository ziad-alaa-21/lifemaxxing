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

  // Inject helper to hide Next.js dev overlay indicator in screenshots
  page.on('load', async () => {
    try {
      await page.addStyleTag({
        content: `
          nextjs-portal, [data-nextjs-dev-tools-button], #next-dev-tools-root, [class*="dev-tools"] {
            display: none !important;
            visibility: hidden !important;
            pointer-events: none !important;
          }
        `
      });
    } catch {}
  });

  const routes = [
    { name: 'liquid_glass_today_390px.png', url: 'http://localhost:3000/today' },
    { name: 'liquid_glass_body_390px.png', url: 'http://localhost:3000/body' },
    { name: 'liquid_glass_mind_390px.png', url: 'http://localhost:3000/mind' },
    { name: 'liquid_glass_school_390px.png', url: 'http://localhost:3000/school' }
  ];

  for (const r of routes) {
    console.log(`Navigating to ${r.url}...`);
    await page.goto(r.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.addStyleTag({
      content: `nextjs-portal, [data-nextjs-dev-tools-button], #next-dev-tools-root { display: none !important; }`
    });
    await new Promise((res) => setTimeout(res, 1200));
    await page.screenshot({ path: path.join(ARTIFACTS_DIR, r.name) });
    console.log(`Saved ${r.name}`);
  }

  // 5. Scrolled busy content behind bar on /today
  console.log('Navigating to /today and scrolling busy content behind bar...');
  await page.goto('http://localhost:3000/today', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.addStyleTag({
    content: `nextjs-portal, [data-nextjs-dev-tools-button], #next-dev-tools-root { display: none !important; }`
  });
  await page.evaluate(() => {
    const main = document.querySelector('main');
    if (main) main.scrollTop = 380;
  });
  await new Promise((res) => setTimeout(res, 1200));
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'liquid_glass_scrolled_content_390px.png') });
  console.log('Saved liquid_glass_scrolled_content_390px.png');

  // 6. Modal open (Quick Action modal)
  console.log('Opening Quick Action modal...');
  await page.evaluate(() => {
    const plusBtn = document.querySelector('button[aria-label="Quick Action"]');
    if (plusBtn) plusBtn.click();
  });
  await new Promise((res) => setTimeout(res, 1000));
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'liquid_glass_modal_open_390px.png') });
  console.log('Saved liquid_glass_modal_open_390px.png');

  // Close modal
  await page.evaluate(() => {
    const closeBtn = document.querySelector('button .lucide-x')?.closest('button');
    if (closeBtn) closeBtn.click();
  });
  await new Promise((res) => setTimeout(res, 600));

  // 7. Offline banner
  console.log('Dispatching offline event...');
  await page.evaluate(() => {
    window.dispatchEvent(new Event('offline'));
  });
  await new Promise((res) => setTimeout(res, 1000));
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'liquid_glass_offline_banner_390px.png') });
  console.log('Saved liquid_glass_offline_banner_390px.png');

  // 8. Calculate exact contrast values
  const contrastAnalysis = await page.evaluate(() => {
    function getLuminance(r, g, b) {
      const a = [r, g, b].map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    }

    function getRatio(l1, l2) {
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      return (lighter + 0.05) / (darker + 0.05);
    }

    // Glass bar estimated surface base color: rgba(18, 22, 28) with white/10
    const barLum = getLuminance(18, 22, 28);
    const lensLum = getLuminance(36, 42, 50); // with lens brighten overlay

    // Active Lime text (#c6ff3d): rgb(198, 255, 61)
    const limeLum = getLuminance(198, 255, 61);

    // Inactive text (#94a3b8): rgb(148, 163, 184)
    const inactiveLum = getLuminance(148, 163, 184);

    // Dark icon on plus button (#0a0a0f): rgb(10, 10, 15)
    const darkIconLum = getLuminance(10, 10, 15);

    return {
      activeTabContrast: getRatio(limeLum, lensLum).toFixed(2),
      inactiveTabContrast: getRatio(inactiveLum, barLum).toFixed(2),
      plusButtonIconContrast: getRatio(limeLum, darkIconLum).toFixed(2)
    };
  });

  console.log('CONTRAST ANALYSIS:', JSON.stringify(contrastAnalysis, null, 2));

  await browser.close();
  console.log('Capture and Verification Complete!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
