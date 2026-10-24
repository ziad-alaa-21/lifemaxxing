"use client";

import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Plus,
  CheckCircle2,
  Clock,
  Sparkles,
  X,
  Loader2,
  Bookmark,
  ChevronRight,
} from "lucide-react";
import {
  ReadingBook,
  ReadingLog,
  calculateBookProgress,
  validateReadingLog,
} from "@/lib/reading";
import { supabase } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n/I18nContext";

interface ReadingCardProps {
  selectedDate: string;
  onReadingUpdated?: () => void;
}

export function ReadingCard({ selectedDate, onReadingUpdated }: ReadingCardProps) {
  const { locale } = useI18n();
  const [books, setBooks] = useState<ReadingBook[]>([]);
  const [activeBook, setActiveBook] = useState<ReadingBook | null>(null);
  const [todayLogs, setTodayLogs] = useState<ReadingLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals
  const [isLogModalOpen, setIsLogModalOpen] = useState<boolean>(false);
  const [isNewBookModalOpen, setIsNewBookModalOpen] = useState<boolean>(false);

  // Form states
  const [logPages, setLogPages] = useState<string>("");
  const [logMinutes, setLogMinutes] = useState<string>("");
  const [logNotes, setLogNotes] = useState<string>("");
  const [submittingLog, setSubmittingLog] = useState<boolean>(false);
  const [logError, setLogError] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState<string>("");
  const [newAuthor, setNewAuthor] = useState<string>("");
  const [newTotalPages, setNewTotalPages] = useState<string>("");
  const [newStartPage, setNewStartPage] = useState<string>("0");
  const [submittingBook, setSubmittingBook] = useState<boolean>(false);

  // Load books & today's logs
  useEffect(() => {
    async function loadData() {
      if (!selectedDate) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Fetch user books
        const { data: booksData } = await supabase
          .from("reading_books")
          .select("*")
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .order("created_at", { ascending: false });

        const userBooks = (booksData || []) as ReadingBook[];
        setBooks(userBooks);

        // Pick active reading book
        const reading = userBooks.find((b) => b.status === "reading") || userBooks[0] || null;
        setActiveBook(reading);

        // 2. Fetch logs for selectedDate
        const { data: logsData } = await supabase
          .from("reading_logs")
          .select("*")
          .eq("user_id", user.id)
          .eq("logged_date", selectedDate)
          .is("deleted_at", null)
          .order("created_at", { ascending: false });

        setTodayLogs((logsData || []) as ReadingLog[]);
      } catch (err) {
        console.warn("Reading data load error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [selectedDate]);

  // Submit reading session log
  const handleSaveLog = async () => {
    setLogError(null);
    const pages = Number(logPages);
    const mins = logMinutes.trim() ? Number(logMinutes) : null;

    const validation = validateReadingLog(pages, mins);
    if (!validation.valid) {
      setLogError(validation.error || "Invalid input");
      return;
    }

    setSubmittingLog(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const payload = {
        user_id: user.id,
        book_id: activeBook?.id || null,
        logged_date: selectedDate,
        pages_read: pages,
        duration_minutes: mins,
        notes: logNotes.trim() || null,
      };

      const { data, error } = await supabase
        .from("reading_logs")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      // Update active book current_page
      if (activeBook) {
        const nextCurrent = activeBook.current_page + pages;
        const nextStatus =
          activeBook.total_pages && nextCurrent >= activeBook.total_pages
            ? "completed"
            : activeBook.status;

        await supabase
          .from("reading_books")
          .update({ current_page: nextCurrent, status: nextStatus })
          .eq("id", activeBook.id);

        setActiveBook({ ...activeBook, current_page: nextCurrent, status: nextStatus });
      }

      setTodayLogs([data as ReadingLog, ...todayLogs]);
      setIsLogModalOpen(false);
      setLogPages("");
      setLogMinutes("");
      setLogNotes("");
      if (onReadingUpdated) onReadingUpdated();
    } catch (err: any) {
      setLogError(err.message || "Failed to save reading session");
    } finally {
      setSubmittingLog(false);
    }
  };

  // Create new book
  const handleCreateBook = async () => {
    if (!newTitle.trim()) return;
    setSubmittingBook(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const payload = {
        user_id: user.id,
        title: newTitle.trim(),
        author: newAuthor.trim() || null,
        total_pages: newTotalPages.trim() ? Number(newTotalPages) : null,
        current_page: newStartPage.trim() ? Number(newStartPage) : 0,
        status: "reading",
      };

      const { data, error } = await supabase
        .from("reading_books")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      const created = data as ReadingBook;
      setBooks([created, ...books]);
      setActiveBook(created);
      setIsNewBookModalOpen(false);
      setNewTitle("");
      setNewAuthor("");
      setNewTotalPages("");
      setNewStartPage("0");
      if (onReadingUpdated) onReadingUpdated();
    } catch (err) {
      console.warn("Failed to create book:", err);
    } finally {
      setSubmittingBook(false);
    }
  };

  const totalPagesToday = todayLogs.reduce((acc, l) => acc + l.pages_read, 0);
  const totalMinutesToday = todayLogs.reduce((acc, l) => acc + (l.duration_minutes || 0), 0);
  const progress = activeBook ? calculateBookProgress(activeBook) : null;

  return (
    <div className="p-5 rounded-3xl bg-surface-container border border-border-subtle space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-tertiary-purple/10 border border-tertiary-purple/30 flex items-center justify-center text-tertiary-purple">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold font-mono text-on-surface">
              {locale === "ar" ? "القراءة والاطلاع" : "Mindful Reading"}
            </h3>
            <p className="text-[10px] font-mono text-on-surface-variant">
              {locale === "ar" ? "معدل الصفحات وتغذية العقل" : "Daily pages & focus velocity"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {totalPagesToday > 0 ? (
            <span className="text-xs font-mono font-bold text-tertiary-purple px-2.5 py-1 rounded-full bg-tertiary-purple/10 border border-tertiary-purple/20">
              {locale === "ar" ? `${totalPagesToday} صفحة النهاردة` : `${totalPagesToday} pages today`}
            </span>
          ) : (
            <span className="text-xs font-mono text-text-muted px-2.5 py-1 rounded-full bg-surface-container-low border border-border-subtle">
              {locale === "ar" ? "مفيش قراءة النهاردة" : "No reading today"}
            </span>
          )}
          <button
            onClick={() => setIsLogModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-tertiary-purple text-on-primary font-mono font-bold text-xs uppercase tracking-wider hover:brightness-110 cursor-pointer transition-all"
          >
            {locale === "ar" ? "سجل قراءة" : "Log Session"}
          </button>
        </div>
      </div>

      {/* Active Book Card */}
      {loading ? (
        <div className="py-6 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
        </div>
      ) : activeBook ? (
        <div className="p-4 rounded-2xl bg-surface-container-low border border-border-subtle space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold font-mono text-on-surface truncate">
                {activeBook.title}
              </h4>
              <p className="text-[11px] font-mono text-on-surface-variant">
                {activeBook.author
                  ? locale === "ar" ? `للكاتب: ${activeBook.author}` : `by ${activeBook.author}`
                  : locale === "ar" ? "كتاب قيد القراءة" : "Book in progress"}
              </p>
            </div>
            <button
              onClick={() => setIsNewBookModalOpen(true)}
              className="text-[10px] font-mono text-text-muted hover:text-on-surface flex items-center gap-1 cursor-pointer"
            >
              <span>{locale === "ar" ? "تغيير / إضافة" : "Switch / Add"}</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* Progress Bar */}
          {progress && (
            <div className="space-y-1.5 font-mono">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">
                  {locale === "ar"
                    ? `صفحة ${activeBook.current_page} من ${activeBook.total_pages}`
                    : progress.displayText}
                </span>
                <span className="text-tertiary-purple font-bold">
                  {progress.percentComplete}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden">
                <div
                  className="h-full bg-tertiary-purple rounded-full transition-all duration-500"
                  style={{ width: `${progress.percentComplete}%` }}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-6 rounded-2xl bg-surface-container-low border border-dashed border-border-subtle text-center space-y-2">
          <p className="text-xs font-mono text-text-muted">
            {locale === "ar" ? "مفيش كتاب حالي في قائمة القراءة." : "No active book in reading list."}
          </p>
          <button
            onClick={() => setIsNewBookModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-tertiary-purple/15 border border-tertiary-purple/30 text-tertiary-purple font-mono text-xs font-bold hover:bg-tertiary-purple/25 cursor-pointer transition-colors"
          >
            {locale === "ar" ? "+ أضف كتابك الأول" : "+ Add Your First Book"}
          </button>
        </div>
      )}

      {/* LOG READING SESSION MODAL */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-surface-dim/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-surface-container rounded-3xl border border-border-subtle shadow-2xl p-6 space-y-5 font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-tertiary-purple" />
                <h3 className="text-sm font-bold text-on-surface">
                  {locale === "ar" ? "تسجيل جلسة قراءة" : "Log Reading Session"}
                </h3>
              </div>
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="p-1 rounded-lg text-text-muted hover:text-on-surface cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {logError && (
              <div className="p-3 rounded-xl bg-[#F87171]/10 border border-[#F87171]/30 text-[#F87171] text-xs">
                {logError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-text-muted uppercase text-[11px] block mb-1 text-start">
                  {locale === "ar" ? "عدد الصفحات المقروءة النهاردة" : "Pages Read Today"}
                </label>
                <input
                  type="number"
                  min={1}
                  max={2000}
                  value={logPages}
                  onChange={(e) => setLogPages(e.target.value)}
                  placeholder={locale === "ar" ? "مثال: 25" : "e.g. 25"}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-lowest border border-border-subtle text-on-surface placeholder:text-text-muted focus:outline-none focus:border-tertiary-purple text-start"
                />
              </div>

              <div>
                <label className="text-text-muted uppercase text-[11px] block mb-1 text-start">
                  {locale === "ar" ? "المدة بالدقائق (اختياري)" : "Duration (Minutes - Optional)"}
                </label>
                <input
                  type="number"
                  min={1}
                  max={1440}
                  value={logMinutes}
                  onChange={(e) => setLogMinutes(e.target.value)}
                  placeholder={locale === "ar" ? "مثال: 35" : "e.g. 35"}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-lowest border border-border-subtle text-on-surface placeholder:text-text-muted focus:outline-none focus:border-tertiary-purple text-start"
                />
              </div>

              <div>
                <label className="text-text-muted uppercase text-[11px] block mb-1 text-start">
                  {locale === "ar" ? "ملاحظة أو أهم فكرة طلعت بيها (اختياري)" : "Key Takeaway / Notes (Optional)"}
                </label>
                <textarea
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  placeholder={locale === "ar" ? "اكتب ملاحظة أو اقتباس عجبك..." : "Notes, quote, or reflection..."}
                  rows={2}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-lowest border border-border-subtle text-on-surface placeholder:text-text-muted focus:outline-none focus:border-tertiary-purple resize-none text-start"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-subtle">
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="px-4 py-2 rounded-xl text-text-muted hover:text-on-surface cursor-pointer"
              >
                {locale === "ar" ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={handleSaveLog}
                disabled={submittingLog || !logPages.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl font-bold bg-tertiary-purple text-on-primary hover:brightness-110 cursor-pointer disabled:opacity-50"
              >
                {submittingLog ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>{locale === "ar" ? "حفظ القراءة" : "Save Reading"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD NEW BOOK MODAL */}
      {isNewBookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-surface-dim/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-surface-container rounded-3xl border border-border-subtle shadow-2xl p-6 space-y-5 font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-tertiary-purple" />
                <h3 className="text-sm font-bold text-on-surface">
                  {locale === "ar" ? "إضافة كتاب لقائمة القراءة" : "Add Book to Reading List"}
                </h3>
              </div>
              <button
                onClick={() => setIsNewBookModalOpen(false)}
                className="p-1 rounded-lg text-text-muted hover:text-on-surface cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-text-muted uppercase text-[11px] block mb-1 text-start">
                  {locale === "ar" ? "اسم الكتاب" : "Book Title"}
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={locale === "ar" ? "مثال: العادات الذرية" : "e.g. Deep Work"}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-lowest border border-border-subtle text-on-surface placeholder:text-text-muted focus:outline-none focus:border-tertiary-purple text-start"
                />
              </div>

              <div>
                <label className="text-text-muted uppercase text-[11px] block mb-1 text-start">
                  {locale === "ar" ? "اسم الكاتب / المؤلف (اختياري)" : "Author (Optional)"}
                </label>
                <input
                  type="text"
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  placeholder={locale === "ar" ? "مثال: جيمس كلير" : "e.g. Cal Newport"}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-lowest border border-border-subtle text-on-surface placeholder:text-text-muted focus:outline-none focus:border-tertiary-purple text-start"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-text-muted uppercase text-[11px] block mb-1 text-start">
                    {locale === "ar" ? "إجمالي الصفحات" : "Total Pages"}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newTotalPages}
                    onChange={(e) => setNewTotalPages(e.target.value)}
                    placeholder={locale === "ar" ? "300" : "e.g. 300"}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-lowest border border-border-subtle text-on-surface placeholder:text-text-muted focus:outline-none focus:border-tertiary-purple text-start"
                  />
                </div>
                <div>
                  <label className="text-text-muted uppercase text-[11px] block mb-1 text-start">
                    {locale === "ar" ? "صفحة البداية" : "Starting Page"}
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newStartPage}
                    onChange={(e) => setNewStartPage(e.target.value)}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-lowest border border-border-subtle text-on-surface placeholder:text-text-muted focus:outline-none focus:border-tertiary-purple text-start"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-subtle">
              <button
                onClick={() => setIsNewBookModalOpen(false)}
                className="px-4 py-2 rounded-xl text-text-muted hover:text-on-surface cursor-pointer"
              >
                {locale === "ar" ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={handleCreateBook}
                disabled={submittingBook || !newTitle.trim()}
                className="flex items-center gap-2 px-5 py-2 rounded-xl font-bold bg-tertiary-purple text-on-primary hover:brightness-110 cursor-pointer disabled:opacity-50"
              >
                {submittingBook ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span>{locale === "ar" ? "إضافة الكتاب" : "Add Book"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
