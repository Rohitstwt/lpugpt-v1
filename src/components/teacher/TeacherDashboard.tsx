"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Course = {
  id: string;
  code: string;
  name: string;
  location: string;
  building: string | null;
  room: string | null;
  schedule: string;
};

type Assignment = {
  id: string;
  courseCode: string;
  title: string;
  dueDate: string;
  status: string;
  user?: { name: string; email: string };
};

type Material = {
  id: string;
  title: string;
  fileName: string;
  createdAt: string;
  course?: { code: string };
};

type QuestionPaper = {
  id: string;
  title: string;
  totalMarks: number;
  difficulty: string;
  questions: string;
  createdAt: string;
  course?: { code: string };
};

type MakeupClass = {
  id: string;
  topic: string;
  date: string;
  timeSlot: string;
  location: string;
  reason: string | null;
  course?: { code: string };
};

export default function TeacherDashboard({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"classes" | "assignments" | "books" | "makeup">("classes");
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [papers, setPapers] = useState<QuestionPaper[]>([]);
  const [makeups, setMakeups] = useState<MakeupClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState("");

  // Form states
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [newSchedule, setNewSchedule] = useState("");
  const [locationNote, setLocationNote] = useState("");

  // Assignment form
  const [assignCourse, setAssignCourse] = useState("");
  const [assignTitle, setAssignTitle] = useState("");
  const [assignDueDate, setAssignDueDate] = useState("");

  // Book form
  const [bookTitle, setBookTitle] = useState("");
  const [bookFileName, setBookFileName] = useState("");
  const [bookText, setBookText] = useState("");

  // Paper form
  const [paperTitle, setPaperTitle] = useState("");
  const [paperMarks, setPaperMarks] = useState(50);
  const [paperDifficulty, setPaperDifficulty] = useState("Medium");
  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const [activePaperView, setActivePaperView] = useState<QuestionPaper | null>(null);

  // Makeup form
  const [makeupTopic, setMakeupTopic] = useState("");
  const [makeupDate, setMakeupDate] = useState("");
  const [makeupTime, setMakeupTime] = useState("");
  const [makeupLocation, setMakeupLocation] = useState("");
  const [makeupReason, setMakeupReason] = useState("");

  useEffect(() => {
    fetchTeacherData();
  }, []);

  async function fetchTeacherData() {
    setLoading(true);
    try {
      const [cRes, aRes, mRes, pRes, mkRes] = await Promise.all([
        fetch("/api/teacher/classes"),
        fetch("/api/teacher/assignments"),
        fetch("/api/teacher/books"),
        fetch("/api/teacher/generate-paper"),
        fetch("/api/teacher/makeup-classes"),
      ]);

      const cData = await cRes.json();
      const aData = await aRes.json();
      const mData = await mRes.json();
      const pData = await pRes.json();
      const mkData = await mkRes.json();

      if (cData.courses) {
        setCourses(cData.courses);
        if (cData.courses[0]) {
          setSelectedCourseId(cData.courses[0].id);
          setAssignCourse(cData.courses[0].code);
          setNewLocation(cData.courses[0].location);
          setNewSchedule(cData.courses[0].schedule);
        }
      }
      if (aData.assignments) setAssignments(aData.assignments);
      if (mData.materials) setMaterials(mData.materials);
      if (pData.papers) setPapers(pData.papers);
      if (mkData.makeupClasses) setMakeups(mkData.makeupClasses);
    } catch {
      setStatusMsg("Failed to load teacher data.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateClass(e: React.FormEvent) {
    e.preventDefault();
    setStatusMsg("Broadcasting class update...");
    try {
      const res = await fetch("/api/teacher/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: selectedCourseId,
          location: newLocation,
          schedule: newSchedule,
          note: locationNote,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg("✅ Class venue & schedule updated! Broadcasted live to all students.");
        fetchTeacherData();
      } else {
        setStatusMsg(`❌ Error: ${data.error}`);
      }
    } catch {
      setStatusMsg("❌ Failed to update class.");
    }
  }

  async function handleCreateAssignment(e: React.FormEvent) {
    e.preventDefault();
    setStatusMsg("Creating assignment...");
    try {
      const res = await fetch("/api/teacher/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseCode: assignCourse,
          title: assignTitle,
          dueDate: assignDueDate,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg("✅ Assignment published & synced to student dashboards!");
        setAssignTitle("");
        setAssignDueDate("");
        fetchTeacherData();
      } else {
        setStatusMsg(`❌ Error: ${data.error}`);
      }
    } catch {
      setStatusMsg("❌ Failed to create assignment.");
    }
  }

  async function handleUploadBook(e: React.FormEvent) {
    e.preventDefault();
    setStatusMsg("Uploading course reference book...");
    try {
      const res = await fetch("/api/teacher/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: selectedCourseId,
          title: bookTitle,
          fileName: bookFileName || `${bookTitle.toLowerCase().replace(/\s+/g, "_")}.txt`,
          textContent: bookText,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg("✅ Course material uploaded successfully!");
        setBookTitle("");
        setBookFileName("");
        setBookText("");
        fetchTeacherData();
      } else {
        setStatusMsg(`❌ Error: ${data.error}`);
      }
    } catch {
      setStatusMsg("❌ Upload failed.");
    }
  }

  async function handleGeneratePaper(e: React.FormEvent) {
    e.preventDefault();
    setStatusMsg("⚡ AI is generating question paper with marking scheme...");
    try {
      const res = await fetch("/api/teacher/generate-paper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: selectedCourseId,
          title: paperTitle,
          totalMarks: Number(paperMarks),
          difficulty: paperDifficulty,
          materialIds: selectedMaterialId ? [selectedMaterialId] : [],
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg("🎉 Question paper generated & saved!");
        setPaperTitle("");
        fetchTeacherData();
        setActivePaperView(data.paper);
      } else {
        setStatusMsg(`❌ Error: ${data.error}`);
      }
    } catch {
      setStatusMsg("❌ Question paper generation failed.");
    }
  }

  async function handleScheduleMakeup(e: React.FormEvent) {
    e.preventDefault();
    setStatusMsg("Scheduling makeup class...");
    try {
      const res = await fetch("/api/teacher/makeup-classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: selectedCourseId,
          topic: makeupTopic,
          date: makeupDate,
          timeSlot: makeupTime,
          location: makeupLocation,
          reason: makeupReason,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMsg("✅ Makeup class scheduled! Real-time alerts sent to enrolled students.");
        setMakeupTopic("");
        setMakeupDate("");
        setMakeupTime("");
        setMakeupLocation("");
        setMakeupReason("");
        fetchTeacherData();
      } else {
        setStatusMsg(`❌ Error: ${data.error}`);
      }
    } catch {
      setStatusMsg("❌ Failed to schedule makeup class.");
    }
  }

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-bg shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange/10 font-bold text-orange">
              🎓
            </div>
            <div>
              <h2 className="text-lg font-bold text-text">Teacher Operations Console</h2>
              <p className="text-xs text-text-muted">Manage classes, assignments, AI exam papers, and makeup sessions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-text-muted hover:bg-bg hover:text-text"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border bg-surface/50 px-6">
          <button
            onClick={() => setActiveTab("classes")}
            className={`border-b-2 px-4 py-3 text-sm font-medium transition ${
              activeTab === "classes"
                ? "border-orange text-orange"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            🏫 Class & Venue Changes
          </button>
          <button
            onClick={() => setActiveTab("assignments")}
            className={`border-b-2 px-4 py-3 text-sm font-medium transition ${
              activeTab === "assignments"
                ? "border-orange text-orange"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            📝 Assignments ({assignments.length})
          </button>
          <button
            onClick={() => setActiveTab("books")}
            className={`border-b-2 px-4 py-3 text-sm font-medium transition ${
              activeTab === "books"
                ? "border-orange text-orange"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            📚 Books & AI Paper Generator
          </button>
          <button
            onClick={() => setActiveTab("makeup")}
            className={`border-b-2 px-4 py-3 text-sm font-medium transition ${
              activeTab === "makeup"
                ? "border-orange text-orange"
                : "border-transparent text-text-muted hover:text-text"
            }`}
          >
            ⏰ Makeup Classes
          </button>
        </div>

        {/* Notification Status Banner */}
        {statusMsg ? (
          <div className="bg-orange-soft px-6 py-2 text-xs font-medium text-orange">
            {statusMsg}
          </div>
        ) : null}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex h-40 items-center justify-center text-sm text-text-muted">
              Loading teacher courses & ERP records...
            </div>
          ) : (
            <>
              {/* TAB 1: CLASS & VENUE CHANGES */}
              {activeTab === "classes" && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="rounded-xl border border-border bg-surface p-5">
                    <h3 className="mb-4 text-base font-semibold text-text">Real-time Class Relocation</h3>
                    <form onSubmit={handleUpdateClass} className="space-y-4">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-text-muted">Select Course</label>
                        <select
                          value={selectedCourseId}
                          onChange={(e) => {
                            setSelectedCourseId(e.target.value);
                            const c = courses.find((x) => x.id === e.target.value);
                            if (c) {
                              setNewLocation(c.location);
                              setNewSchedule(c.schedule);
                            }
                          }}
                          className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text outline-none focus:border-orange"
                        >
                          {courses.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.code} — {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-text-muted">New Class Location / Room</label>
                        <input
                          required
                          value={newLocation}
                          onChange={(e) => setNewLocation(e.target.value)}
                          placeholder="e.g. Block 34-102"
                          className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text outline-none focus:border-orange"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-text-muted">Schedule / Time Slot</label>
                        <input
                          required
                          value={newSchedule}
                          onChange={(e) => setNewSchedule(e.target.value)}
                          placeholder="e.g. Mon, Wed 10:00 - 11:30 AM"
                          className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text outline-none focus:border-orange"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-text-muted">Note for Students (Optional)</label>
                        <input
                          value={locationNote}
                          onChange={(e) => setLocationNote(e.target.value)}
                          placeholder="e.g. Lab work moved due to hardware maintenance"
                          className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text outline-none focus:border-orange"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full rounded-xl bg-orange py-3 text-sm font-semibold text-bg transition hover:bg-orange-dim"
                      >
                        ⚡ Broadcast Location Update Live
                      </button>
                    </form>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-base font-semibold text-text">Your Taught Courses</h3>
                    <div className="space-y-3">
                      {courses.map((c) => (
                        <div key={c.id} className="rounded-xl border border-border bg-surface p-4">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-orange">{c.code}</span>
                            <span className="rounded-full bg-orange-soft px-2.5 py-0.5 text-xs text-orange">
                              Active
                            </span>
                          </div>
                          <h4 className="mt-1 text-sm font-semibold text-text">{c.name}</h4>
                          <p className="mt-2 text-xs text-text-muted">📍 Current Venue: <strong className="text-text">{c.location}</strong></p>
                          <p className="text-xs text-text-muted">⏰ Schedule: <strong className="text-text">{c.schedule}</strong></p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ASSIGNMENT UPDATES */}
              {activeTab === "assignments" && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="rounded-xl border border-border bg-surface p-5">
                    <h3 className="mb-4 text-base font-semibold text-text">Create & Post Assignment</h3>
                    <form onSubmit={handleCreateAssignment} className="space-y-4">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-text-muted">Target Course</label>
                        <select
                          value={assignCourse}
                          onChange={(e) => setAssignCourse(e.target.value)}
                          className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text outline-none focus:border-orange"
                        >
                          {courses.map((c) => (
                            <option key={c.id} value={c.code}>
                              {c.code} — {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-text-muted">Assignment Title</label>
                        <input
                          required
                          value={assignTitle}
                          onChange={(e) => setAssignTitle(e.target.value)}
                          placeholder="e.g. Lab Report 3: Binary Search Tree Optimization"
                          className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text outline-none focus:border-orange"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-text-muted">Due Date & Time</label>
                        <input
                          type="datetime-local"
                          required
                          value={assignDueDate}
                          onChange={(e) => setAssignDueDate(e.target.value)}
                          className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text outline-none focus:border-orange"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full rounded-xl bg-orange py-3 text-sm font-semibold text-bg transition hover:bg-orange-dim"
                      >
                        📤 Publish Assignment
                      </button>
                    </form>
                  </div>

                  <div>
                    <h3 className="mb-4 text-base font-semibold text-text">Recent Active Assignments</h3>
                    <div className="max-h-[380px] space-y-3 overflow-y-auto pr-1">
                      {assignments.length === 0 ? (
                        <p className="text-xs text-text-muted">No assignments created yet.</p>
                      ) : (
                        assignments.map((a) => (
                          <div key={a.id} className="rounded-xl border border-border bg-surface p-4">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-orange">{a.courseCode}</span>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] ${a.status === 'SUBMITTED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                {a.status}
                              </span>
                            </div>
                            <h4 className="mt-1 text-sm font-semibold text-text">{a.title}</h4>
                            <p className="mt-1 text-xs text-text-muted">Due: {new Date(a.dueDate).toLocaleString("en-IN")}</p>
                            {a.user ? <p className="text-xs text-text-muted">Assigned to: {a.user.name}</p> : null}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: BOOKS & AI QUESTION PAPER GENERATOR */}
              {activeTab === "books" && (
                <div className="space-y-6">
                  {/* Upload Book Section */}
                  <div className="rounded-xl border border-border bg-surface p-5">
                    <h3 className="mb-4 text-base font-semibold text-text">1. Upload Book / Reference Material</h3>
                    <form onSubmit={handleUploadBook} className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-text-muted">Course</label>
                          <select
                            value={selectedCourseId}
                            onChange={(e) => setSelectedCourseId(e.target.value)}
                            className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text outline-none focus:border-orange"
                          >
                            {courses.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.code} — {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-text-muted">Book / Material Title</label>
                          <input
                            required
                            value={bookTitle}
                            onChange={(e) => setBookTitle(e.target.value)}
                            placeholder="e.g. Data Structures Reference Manual (Ch 1-4)"
                            className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text outline-none focus:border-orange"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-text-muted">Key Chapter / Syllabus Text Content</label>
                        <textarea
                          rows={3}
                          value={bookText}
                          onChange={(e) => setBookText(e.target.value)}
                          placeholder="Paste reference text, chapter outlines, or key formulas for AI processing..."
                          className="w-full rounded-xl border border-border bg-bg p-3 text-sm text-text outline-none focus:border-orange"
                        />
                      </div>
                      <button
                        type="submit"
                        className="rounded-xl bg-orange px-6 py-2.5 text-sm font-semibold text-bg hover:bg-orange-dim"
                      >
                        📚 Upload Course Material
                      </button>
                    </form>
                  </div>

                  {/* AI Paper Generator Section */}
                  <div className="rounded-xl border border-border bg-surface p-5">
                    <h3 className="mb-4 text-base font-semibold text-text">2. Generate AI Question Paper</h3>
                    <form onSubmit={handleGeneratePaper} className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-text-muted">Exam Title</label>
                          <input
                            required
                            value={paperTitle}
                            onChange={(e) => setPaperTitle(e.target.value)}
                            placeholder="e.g. Mid-Term Exam Spring 2026"
                            className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text outline-none focus:border-orange"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-text-muted">Total Marks</label>
                          <input
                            type="number"
                            value={paperMarks}
                            onChange={(e) => setPaperMarks(Number(e.target.value))}
                            className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text outline-none focus:border-orange"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-text-muted">Difficulty Level</label>
                          <select
                            value={paperDifficulty}
                            onChange={(e) => setPaperDifficulty(e.target.value)}
                            className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text outline-none focus:border-orange"
                          >
                            <option value="Easy">Easy</option>
                            <option value="Medium">Medium</option>
                            <option value="Hard">Hard / Advanced</option>
                          </select>
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="w-full rounded-xl bg-orange py-3 text-sm font-semibold text-bg transition hover:bg-orange-dim"
                      >
                        ⚡ Generate Exam Question Paper & Solutions with AI
                      </button>
                    </form>
                  </div>

                  {/* Generated Question Papers Preview Modal/Section */}
                  {activePaperView ? (
                    <div className="rounded-xl border border-orange/40 bg-surface p-5">
                      <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
                        <div>
                          <h4 className="font-bold text-orange">{activePaperView.title}</h4>
                          <p className="text-xs text-text-muted">Total Marks: {activePaperView.totalMarks} · Difficulty: {activePaperView.difficulty}</p>
                        </div>
                        <button
                          onClick={() => setActivePaperView(null)}
                          className="text-xs text-text-muted hover:text-text"
                        >
                          Close Preview
                        </button>
                      </div>
                      <div className="max-h-[300px] overflow-y-auto space-y-4 text-xs font-mono">
                        <pre className="whitespace-pre-wrap text-text leading-relaxed">
                          {activePaperView.questions}
                        </pre>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              {/* TAB 4: MAKEUP CLASSES */}
              {activeTab === "makeup" && (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <div className="rounded-xl border border-border bg-surface p-5">
                    <h3 className="mb-4 text-base font-semibold text-text">Schedule Compensatory / Makeup Class</h3>
                    <form onSubmit={handleScheduleMakeup} className="space-y-4">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-text-muted">Course</label>
                        <select
                          value={selectedCourseId}
                          onChange={(e) => setSelectedCourseId(e.target.value)}
                          className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text outline-none focus:border-orange"
                        >
                          {courses.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.code} — {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-text-muted">Lecture Topic</label>
                        <input
                          required
                          value={makeupTopic}
                          onChange={(e) => setMakeupTopic(e.target.value)}
                          placeholder="e.g. Graph Algorithms & Shortest Path Review"
                          className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text outline-none focus:border-orange"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-text-muted">Date</label>
                          <input
                            type="date"
                            required
                            value={makeupDate}
                            onChange={(e) => setMakeupDate(e.target.value)}
                            className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text outline-none focus:border-orange"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-text-muted">Time Slot</label>
                          <input
                            required
                            value={makeupTime}
                            onChange={(e) => setMakeupTime(e.target.value)}
                            placeholder="e.g. 04:00 PM - 05:30 PM"
                            className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text outline-none focus:border-orange"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium text-text-muted">Location / Room</label>
                        <input
                          required
                          value={makeupLocation}
                          onChange={(e) => setMakeupLocation(e.target.value)}
                          placeholder="e.g. Block 38- auditorium"
                          className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text outline-none focus:border-orange"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full rounded-xl bg-orange py-3 text-sm font-semibold text-bg transition hover:bg-orange-dim"
                      >
                        ⏰ Schedule & Notify Students
                      </button>
                    </form>
                  </div>

                  <div>
                    <h3 className="mb-4 text-base font-semibold text-text">Scheduled Extra Sessions</h3>
                    <div className="space-y-3">
                      {makeups.length === 0 ? (
                        <p className="text-xs text-text-muted">No makeup classes scheduled.</p>
                      ) : (
                        makeups.map((m) => (
                          <div key={m.id} className="rounded-xl border border-border bg-surface p-4">
                            <span className="text-xs font-bold text-orange">{m.course?.code}</span>
                            <h4 className="mt-1 text-sm font-semibold text-text">{m.topic}</h4>
                            <p className="mt-2 text-xs text-text-muted">📅 Date: <strong className="text-text">{m.date}</strong> at <strong className="text-text">{m.timeSlot}</strong></p>
                            <p className="text-xs text-text-muted">📍 Venue: <strong className="text-text">{m.location}</strong></p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
