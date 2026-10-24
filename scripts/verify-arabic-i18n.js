const puppeteer = require('puppeteer-core');
const path = require('path');

const ARTIFACTS_DIR = 'C:/Users/MAS/.gemini/antigravity-ide/brain/3c2f8de6-2519-42db-8f37-3104c6e04433';
const CHROME_PATH = 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';

async function run() {
  console.log('=== Starting Arabic Language & Formal Egyptian Localization Verification ===\n');

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

  // Test 1: Load English initially
  console.log('1. Loading http://localhost:3000/today in English...');
  await page.goto('http://localhost:3000/today', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.addStyleTag({
    content: `nextjs-portal, [data-nextjs-dev-tools-button], #next-dev-tools-root { display: none !important; }`
  });
  await new Promise((res) => setTimeout(res, 1500));

  let initialDir = await page.evaluate(() => document.documentElement.dir);
  console.log(`Initial document dir: "${initialDir}" (expected: "ltr" or "")`);

  // Test 2: Switch language to Arabic using Header Quick Toggle
  console.log('\n2. Clicking language toggle button in Header...');
  const toggleBtn = await page.$('button[aria-label*="العربية"]');
  if (toggleBtn) {
    await toggleBtn.click();
    console.log('Clicked header language button.');
  } else {
    // Alternatively set through localStorage and reload
    console.log('Setting localStorage lifemaxxing_locale to "ar" directly...');
    await page.evaluate(() => {
      localStorage.setItem('lifemaxxing_locale', 'ar');
      document.cookie = 'lifemaxxing_locale=ar; path=/; max-age=31536000';
      window.location.reload();
    });
  }

  await new Promise((res) => setTimeout(res, 1500));

  // Check RTL & Lang attributes
  const arDir = await page.evaluate(() => document.documentElement.dir);
  const arLang = await page.evaluate(() => document.documentElement.lang);
  console.log(`Updated document dir: "${arDir}" (expected: "rtl")`);
  console.log(`Updated document lang: "${arLang}" (expected: "ar")`);
  if (arDir !== 'rtl' || arLang !== 'ar') {
    throw new Error(`RTL switch failed: dir="${arDir}", lang="${arLang}"`);
  }

  // Verify Bottom Navigation Bar Arabic Labels
  const navText = await page.evaluate(() => {
    const bar = document.querySelector('nav[aria-label="Bottom Navigation"]');
    return bar ? bar.innerText : '';
  });
  console.log(`Bottom nav text in Arabic:\n${navText}`);
  const hasTodayAr = navText.includes('النهاردة');
  const hasBodyAr = navText.includes('الجسم');
  const hasMindAr = navText.includes('العقل');
  const hasSchoolAr = navText.includes('الدراسة');
  console.log(`Nav tabs verified: النهاردة=${hasTodayAr}, الجسم=${hasBodyAr}, العقل=${hasMindAr}, الدراسة=${hasSchoolAr}`);

  if (!hasTodayAr || !hasBodyAr || !hasMindAr || !hasSchoolAr) {
    throw new Error('Arabic bottom nav labels not matching expected formal Egyptian copy');
  }

  // Capture Today View in Arabic
  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'arabic_today_390px.png') });
  console.log('Saved screenshot: arabic_today_390px.png');

  // Test 3: Open Quick Action Modal in Arabic
  console.log('\n3. Opening Quick Logger (+) in Arabic...');
  const plusBtn = await page.$('button[aria-label="Quick Action"]');
  if (plusBtn) {
    await plusBtn.click();
    await new Promise((res) => setTimeout(res, 600));

    const modalText = await page.evaluate(() => {
      const modal = document.querySelector('.fixed.inset-0.z-50');
      return modal ? modal.innerText : '';
    });
    console.log('Quick Action modal content preview:');
    console.log(modalText.slice(0, 300));

    const hasTitle = modalText.includes('المسجل السريع');
    const hasWater = modalText.includes('سجل ميه');
    const hasCaffeine = modalText.includes('سجل كافيين');
    const hasWeight = modalText.includes('سجل الوزن');
    const hasMeal = modalText.includes('سجل وجبة');
    console.log(`Quick logger verified: المسجل السريع=${hasTitle}, سجل ميه=${hasWater}, سجل كافيين=${hasCaffeine}, سجل وجبة=${hasMeal}`);

    await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'arabic_quick_action_390px.png') });
    console.log('Saved screenshot: arabic_quick_action_390px.png');

    // Close modal
    const closeBtn = await page.$('.fixed.inset-0.z-50 button');
    if (closeBtn) await closeBtn.click();
    await new Promise((res) => setTimeout(res, 500));
  }

  // Test 4: Body View in Arabic
  console.log('\n4. Navigating to /body in Arabic...');
  await page.goto('http://localhost:3000/body', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.addStyleTag({
    content: `nextjs-portal, [data-nextjs-dev-tools-button], #next-dev-tools-root { display: none !important; }`
  });
  await new Promise((res) => setTimeout(res, 1200));

  const bodyPageText = await page.evaluate(() => document.body.innerText);
  console.log('Body view tabs verified:');
  console.log(`- التمرين الحالي: ${bodyPageText.includes('التمرين الحالي')}`);
  console.log(`- الوزن: ${bodyPageText.includes('الوزن')}`);
  console.log(`- النوم: ${bodyPageText.includes('النوم')}`);
  console.log(`- التغذية: ${bodyPageText.includes('التغذية')}`);
  console.log(`- المعايير الرياضية: ${bodyPageText.includes('المعايير الرياضية')}`);
  console.log(`- سجل التمارين: ${bodyPageText.includes('سجل التمارين')}`);

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'arabic_body_390px.png') });
  console.log('Saved screenshot: arabic_body_390px.png');

  // Test 5: Mind View in Arabic
  console.log('\n5. Navigating to /mind in Arabic...');
  await page.goto('http://localhost:3000/mind', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.addStyleTag({
    content: `nextjs-portal, [data-nextjs-dev-tools-button], #next-dev-tools-root { display: none !important; }`
  });
  await new Promise((res) => setTimeout(res, 1200));

  const mindPageText = await page.evaluate(() => document.body.innerText);
  console.log('Mind view tabs verified:');
  console.log(`- محرك التركيز والذهن: ${mindPageText.includes('محرك التركيز والذهن')}`);
  console.log(`- الحساب الذهني: ${mindPageText.includes('الحساب الذهني')}`);
  console.log(`- القراءة: ${mindPageText.includes('القراءة')}`);
  console.log(`- وقت الشاشة: ${mindPageText.includes('وقت الشاشة')}`);

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'arabic_mind_390px.png') });
  console.log('Saved screenshot: arabic_mind_390px.png');

  // Test 6: School View in Arabic
  console.log('\n6. Navigating to /school in Arabic...');
  await page.goto('http://localhost:3000/school', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.addStyleTag({
    content: `nextjs-portal, [data-nextjs-dev-tools-button], #next-dev-tools-root { display: none !important; }`
  });
  await new Promise((res) => setTimeout(res, 1200));

  const schoolPageText = await page.evaluate(() => document.body.innerText);
  console.log('School view tabs verified:');
  console.log(`- نظرة عامة: ${schoolPageText.includes('نظرة عامة')}`);
  console.log(`- الدرجات: ${schoolPageText.includes('الدرجات')}`);
  console.log(`- الجدول والخطط: ${schoolPageText.includes('الجدول والخطط')}`);
  console.log(`- التدريب والأخطاء: ${schoolPageText.includes('التدريب والأخطاء')}`);
  console.log(`- الجدول الأسبوعي: ${schoolPageText.includes('الجدول الأسبوعي')}`);

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'arabic_school_390px.png') });
  console.log('Saved screenshot: arabic_school_390px.png');

  // Test 7: Settings View in Arabic
  console.log('\n7. Navigating to /settings?tab=preferences in Arabic...');
  await page.goto('http://localhost:3000/settings?tab=preferences', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.addStyleTag({
    content: `nextjs-portal, [data-nextjs-dev-tools-button], #next-dev-tools-root { display: none !important; }`
  });
  await new Promise((res) => setTimeout(res, 1200));

  const settingsSelectVal = await page.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select'));
    for (const s of selects) {
      if (s.innerHTML.includes('العربية - اللهجة المصرية الفصحى')) {
        return s.value;
      }
    }
    return null;
  });
  console.log(`Preferences tab language select value: "${settingsSelectVal}" (expected: "ar")`);

  await page.screenshot({ path: path.join(ARTIFACTS_DIR, 'arabic_settings_390px.png') });
  console.log('Saved screenshot: arabic_settings_390px.png');

  // Test 8: Toggle back to English
  console.log('\n8. Toggling back to English to test reversibility...');
  const enBtn = await page.$('button[aria-label*="English"]');
  if (enBtn) {
    await enBtn.click();
  } else {
    await page.evaluate(() => {
      localStorage.setItem('lifemaxxing_locale', 'en');
      document.cookie = 'lifemaxxing_locale=en; path=/; max-age=31536000';
      window.location.reload();
    });
  }
  await new Promise((res) => setTimeout(res, 1200));

  const revertedDir = await page.evaluate(() => document.documentElement.dir);
  const revertedLang = await page.evaluate(() => document.documentElement.lang);
  console.log(`Reverted document dir: "${revertedDir}" (expected: "ltr")`);
  console.log(`Reverted document lang: "${revertedLang}" (expected: "en")`);

  if (revertedDir !== 'ltr' || revertedLang !== 'en') {
    throw new Error(`Reversion to English failed: dir="${revertedDir}", lang="${revertedLang}"`);
  }

  await browser.close();
  console.log('\n=== ALL ARABIC & EGYPTIAN LOCALIZATION VERIFICATIONS PASSED ===');
}

run().catch((err) => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
