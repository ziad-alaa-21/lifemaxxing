export type Locale = "en" | "ar";

export interface TranslationDictionary {
  nav: {
    today: string;
    todaySubtitle: string;
    body: string;
    bodySubtitle: string;
    mind: string;
    mindSubtitle: string;
    school: string;
    schoolSubtitle: string;
    settings: string;
    settingsSubtitle: string;
    fastAction: string;
    signOut: string;
    brandTag: string;
  };
  quickAction: {
    title: string;
    subtitle: string;
    logWater: string;
    logWaterDesc: string;
    logCaffeine: string;
    logCaffeineDesc: string;
    logWeight: string;
    logWeightDesc: string;
    focusTimer: string;
    focusTimerDesc: string;
    stateCheckin: string;
    stateCheckinDesc: string;
    logMeal: string;
    logMealDesc: string;
    addDeadline: string;
    addDeadlineDesc: string;
    weightModalTitle: string;
    weightPlaceholder: string;
    saveWeight: string;
    checkinTitle: string;
    moodLabel: string;
    energyLabel: string;
    saveCheckin: string;
  };
  common: {
    save: string;
    cancel: string;
    done: string;
    delete: string;
    edit: string;
    add: string;
    loading: string;
    optional: string;
    required: string;
    active: string;
    completed: string;
    back: string;
    success: string;
    error: string;
  };
  today: {
    title: string;
    prioritiesTitle: string;
    addPriority: string;
    noPriorities: string;
    setFirstPriority: string;
    circadianTitle: string;
    circadianDesc: string;
    ringsTitle: string;
    ringsSub: string;
    bodyRing: string;
    mindRing: string;
    schoolRing: string;
    missingTelemetry: string;
    seeReasoning: string;
  };
  body: {
    activeSession: string;
    bodyWeight: string;
    sleep: string;
    nutrition: string;
    standards: string;
    history: string;
    finishWorkout: string;
    restTimer: string;
    addExercise: string;
  };
  mind: {
    engineTitle: string;
    focusTimer: string;
    mentalMath: string;
    dailyCommitments: string;
    dopamineControl: string;
    configureCommitments: string;
    screenTime: string;
    reading: string;
    startFocus: string;
  };
  school: {
    overview: string;
    grades: string;
    plan: string;
    practice: string;
    addSubject: string;
    mistakes: string;
    timetable: string;
  };
  settings: {
    account: string;
    preferences: string;
    protocol: string;
    devices: string;
    data: string;
    privacy: string;
    language: string;
    languageLabel: string;
    languageHelp: string;
    savePreferences: string;
    savedSuccess: string;
  };
}

export const translations: Record<Locale, TranslationDictionary> = {
  en: {
    nav: {
      today: "Today",
      todaySubtitle: "Daily protocol and focus",
      body: "Body",
      bodySubtitle: "Strength engine and lifts",
      mind: "Mind",
      mindSubtitle: "Cognitive readiness and sleep",
      school: "School",
      schoolSubtitle: "Subjects, grades and deadlines",
      settings: "Settings",
      settingsSubtitle: "Account preferences and system info",
      fastAction: "Fast Action",
      signOut: "Sign Out",
      brandTag: "Personal Telemetry",
    },
    quickAction: {
      title: "Quick Logger",
      subtitle: "Instant telemetry entry",
      logWater: "Log Water",
      logWaterDesc: "ml (from settings)",
      logCaffeine: "Log Caffeine",
      logCaffeineDesc: "mg (from settings)",
      logWeight: "Log Weight",
      logWeightDesc: "Bodyweight (kg)",
      focusTimer: "Focus Timer",
      focusTimerDesc: "Launch deep work sprint",
      stateCheckin: "State Check-in",
      stateCheckinDesc: "Mood & energy ratings",
      logMeal: "Log Meal",
      logMealDesc: "Macros & AI parser",
      addDeadline: "Add Academic Deadline",
      addDeadlineDesc: "Exam, quiz, or coursework due date",
      weightModalTitle: "Log Today's Bodyweight",
      weightPlaceholder: "e.g. 78.5",
      saveWeight: "Save Weight",
      checkinTitle: "Quick State Check-in",
      moodLabel: "Mood (1-5)",
      energyLabel: "Energy (1-5)",
      saveCheckin: "Save Check-in",
    },
    common: {
      save: "Save",
      cancel: "Cancel",
      done: "Done",
      delete: "Delete",
      edit: "Edit",
      add: "Add",
      loading: "Loading...",
      optional: "Optional",
      required: "Required",
      active: "Active",
      completed: "Completed",
      back: "Back",
      success: "Saved successfully",
      error: "An error occurred",
    },
    today: {
      title: "Today",
      prioritiesTitle: "Today's Priorities",
      addPriority: "Add Task",
      noPriorities: "No priorities scheduled for today.",
      setFirstPriority: "Set your first priority",
      circadianTitle: "Circadian Timeline",
      circadianDesc: "Dynamic schedule from your anchors",
      ringsTitle: "Life Pulse",
      ringsSub: "3 Rings",
      bodyRing: "Body",
      mindRing: "Mind",
      schoolRing: "School",
      missingTelemetry: "MISSING TELEMETRY",
      seeReasoning: "See reasoning",
    },
    body: {
      activeSession: "Active Session",
      bodyWeight: "Body Weight",
      sleep: "Sleep",
      nutrition: "Nutrition",
      standards: "Standards",
      history: "History",
      finishWorkout: "FINISH WORKOUT",
      restTimer: "Rest Timer",
      addExercise: "Add Exercise to Session",
    },
    mind: {
      engineTitle: "Mind Engine",
      focusTimer: "Focus & Overview",
      mentalMath: "Mental Math",
      dailyCommitments: "Daily Commitments",
      dopamineControl: "Dopamine control",
      configureCommitments: "Configure",
      screenTime: "Screen Time",
      reading: "Daily Reading",
      startFocus: "Start Focus Sprint",
    },
    school: {
      overview: "Overview",
      grades: "Grades",
      plan: "Plan & Schedule",
      practice: "Practice & Redo",
      addSubject: "Add Subject",
      mistakes: "Mistakes Book",
      timetable: "Weekly Timetable",
    },
    settings: {
      account: "Account",
      preferences: "Preferences",
      protocol: "Protocol",
      devices: "Devices",
      data: "Data",
      privacy: "Privacy",
      language: "App Language",
      languageLabel: "Language",
      languageHelp: "Supports full bidirectional RTL layout.",
      savePreferences: "Save Preferences",
      savedSuccess: "Preferences updated successfully!",
    },
  },

  ar: {
    nav: {
      today: "النهاردة",
      todaySubtitle: "بروتوكول اليوم والتركيز",
      body: "الجسم",
      bodySubtitle: "تمارين القوة ومتابعة اللياقة",
      mind: "العقل",
      mindSubtitle: "الجاهزية الذهنية ومتابعة النوم",
      school: "الدراسة",
      schoolSubtitle: "المواد والدرجات والمواعيد المهمة",
      settings: "الإعدادات",
      settingsSubtitle: "تفضيلات الحساب وبيانات النظام",
      fastAction: "تسجيل سريع",
      signOut: "تسجيل الخروج",
      brandTag: "القياسات الشخصية",
    },
    quickAction: {
      title: "المسجل السريع",
      subtitle: "تسجيل فوري بدون مجهود",
      logWater: "سجل ميه",
      logWaterDesc: "مل (من الإعدادات)",
      logCaffeine: "سجل كافيين",
      logCaffeineDesc: "مجم (من الإعدادات)",
      logWeight: "سجل الوزن",
      logWeightDesc: "الوزن الحالي بالكيلو",
      focusTimer: "مؤقت التركيز",
      focusTimerDesc: "ابدأ جلسة عمل عميق",
      stateCheckin: "تسجيل الحالة",
      stateCheckinDesc: "تقييم المزاج ومستوى الطاقة",
      logMeal: "سجل وجبة",
      logMealDesc: "السعرات والماكروز بالذكاء الاصطناعي",
      addDeadline: "أضف ميعاد دراسي",
      addDeadlineDesc: "امتحان أو كويز أو ميعاد تسليم",
      weightModalTitle: "تسجيل وزن النهاردة",
      weightPlaceholder: "مثال: 78.5",
      saveWeight: "حفظ الوزن",
      checkinTitle: "تسجيل الحالة السريع",
      moodLabel: "المزاج (1-5)",
      energyLabel: "الطاقة (1-5)",
      saveCheckin: "حفظ الحالة",
    },
    common: {
      save: "حفظ",
      cancel: "إلغاء",
      done: "تمام",
      delete: "حذف",
      edit: "تعديل",
      add: "إضافة",
      loading: "جاري التحميل...",
      optional: "اختياري",
      required: "مطلوب",
      active: "نشط",
      completed: "مكتمل",
      back: "رجوع",
      success: "تم الحفظ بنجاح",
      error: "حصل خطأ غير متوقع",
    },
    today: {
      title: "النهاردة",
      prioritiesTitle: "أولويات النهاردة",
      addPriority: "أضف مهمة",
      noPriorities: "مفيش أولويات متسجلة للنهاردة لسه.",
      setFirstPriority: "حدد أول أولوياتك",
      circadianTitle: "الجدول الحيوي (الساعة البيولوجية)",
      circadianDesc: "جدول يومك بناءً على مواعيدك الأساسية",
      ringsTitle: "نبض الإنجاز",
      ringsSub: "3 حلقات",
      bodyRing: "الجسم",
      mindRing: "العقل",
      schoolRing: "الدراسة",
      missingTelemetry: "بيانات ناقصة للنهاردة",
      seeReasoning: "عرض السبب",
    },
    body: {
      activeSession: "التمرين الحالي",
      bodyWeight: "الوزن",
      sleep: "النوم",
      nutrition: "التغذية",
      standards: "المعايير الرياضية",
      history: "سجل التمارين",
      finishWorkout: "إنهاء التمرين",
      restTimer: "مؤقت الراحة",
      addExercise: "إضافة تمرين للجلسة",
    },
    mind: {
      engineTitle: "محرك التركيز والذهن",
      focusTimer: "التركيز والنظرة العامة",
      mentalMath: "الحساب الذهني",
      dailyCommitments: "التزاماتك اليومية",
      dopamineControl: "التحكم في الدوبامين والتشتت",
      configureCommitments: "تعديل",
      screenTime: "وقت الشاشة",
      reading: "القراءة اليومية",
      startFocus: "ابدأ جلسة تركيز",
    },
    school: {
      overview: "نظرة عامة",
      grades: "الدرجات",
      plan: "الجدول والخطط",
      practice: "التدريب والأخطاء",
      addSubject: "إضافة مادة",
      mistakes: "كشكول الأخطاء",
      timetable: "الجدول الأسبوعي",
    },
    settings: {
      account: "الحساب",
      preferences: "التفضيلات",
      protocol: "البروتوكول",
      devices: "الأجهزة",
      data: "البيانات",
      privacy: "الخصوصية",
      language: "لغة التطبيق",
      languageLabel: "اللغة",
      languageHelp: "التطبيق بيدعم الواجهة من اليمين للشمال (RTL) بالكامل.",
      savePreferences: "حفظ التفضيلات",
      savedSuccess: "تم تحديث التفضيلات بنجاح!",
    },
  },
};
