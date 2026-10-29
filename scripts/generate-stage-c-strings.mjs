import fs from 'node:fs';

const stringsTable = [
  // 1. School - Subjects
  { cat: 'School - Subjects', en: 'School', ar: 'الدراسة والمذاكرة', ctx: 'عنوان قسم الدراسة في الهيدر والنافيجيشن' },
  { cat: 'School - Subjects', en: 'Subjects', ar: 'المواد', ctx: 'التاب الأول في شريط أقسام الدراسة' },
  { cat: 'School - Subjects', en: 'Current subjects', ar: 'المواد الحالية', ctx: 'عنوان قائمة المواد المسجلة' },
  { cat: 'School - Subjects', en: 'Add subject', ar: 'ضيف مادة', ctx: 'زر إضافة مادة أو مقرر جديد' },
  { cat: 'School - Subjects', en: 'Study timer', ar: 'تايمر المذاكرة', ctx: 'كارت التايمر في واجهة المواد' },
  { cat: 'School - Subjects', en: 'Ready to record', ar: 'جاهز للتسجيل', ctx: 'حالة الاستعداد للتايمر' },
  { cat: 'School - Subjects', en: 'Goal for this session', ar: 'هدفك للجلسة دي', ctx: 'خانة تحديد نية/مهمة الجلسة' },
  { cat: 'School - Subjects', en: 'Daily target', ar: 'الهدف اليومي', ctx: 'شريط تتبع الساعات المكتملة' },
  { cat: 'School - Subjects', en: 'average grade', ar: 'متوسط الدرجات', ctx: 'نسبة الإنجاز لكل مادة' },
  { cat: 'School - Subjects', en: 'exam in {n} days', ar: 'امتحان بعد {n} أيام', ctx: 'شارة التنبيه على كارت المادة' },
  { cat: 'School - Subjects', en: 'on track', ar: 'ماشي تمام', ctx: 'شارة حالة المادة عند تحقيق الهدف' },
  { cat: 'School - Subjects', en: 'topics to review', ar: 'مواضيع محتاجة مراجعة', ctx: 'شارة التنبيه للمواضيع المتأخرة' },
  { cat: 'School - Subjects', en: 'new term', ar: 'ترم جديد', ctx: 'شارة البداية عند فتح المادة' },
  { cat: 'School - Subjects', en: 'no grades yet', ar: 'لسه مفيش درجات', ctx: 'حالة عدم تسجيل أي درجة للمادة' },
  { cat: 'School - Subjects', en: 'Weekly study load balance', ar: 'توزيع وقت المذاكرة الأسبوعي', ctx: 'كارت التقرير الأسبوعي أسفل الشاشة' },
  { cat: 'School - Subjects', en: '{subject} accounts for {pct}% of total hours logged this week', ar: '{subject} واخدة {pct}% من إجمالي ساعات مذاكرتك الأسبوع ده', ctx: 'وصف التحليل الأسبوعي' },

  // 2. School - Schedule
  { cat: 'School - Schedule', en: 'Schedule', ar: 'الجدول', ctx: 'التاب الثاني في قسم الدراسة' },
  { cat: 'School - Schedule', en: 'Weekly timetable', ar: 'جدول مواعيد الأسبوع', ctx: 'رأس شاشة الجدول الأسبوعي' },
  { cat: 'School - Schedule', en: 'Add class / session', ar: 'ضيف حصة أو محاضرة', ctx: 'زر إضافة جلسة للجدول' },
  { cat: 'School - Schedule', en: 'Lecture', ar: 'محاضرة', ctx: 'نوع الحصة الأكاديمية' },
  { cat: 'School - Schedule', en: 'Lab / Section', ar: 'سكشن أو معمل', ctx: 'نوع الحصة العملية' },
  { cat: 'School - Schedule', en: 'Tutorial', ar: 'تمرين ومراجعة', ctx: 'نوع جلسة حل التمارين' },
  { cat: 'School - Schedule', en: 'Study block', ar: 'مذاكرة حرة', ctx: 'فترة تركيز محجوزة' },
  { cat: 'School - Schedule', en: 'No classes scheduled for today', ar: 'مفيش مواعيد متسجلة النهاردة', ctx: 'حالة اليوم الفاضي' },

  // 3. School - Plan
  { cat: 'School - Plan', en: 'Plan', ar: 'الخطة والمواعيد', ctx: 'التاب الثالث في قسم الدراسة' },
  { cat: 'School - Plan', en: 'Deadlines & deliverables', ar: 'مواعيد التسليم والامتحانات', ctx: 'رأس قسم الديدلاينز' },
  { cat: 'School - Plan', en: 'Add deadline', ar: 'ضيف ميعاد تسليم', ctx: 'زر إضافة امتحان أو مشروع' },
  { cat: 'School - Plan', en: 'Urgent (next 48h)', ar: 'عاجل (خلال 48 ساعة)', ctx: 'مجموعة المواعيد الطارئة' },
  { cat: 'School - Plan', en: 'This week', ar: 'الأسبوع ده', ctx: 'مجموعة مواعيد الأسبوع' },
  { cat: 'School - Plan', en: 'Later this month', ar: 'باقي الشهر', ctx: 'مجموعة المواعيد القادمة' },
  { cat: 'School - Plan', en: 'Weekly study target', ar: 'هدف ساعات المذاكرة الأسبوعي', ctx: 'كارت ضبط الساعات الأسبوعية' },
  { cat: 'School - Plan', en: 'Target: {hours} hours / week', ar: 'الهدف: {hours} ساعة / أسبوع', ctx: 'عرض الهدف المحدد' },

  // 4. School - Practice
  { cat: 'School - Practice', en: 'Practice', ar: 'تدريب', ctx: 'التاب الرابع في قسم الدراسة' },
  { cat: 'School - Practice', en: 'Mistakes', ar: 'غلطات محتاجة تصحيح', ctx: 'التاب الفرعي الأول في التدريب' },
  { cat: 'School - Practice', en: 'Topics', ar: 'مواضيع المنهج', ctx: 'التاب الفرعي الثاني في التدريب' },
  { cat: 'School - Practice', en: 'Redo mistake', ar: 'حل الغلطة تاني', ctx: 'زر فتح مودال إعادة حل المسألة' },
  { cat: 'School - Practice', en: 'Mistake queue', ar: 'طابور الغلطات', ctx: 'قائمة المسائل المطلوب مراجعتها' },
  { cat: 'School - Practice', en: 'Consecutive correct: {n}', ar: 'حلتها صح {n} مرات ورا بعض', ctx: 'عداد التمكن من المسألة' },
  { cat: 'School - Practice', en: 'Spaced review rate', ar: 'تقييم الاستيعاب', ctx: 'خيارات التقييم 1 إلى 5' },
  { cat: 'School - Practice', en: 'Bulk add topics', ar: 'إضافة مواضيع جملة', ctx: 'زر إدخال مواضيع متعددة' },

  // 5. School - Grades
  { cat: 'School - Grades', en: 'Grades', ar: 'الدرجات', ctx: 'التاب الخامس في قسم الدراسة' },
  { cat: 'School - Grades', en: 'Average (unweighted)', ar: 'متوسط الدرجات (مش موزون)', ctx: 'إجباري بالاسم لحساب المتوسط بدون تحوير' },
  { cat: 'School - Grades', en: 'across {n} recorded items', ar: 'من واقع {n} تقييمات متسجلة', ctx: 'وصف عدد عناصر حساب المتوسط' },
  { cat: 'School - Grades', en: 'Target', ar: 'الهدف', ctx: 'الهدف المستهدف للترم' },
  { cat: 'School - Grades', en: 'semester objective', ar: 'هدف الترم', ctx: 'المؤشر المستهدف' },
  { cat: 'School - Grades', en: 'Performance split', ar: 'توزيع الأداء', ctx: 'مقارنة الكويزات بالامتحانات' },
  { cat: 'School - Grades', en: 'Quizzes', ar: 'كويزات', ctx: 'plain words بديل الاختبارات الدورية' },
  { cat: 'School - Grades', en: 'Big exams', ar: 'امتحانات كبيرة', ctx: 'plain words بديل الميدتيرم والفاينال' },
  { cat: 'School - Grades', en: 'Grade progression', ar: 'مسار الدرجات', ctx: 'رسم بياني لتطور الدرجات' },
  { cat: 'School - Grades', en: 'Target line', ar: 'خط الهدف', ctx: 'الخط المنقط في رسم الدرجات' },
  { cat: 'School - Grades', en: 'Log grade', ar: 'سجّل درجة', ctx: 'زر إضافة درجة تقييم جديد' },
  { cat: 'School - Grades', en: 'History', ar: 'السجل', ctx: 'قائمة الدرجات السابقة' },
  { cat: 'School - Grades', en: 'Study stats (from your log)', ar: 'إحصائيات المذاكرة (من تسجيلك)', ctx: 'إجباري مصطلح from your log' },
  { cat: 'School - Grades', en: '12-week study heatmap', ar: 'خريطة نشاط المذاكرة (12 أسبوع)', ctx: 'مصفوفة خلايا المذاكرة اليومية' },
  { cat: 'School - Grades', en: 'Academic insights', ar: 'ملاحظات دراسية', ctx: 'تحليلات ذكية لأوقات التركيز' },

  // 6. Settings - Account
  { cat: 'Settings - Account', en: 'Account', ar: 'حسابك', ctx: 'التاب الأول في الإعدادات' },
  { cat: 'Settings - Account', en: 'Personal profile', ar: 'الملف الشخصي', ctx: 'تفاصيل الحساب' },
  { cat: 'Settings - Account', en: 'Sign out', ar: 'تسجيل الخروج', ctx: 'زر الخروج من الجهاز الحالي' },
  { cat: 'Settings - Account', en: 'Sign out of other devices', ar: 'الخروج من كل الأجهزة التانية', ctx: 'إلغاء كل الجلسات المفتوحة' },
  { cat: 'Settings - Account', en: 'Change password', ar: 'تغيير الباسورد', ctx: 'زر تحديث كلمة المرور' },
  { cat: 'Settings - Account', en: 'Email address', ar: 'الإيميل', ctx: 'عنوان البريد الإلكتروني' },

  // 7. Settings - Modules
  { cat: 'Settings - Modules', en: 'Modules', ar: 'الأقسام', ctx: 'التاب الثاني في الإعدادات' },
  { cat: 'Settings - Modules', en: 'Active tracking modules', ar: 'الأقسام الشغالة في التطبيق', ctx: 'رأس شاشة تشغيل وإيقاف الموديولز' },
  { cat: 'Settings - Modules', en: 'Workouts', ar: 'التمارين والحديد', ctx: 'قسم التمرين في الجسم' },
  { cat: 'Settings - Modules', en: 'Nutrition', ar: 'الأكل والشرب', ctx: 'قسم التغذية في الجسم' },
  { cat: 'Settings - Modules', en: 'Sleep', ar: 'النوم والراحة', ctx: 'قسم النوم في الجسم' },
  { cat: 'Settings - Modules', en: 'Mind', ar: 'الذهن والتركيز', ctx: 'قسم التركيز والعادات' },
  { cat: 'Settings - Modules', en: 'School', ar: 'الدراسة والمذاكرة', ctx: 'قسم المواد والجدول' },
  { cat: 'Settings - Modules', en: 'Weight', ar: 'الوزن', ctx: 'قسم تتبع الوزن' },
  { cat: 'Settings - Modules', en: 'Enable all', ar: 'تفعيل كل الأقسام', ctx: 'زر تشغيل كل الخدمات' },
  { cat: 'Settings - Modules', en: 'Starter setup', ar: 'الضبط المبدئي', ctx: 'زر إعادة تفعيل أقسام البداية' },

  // 8. Settings - Targets
  { cat: 'Settings - Targets', en: 'Targets', ar: 'أهدافك', ctx: 'التاب الثالث في الإعدادات (بديل protocol)' },
  { cat: 'Settings - Targets', en: 'Target body weight', ar: 'الوزن اللي عايز توصله', ctx: 'هدف الميزان' },
  { cat: 'Settings - Targets', en: 'Daily calories', ar: 'سعراتك المستهدفة في اليوم', ctx: 'هدف التغذية' },
  { cat: 'Settings - Targets', en: 'Daily protein (g)', ar: 'جرامات البروتين في اليوم', ctx: 'هدف البروتين' },
  { cat: 'Settings - Targets', en: 'Water target (L)', ar: 'شرب المية في اليوم (لتر)', ctx: 'هدف ترطيب الجسم' },
  { cat: 'Settings - Targets', en: 'Bedtime and wake time', ar: 'ميعاد النوم والصحيان', ctx: 'مواعيد روتين النوم' },
  { cat: 'Settings - Targets', en: 'Daily focus target', ar: 'ساعات التركيز المستهدفة', ctx: 'هدف تايمر المذاكرة' },

  // 9. Settings - Preferences
  { cat: 'Settings - Preferences', en: 'Preferences', ar: 'التفضيلات', ctx: 'التاب الرابع في الإعدادات' },
  { cat: 'Settings - Preferences', en: 'Weight unit', ar: 'وحدة قياس الوزن', ctx: 'كيلوجرام أو رطل' },
  { cat: 'Settings - Preferences', en: 'App language', ar: 'لغة التطبيق', ctx: 'عربي أو إنجليزي' },
  { cat: 'Settings - Preferences', en: 'Timer sound & chimes', ar: 'أصوات التايمر والتنبيهات', ctx: 'تفعيل رنات انتهاء الجلسات' },
  { cat: 'Settings - Preferences', en: 'Vibration', ar: 'الهزاز', ctx: 'اهتزاز الفون عند التنبيه' },

  // 10. Settings - Data and privacy
  { cat: 'Settings - Data & Privacy', en: 'Data and privacy', ar: 'البيانات والخصوصية', ctx: 'التاب الخامس المدمج في الإعدادات' },
  { cat: 'Settings - Data & Privacy', en: 'Data sovereignty', ar: 'بياناتك ملكك لوحدك', ctx: 'كارت الخصوصية والأمان' },
  { cat: 'Settings - Data & Privacy', en: 'Your logs are privately stored and never commercialized', ar: 'تسجيلات تمرينك، نومك، دراستك، وملاحظاتك خاصة بيك ومستحيل نبيعها لأي حد', ctx: 'تأكيد حماية البيانات' },
  { cat: 'Settings - Data & Privacy', en: 'Zero cloud resale', ar: 'مفيش أي بيع أو تجارة ببياناتك', ctx: 'شارة الأمان التام' },
  { cat: 'Settings - Data & Privacy', en: 'Export your data', ar: 'تنزيل نسخة من بياناتك', ctx: 'كارت تصدير الملفات' },
  { cat: 'Settings - Data & Privacy', en: 'Download JSON', ar: 'تحميل ملف JSON', ctx: 'زر التنزيل الكامل' },
  { cat: 'Settings - Data & Privacy', en: 'Download CSV', ar: 'تحميل ملف CSV (إكسل)', ctx: 'زر تنزيل الجداول' },
  { cat: 'Settings - Data & Privacy', en: 'Delete my data', ar: 'مسح سجلاتي فقط', ctx: 'حذف النشاط مع بقاء الحساب' },
  { cat: 'Settings - Data & Privacy', en: 'Removes your logs but keeps your account and settings', ar: 'بيمسح كل السجلات والنشاط اللي فات، بس بيسيب حسابك وإعداداتك زي ما هي', ctx: 'وصف مسح البيانات' },
  { cat: 'Settings - Data & Privacy', en: 'Delete my account', ar: 'حذف حسابي بالكامل نهائياً', ctx: 'زر الحذف النهائي للحساب' },
  { cat: 'Settings - Data & Privacy', en: 'Removes everything permanently', ar: 'بيمسح الحساب وكل البيانات نهائياً ومبيترجعش', ctx: 'تحذير الحذف الكامل' },
  { cat: 'Settings - Data & Privacy', en: 'Type DELETE MY ACCOUNT to confirm', ar: 'اكتب DELETE MY ACCOUNT لتأكيد الحذف', ctx: 'حقل تأكيد الحذف النهائي' },
  { cat: 'Settings - Data & Privacy', en: 'Device storage & offline cache', ar: 'ذاكرة الجهاز والتشغيل بدون نت', ctx: 'قسم الحفاظ على ميزات DeviceTab' },
  { cat: 'Settings - Data & Privacy', en: 'Clear local cache', ar: 'تفريغ الذاكرة المؤقتة', ctx: 'زر مسح كاش المتصفح بأمان' },
  { cat: 'Settings - Data & Privacy', en: 'Install as app (PWA)', ar: 'تثبيت الأبلكيشن على جهازك', ctx: 'زر تثبيت التطبيق' },

  // 11. Auth, Onboarding & Legal
  { cat: 'Auth & Onboarding', en: 'Welcome back', ar: 'أهلاً بيك تاني', ctx: 'عنوان شاشة تسجيل الدخول' },
  { cat: 'Auth & Onboarding', en: 'Continue with Google', ar: 'الدخول بحساب Google', ctx: 'زر الدخول بجوجل' },
  { cat: 'Auth & Onboarding', en: 'Continue with Email', ar: 'الدخول بالإيميل', ctx: 'تاب الدخول بالبريد' },
  { cat: 'Auth & Onboarding', en: 'Forgot password?', ar: 'نسيت كلمة السر؟', ctx: 'رابط استعادة الباسورد' },
  { cat: 'Auth & Onboarding', en: 'Create your account', ar: 'افتح حسابك في لايف', ctx: 'شاشة التسجيل الجديد' },
  { cat: 'Auth & Onboarding', en: 'Reset your password', ar: 'تغيير كلمة السر', ctx: 'شاشة استعادة كلمة السر' },
  { cat: 'Auth & Onboarding', en: 'Choose what to track', ar: 'اختار اللي عايز تتابعه في يومك', ctx: 'مودال بداية الاستخدام (Onboarding)' },
  { cat: 'Auth & Onboarding', en: 'You can change this anytime in Settings', ar: 'تقدر تغير وتشغل أو تقفل أي قسم في أي وقت من الإعدادات', ctx: 'إشعار المرونة في الأونبوردنج' },
  { cat: 'Auth & Onboarding', en: 'Privacy policy', ar: 'سياسة الخصوصية', ctx: 'رابط صفحة الخصوصية' },
  { cat: 'Auth & Onboarding', en: 'Terms of service', ar: 'شروط الاستخدام', ctx: 'رابط صفحة الشروط' }
];

let md = `# قاموس نصوص المرحلة الثالثة (Stage C Strings - Egyptian Colloquial Arabic)\n\n`;
md += `ملف المراجعة الخاص بنصوص اللهجة المصرية العامية لشاشات الدراسة (**School**)، الإعدادات (**Settings**)، تسجيل الدخول والبداية (**Login & Onboarding**)، والصفحات القانونية (**Privacy & Terms**).\n\n`;
md += `### قواعد وضوابط الصياغة:\n`;
md += `1. **لغة عامية مصرية طبيعية**: ألفاظ مباشرة وواضحة يفهمها الطلاب والشباب في مصر بدون فذلكة لغوية.\n`;
md += `2. **الالتزام بالقواعد الإلزامية الصارمة**:\n`;
md += `   - **ممنوع منعاً باتاً أي استخدام لكلمة GPA** في أي مكان بالبرنامج.\n`;
md += `   - الإبقاء على مصطلح **"Average (unweighted)"** وترجمته بدقة: **"متوسط الدرجات (مش موزون)"**.\n`;
md += `   - استخدام **ألفاظ مبسطة (Plain words)** للتقييمات: **"كويزات" (Quizzes)**، و **"امتحانات كبيرة" (Big exams)**.\n`;
md += `   - الإبقاء على مصطلح **"from your log"** في الإحصائيات وترجمته: **"من تسجيلك"**.\n`;
md += `   - الإبقاء على مصطلح **"estimated"** وترجمته: **"تقديري"** حيثما وجد.\n\n`;
md += `---\n\n`;

md += `| القسم / الشاشة | English Identifier / String | المصرية العامية (Review Target) | السياق والاستخدام |\n`;
md += `|---|---|---|---|\n`;

for (const s of stringsTable) {
  md += `| **${s.cat}** | \`${s.en}\` | **${s.ar}** | ${s.ctx} |\n`;
}

md += `\n---\n\n`;
md += `**جاهز للمراجعة**: تم فحص كافة النصوص وتوليدها بسكريبت موحد مطابق للمتطلبات الإلزامية للمرحلة الثالثة.\n`;

fs.writeFileSync('docs/STAGE_C_ARABIC_STRINGS.md', md, 'utf8');
console.log('Successfully written docs/STAGE_C_ARABIC_STRINGS.md');
