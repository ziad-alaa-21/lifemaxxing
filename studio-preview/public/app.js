/**
 * Lifemaxxing Mobile Studio - Frontend Engine
 */

let catalog = null;
let currentProjectKey = 'project1'; // Obsidian Kinetic (Exclusive)
let currentScreens = [];
let activeScreenIndex = 0;
let currentFilterCategory = 'all';
let currentSearchQuery = '';
let currentZoom = 1.0;
let editNotes = {}; // Structure: { [screenId]: { checklist: [{id, text, done}], textNotes: '' } }

// DOM Elements
const projectSelect = document.getElementById('projectSelect');
const screensList = document.getElementById('screensList');
const screenCountText = document.getElementById('screenCountText');
const screenSearchInput = document.getElementById('screenSearchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const categoryPills = document.getElementById('categoryPills');

const phoneFrame = document.getElementById('phoneFrame');
const screenIframe = document.getElementById('screenIframe');
const statusClock = document.getElementById('statusClock');
const screenActiveTitle = document.getElementById('screenActiveTitle');
const screenCategoryTag = document.getElementById('screenCategoryTag');
const copyStitchIdBtn = document.getElementById('copyStitchIdBtn');
const viewScreenshotBtn = document.getElementById('viewScreenshotBtn');
const openNewTabBtn = document.getElementById('openNewTabBtn');
const refreshIframeBtn = document.getElementById('refreshIframeBtn');

// Viewport & Device Controls
const devicePixelBtn = document.getElementById('devicePixelBtn');
const deviceSamsungBtn = document.getElementById('deviceSamsungBtn');
const deviceIphoneBtn = document.getElementById('deviceIphoneBtn');
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const zoomLevelText = document.getElementById('zoomLevelText');
const toggleFrameBtn = document.getElementById('toggleFrameBtn');

// Spec & Notes Panel
const specPanel = document.getElementById('specPanel');
const toggleNotesBtn = document.getElementById('toggleNotesBtn');
const closePanelBtn = document.getElementById('closePanelBtn');
const panelTabs = document.getElementById('panelTabs');
const tabContentNotes = document.getElementById('tabContentNotes');
const tabContentSpec = document.getElementById('tabContentSpec');

// Checklist & Notes elements
const newNoteInput = document.getElementById('newNoteInput');
const addNoteBtn = document.getElementById('addNoteBtn');
const checklistItems = document.getElementById('checklistItems');
const notesProgressCount = document.getElementById('notesProgressCount');
const screenFreeNotes = document.getElementById('screenFreeNotes');
const saveNotesBtn = document.getElementById('saveNotesBtn');
const exportNotesBtn = document.getElementById('exportNotesBtn');

// Compose Spec elements
const composeTreeCode = document.getElementById('composeTreeCode');
const tokensGrid = document.getElementById('tokensGrid');
const vmMappingBox = document.getElementById('vmMappingBox');

// Modal Elements
const screenshotModal = document.getElementById('screenshotModal');
const modalScreenshotImg = document.getElementById('modalScreenshotImg');
const modalTitle = document.getElementById('modalTitle');
const closeModalBtn = document.getElementById('closeModalBtn');

// Initialize Studio
async function init() {
  updateClock();
  setInterval(updateClock, 30000);

  setupEventListeners();

  try {
    const [catRes, notesRes] = await Promise.all([
      fetch('/api/catalog'),
      fetch('/api/notes')
    ]);

    catalog = await catRes.json();
    editNotes = await notesRes.json() || {};

    loadProject(currentProjectKey);
  } catch (err) {
    console.error('Error loading catalog:', err);
    screensList.innerHTML = `<div style="padding: 20px; color: #ef4444;">Failed to load screens. Please make sure the local server is running.</div>`;
  }
}

function updateClock() {
  const now = new Date();
  const hrs = now.getHours();
  const mins = String(now.getMinutes()).padStart(2, '0');
  statusClock.textContent = `${hrs}:${mins}`;
}

// Category extraction helper
function categorizeScreen(screenTitle) {
  const t = screenTitle.toLowerCase();
  if (t.includes('onboarding') || t.includes('goal protocol')) return 'onboarding';
  if (t.includes('today') || t.includes('daily decision') || t.includes('executive')) return 'today';
  if (t.includes('body') || t.includes('workout') || t.includes('lift') || t.includes('sleep') || t.includes('nutrition') || t.includes('weight') || t.includes('recovery')) return 'body';
  if (t.includes('mind') || t.includes('mental math') || t.includes('cognitive') || t.includes('focus')) return 'mind';
  if (t.includes('school') || t.includes('academic') || t.includes('cs 374') || t.includes('cs 280') || t.includes('grade') || t.includes('mistake')) return 'school';
  if (t.includes('settings') || t.includes('shell') || t.includes('more') || t.includes('tip card')) return 'settings';
  return 'other';
}

function loadProject(projectKey) {
  currentProjectKey = projectKey;
  const proj = catalog[projectKey];
  if (!proj) return;

  // Filter out any image asset items that aren't screens
  currentScreens = proj.screens.filter(s => s.htmlCode && s.htmlCode.downloadUrl);
  screenCountText.textContent = `${currentScreens.length} Screens`;

  activeScreenIndex = 0;
  renderScreenList();
  if (currentScreens.length > 0) {
    selectScreen(0);
  }
}

function renderScreenList() {
  screensList.innerHTML = '';

  const filtered = currentScreens.filter((screen, idx) => {
    const cat = categorizeScreen(screen.title);
    const matchesCat = currentFilterCategory === 'all' || cat === currentFilterCategory;
    const matchesSearch = !currentSearchQuery || 
      screen.title.toLowerCase().includes(currentSearchQuery.toLowerCase()) ||
      screen.name.toLowerCase().includes(currentSearchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  if (filtered.length === 0) {
    screensList.innerHTML = `
      <div style="padding: 24px 16px; text-align: center; color: var(--text-muted); font-size: 0.85rem;">
        No screens match "${currentSearchQuery}".
      </div>
    `;
    return;
  }

  filtered.forEach((screen) => {
    const globalIdx = currentScreens.indexOf(screen);
    const screenId = screen.name.split('/').pop();
    const cat = categorizeScreen(screen.title);
    const screenNotesCount = editNotes[screenId]?.checklist?.length || 0;

    const item = document.createElement('div');
    item.className = `screen-nav-item ${globalIdx === activeScreenIndex ? 'active' : ''}`;
    item.dataset.index = globalIdx;

    const thumbUrl = screen.screenshot?.downloadUrl || '';

    item.innerHTML = `
      <img src="${thumbUrl}" alt="Thumb" class="screen-nav-thumb" loading="lazy" onerror="this.style.display='none'">
      <div class="screen-nav-info">
        <span class="screen-nav-badge">${cat}</span>
        <div class="screen-nav-title" title="${screen.title}">${screen.title}</div>
        <div class="screen-nav-meta">
          <span>#${globalIdx + 1}</span>
          ${screenNotesCount > 0 ? `<span class="notes-pill-indicator">${screenNotesCount} edit${screenNotesCount > 1 ? 's' : ''}</span>` : ''}
        </div>
      </div>
    `;

    item.addEventListener('click', () => {
      selectScreen(globalIdx);
    });

    screensList.appendChild(item);
  });
}

function selectScreen(index) {
  if (index < 0 || index >= currentScreens.length) return;
  activeScreenIndex = index;

  // Highlight list item
  document.querySelectorAll('.screen-nav-item').forEach(el => {
    el.classList.toggle('active', parseInt(el.dataset.index, 10) === index);
  });

  const screen = currentScreens[index];
  const screenId = screen.name.split('/').pop();
  const category = categorizeScreen(screen.title);

  // Set meta bar
  screenActiveTitle.textContent = screen.title;
  screenCategoryTag.textContent = category.toUpperCase();

  // Load iframe
  screenIframe.src = `/screens_html/${screenId}.html`;

  // Update Compose spec and Edit Notes
  loadNotesForScreen(screenId);
  renderComposeSpec(screen, category);
}

// -----------------------------------------------------------------------------
// Android Compose Spec Generator
// -----------------------------------------------------------------------------
function renderComposeSpec(screen, category) {
  const screenId = screen.name.split('/').pop();
  const title = screen.title;

  let composeTree = '';
  let vmNotes = '';

  if (category === 'onboarding') {
    composeTree = `@Composable
fun OnboardingStepScreen(
    viewModel: OnboardingViewModel = hiltViewModel(),
    onNavigateNext: () -> Unit
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    Scaffold(
        topBar = { OnboardingTopAppBar(progress = uiState.stepProgress) },
        bottomBar = { PrimaryActionBar(onNext = onNavigateNext) }
    ) { padding ->
        LazyColumn(
            modifier = Modifier.padding(padding),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item { HeroHeader(title = "${title}") }
            item { BiometricInputGrid(state = uiState) }
        }
    }
}`;
    vmNotes = `<strong>OnboardingState:</strong> Manages step index, user biometrics baseline (height, weight, sleep schedule), and validates prerequisites before persisting to EncryptedSharedPreferences / Room DB.`;
  } else if (category === 'body') {
    composeTree = `@Composable
fun BodyTelemetryScreen(
    viewModel: BodyViewModel = hiltViewModel()
) {
    val metrics by viewModel.recoveryMetrics.collectAsStateWithLifecycle()

    Scaffold(
        topBar = { TelemetryAppBar(title = "BODY / RECOVERY") },
        floatingActionButton = { FabQuickLogLift() }
    ) { padding ->
        LazyColumn(
            modifier = Modifier.padding(padding),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            item { RecoveryRingGaugeCard(score = metrics.recoveryPercentage) }
            item { BiometricSparklineRow(hrv = metrics.hrv, rhr = metrics.restingHr) }
            item { WorkoutSummaryList(recentWorkouts = metrics.workouts) }
        }
    }
}`;
    vmNotes = `<strong>BodyViewModel:</strong> Integrates with <em>Android Health Connect API</em> for HRV, Sleep stages, and Resting Heart Rate. Synchronizes local SQLite Room workout entries.`;
  } else if (category === 'mind') {
    composeTree = `@Composable
fun MindFocusScreen(
    viewModel: MindViewModel = hiltViewModel()
) {
    val drillState by viewModel.liveDrillState.collectAsStateWithLifecycle()

    Scaffold(
        topBar = { FocusTimerTopBar(timeLeft = drillState.timerSeconds) }
    ) { padding ->
        Column(
            modifier = Modifier.padding(padding).fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            ScoreHeader(currentStreak = drillState.streak)
            MathExpressionDisplay(expression = drillState.problem)
            NumericKeypad(onInput = { viewModel.submitAnswer(it) })
        }
    }
}`;
    vmNotes = `<strong>MindViewModel:</strong> Drives the 120s arithmetic drill loop using Kotlin Coroutines StateFlow. Measures reaction latency per question in milliseconds.`;
  } else if (category === 'school') {
    composeTree = `@Composable
fun AcademicTelemetryScreen(
    viewModel: SchoolViewModel = hiltViewModel()
) {
    val schoolData by viewModel.academicSummary.collectAsStateWithLifecycle()

    Scaffold(
        topBar = { AcademicTopBar(gpa = schoolData.targetGpa) }
    ) { padding ->
        LazyColumn(
            modifier = Modifier.padding(padding)
        ) {
            item { CourseCardList(courses = schoolData.activeCourses) }
            item { MistakeTrackerWell(mistakes = schoolData.mistakeLogs) }
        }
    }
}`;
    vmNotes = `<strong>SchoolViewModel:</strong> Calculates dynamic GPA projections and weighted test curves. Implements spaced repetition flash-card logic for mistake revision.`;
  } else {
    composeTree = `@Composable
fun TodayDashboardScreen(
    viewModel: TodayViewModel = hiltViewModel()
) {
    val todayState by viewModel.dashboardState.collectAsStateWithLifecycle()

    Scaffold(
        topBar = { TodayDashboardHeader(date = todayState.currentDate) },
        bottomBar = { BottomNavigationShell() }
    ) { padding ->
        LazyColumn(modifier = Modifier.padding(padding)) {
            item { DailyFocusCard(priority = todayState.primaryGoal) }
            item { TelemetryPillsRow(vitals = todayState.vitals) }
            item { ActionableHabitsChecklist(habits = todayState.habits) }
        }
    }
}`;
    vmNotes = `<strong>TodayViewModel:</strong> Central aggregator orchestrating Body, Mind, and Academic states into a single prioritized daily flow.`;
  }

  composeTreeCode.textContent = composeTree;
  vmMappingBox.innerHTML = vmNotes;

  // Render tokens
  const proj = catalog[currentProjectKey];
  const isKinetic = currentProjectKey === 'project1';

  tokensGrid.innerHTML = `
    <div class="token-card">
      <div class="token-swatch" style="background: ${isKinetic ? '#c6ff3d' : '#f59e0b'};"></div>
      <div>
        <div class="token-name">Primary / Accent</div>
        <div class="token-hex">${isKinetic ? '#C6FF3D (Volt Lime)' : '#F59E0B (Amber)'}</div>
      </div>
    </div>
    <div class="token-card">
      <div class="token-swatch" style="background: ${isKinetic ? '#5de6ff' : '#06b6d4'};"></div>
      <div>
        <div class="token-name">Secondary</div>
        <div class="token-hex">${isKinetic ? '#5DE6FF (Cyan)' : '#06B6D4 (Cyan)'}</div>
      </div>
    </div>
    <div class="token-card">
      <div class="token-swatch" style="background: ${isKinetic ? '#0f1419' : '#0a0a0f'};"></div>
      <div>
        <div class="token-name">Background</div>
        <div class="token-hex">${isKinetic ? '#0F1419' : '#0A0A0F'}</div>
      </div>
    </div>
    <div class="token-card">
      <div class="token-swatch" style="background: #dee3e9;"></div>
      <div>
        <div class="token-name">Text Primary</div>
        <div class="token-hex">#DEE3E9</div>
      </div>
    </div>
  `;
}

// -----------------------------------------------------------------------------
// Edit Notes & Checklist Engine
// -----------------------------------------------------------------------------
function loadNotesForScreen(screenId) {
  const data = editNotes[screenId] || { checklist: [], textNotes: '' };

  screenFreeNotes.value = data.textNotes || '';
  renderChecklist(data.checklist || []);
}

function renderChecklist(items) {
  checklistItems.innerHTML = '';
  const doneCount = items.filter(i => i.done).length;
  notesProgressCount.textContent = `${doneCount} / ${items.length}`;

  if (items.length === 0) {
    checklistItems.innerHTML = `
      <div style="padding: 12px; text-align: center; color: var(--text-muted); font-size: 0.78rem;">
        No edit tasks logged yet for this screen.
      </div>
    `;
    return;
  }

  items.forEach((item, idx) => {
    const row = document.createElement('div');
    row.className = `checklist-item ${item.done ? 'done' : ''}`;
    row.innerHTML = `
      <input type="checkbox" ${item.done ? 'checked' : ''} data-index="${idx}">
      <span class="checklist-item-text">${item.text}</span>
      <button class="checklist-delete-btn" data-index="${idx}" title="Delete task">
        <span class="material-symbols-outlined">delete</span>
      </button>
    `;

    row.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
      item.done = e.target.checked;
      saveActiveNotes();
      renderChecklist(items);
    });

    row.querySelector('.checklist-delete-btn').addEventListener('click', () => {
      items.splice(idx, 1);
      saveActiveNotes();
      renderChecklist(items);
    });

    checklistItems.appendChild(row);
  });
}

function saveActiveNotes() {
  if (currentScreens.length === 0) return;
  const screen = currentScreens[activeScreenIndex];
  const screenId = screen.name.split('/').pop();

  if (!editNotes[screenId]) {
    editNotes[screenId] = { checklist: [], textNotes: '' };
  }

  editNotes[screenId].textNotes = screenFreeNotes.value;

  // Persist to server
  fetch('/api/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(editNotes, null, 2)
  }).catch(err => console.error('Error saving notes:', err));
}

// -----------------------------------------------------------------------------
// Event Listeners
// -----------------------------------------------------------------------------
function setupEventListeners() {
  // Project Selector (if present)
  if (projectSelect) {
    projectSelect.addEventListener('change', (e) => {
      loadProject(e.target.value);
    });
  }

  // Search
  screenSearchInput.addEventListener('input', (e) => {
    currentSearchQuery = e.target.value.trim();
    clearSearchBtn.classList.toggle('hidden', currentSearchQuery.length === 0);
    renderScreenList();
  });

  clearSearchBtn.addEventListener('click', () => {
    screenSearchInput.value = '';
    currentSearchQuery = '';
    clearSearchBtn.classList.add('hidden');
    renderScreenList();
  });

  // Category Pills
  categoryPills.addEventListener('click', (e) => {
    const pill = e.target.closest('.pill');
    if (!pill) return;

    categoryPills.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');

    currentFilterCategory = pill.dataset.cat;
    renderScreenList();
  });

  // Device Chassis Toggle
  [devicePixelBtn, deviceSamsungBtn, deviceIphoneBtn].forEach(btn => {
    btn.addEventListener('click', () => {
      [devicePixelBtn, deviceSamsungBtn, deviceIphoneBtn].forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const dev = btn.dataset.device;
      phoneFrame.className = `phone-frame device-${dev}`;
    });
  });

  // Zoom
  zoomInBtn.addEventListener('click', () => {
    if (currentZoom < 1.3) currentZoom += 0.1;
    applyZoom();
  });
  zoomOutBtn.addEventListener('click', () => {
    if (currentZoom > 0.6) currentZoom -= 0.1;
    applyZoom();
  });

  function applyZoom() {
    phoneFrame.style.transform = `scale(${currentZoom.toFixed(2)})`;
    zoomLevelText.textContent = `${Math.round(currentZoom * 100)}%`;
  }

  // Toggle Frame
  toggleFrameBtn.addEventListener('click', () => {
    phoneFrame.classList.toggle('no-bezel');
  });

  // Refresh Iframe
  refreshIframeBtn.addEventListener('click', () => {
    screenIframe.src = screenIframe.src;
  });

  // Open Full Screen in New Tab
  openNewTabBtn.addEventListener('click', () => {
    if (currentScreens.length === 0) return;
    const screenId = currentScreens[activeScreenIndex].name.split('/').pop();
    window.open(`/screens_html/${screenId}.html`, '_blank');
  });

  // Copy Stitch ID
  copyStitchIdBtn.addEventListener('click', () => {
    if (currentScreens.length === 0) return;
    const screen = currentScreens[activeScreenIndex];
    navigator.clipboard.writeText(screen.name);
    copyStitchIdBtn.querySelector('span:last-child').textContent = 'Copied!';
    setTimeout(() => {
      copyStitchIdBtn.querySelector('span:last-child').textContent = 'Copy ID';
    }, 1500);
  });

  // View Screenshot Modal
  viewScreenshotBtn.addEventListener('click', () => {
    if (currentScreens.length === 0) return;
    const screen = currentScreens[activeScreenIndex];
    if (screen.screenshot?.downloadUrl) {
      modalScreenshotImg.src = screen.screenshot.downloadUrl;
      modalTitle.textContent = screen.title;
      screenshotModal.classList.remove('hidden');
    }
  });

  closeModalBtn.addEventListener('click', () => {
    screenshotModal.classList.add('hidden');
  });

  screenshotModal.addEventListener('click', (e) => {
    if (e.target === screenshotModal) {
      screenshotModal.classList.add('hidden');
    }
  });

  // Spec Panel Toggle
  toggleNotesBtn.addEventListener('click', () => {
    specPanel.classList.toggle('collapsed');
  });
  closePanelBtn.addEventListener('click', () => {
    specPanel.classList.add('collapsed');
  });

  // Spec Panel Tabs
  panelTabs.addEventListener('click', (e) => {
    const tabBtn = e.target.closest('.panel-tab');
    if (!tabBtn) return;

    panelTabs.querySelectorAll('.panel-tab').forEach(t => t.classList.remove('active'));
    tabBtn.classList.add('active');

    const tab = tabBtn.dataset.tab;
    tabContentNotes.classList.toggle('active', tab === 'edit-notes');
    tabContentSpec.classList.toggle('active', tab === 'android-spec');
  });

  // Add Note
  addNoteBtn.addEventListener('click', handleAddNote);
  newNoteInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleAddNote();
  });

  function handleAddNote() {
    const text = newNoteInput.value.trim();
    if (!text || currentScreens.length === 0) return;

    const screenId = currentScreens[activeScreenIndex].name.split('/').pop();
    if (!editNotes[screenId]) editNotes[screenId] = { checklist: [], textNotes: '' };
    if (!editNotes[screenId].checklist) editNotes[screenId].checklist = [];

    editNotes[screenId].checklist.push({
      id: Date.now(),
      text: text,
      done: false
    });

    newNoteInput.value = '';
    saveActiveNotes();
    renderChecklist(editNotes[screenId].checklist);
    renderScreenList(); // Update count badge
  }

  // Save Notes Button
  saveNotesBtn.addEventListener('click', () => {
    saveActiveNotes();
    saveNotesBtn.querySelector('span:last-child').textContent = 'Saved!';
    setTimeout(() => {
      saveNotesBtn.querySelector('span:last-child').textContent = 'Save Changes';
    }, 1500);
  });

  screenFreeNotes.addEventListener('blur', saveActiveNotes);

  // Export Notes
  exportNotesBtn.addEventListener('click', () => {
    let md = '# Lifemaxxing Android App - Screen Edit & Spec Notes\n\n';
    md += `Exported on: ${new Date().toLocaleString()}\n\n`;

    currentScreens.forEach(screen => {
      const screenId = screen.name.split('/').pop();
      const data = editNotes[screenId];
      if (data && ((data.checklist && data.checklist.length > 0) || data.textNotes)) {
        md += `## ${screen.title} (\`${screenId}\`)\n\n`;
        if (data.checklist && data.checklist.length > 0) {
          md += '### Tasks:\n';
          data.checklist.forEach(item => {
            md += `- [${item.done ? 'x' : ' '}] ${item.text}\n`;
          });
          md += '\n';
        }
        if (data.textNotes) {
          md += `### Architectural Notes:\n${data.textNotes}\n\n`;
        }
        md += '---\n\n';
      }
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'lifemaxxing_screen_edits.md';
    a.click();
  });
}

// Start
init();
