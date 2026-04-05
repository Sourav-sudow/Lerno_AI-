import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  clearCachedSession,
  fetchFacultyDashboard,
  fetchSession,
  getCachedSession,
  getDefaultRouteForSession,
  type FacultyDashboardData,
} from "../services/appSession";
import {
  listTopicVideoOverrides,
  saveTopicVideoOverride,
  type TopicVideoOverride,
} from "../services/topicVideoOverrides";
import { coursesData } from "../data/coursesData";

const THEME_STORAGE_KEY = "lernoTheme";

function readTheme() {
  return localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : "dark";
}

export default function FacultyDashboardPage() {
  const navigate = useNavigate();
  const initialSession = useMemo(() => getCachedSession(), []);
  const [theme, setTheme] = useState<"dark" | "light">(readTheme());
  const [dashboard, setDashboard] = useState<FacultyDashboardData | null>(null);
  const [overrides, setOverrides] = useState<TopicVideoOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [videoError, setVideoError] = useState("");
  const [videoInfo, setVideoInfo] = useState("");
  const [savingVideo, setSavingVideo] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [videoUrl, setVideoUrl] = useState("");

  const isDarkTheme = theme === "dark";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkTheme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [isDarkTheme, theme]);

  useEffect(() => {
    if (!initialSession?.isAuthenticated || !initialSession.email) {
      navigate("/login", { replace: true });
      return;
    }

    if (!initialSession.isOnboarded) {
      navigate("/onboarding", { replace: true });
      return;
    }

    if (initialSession.role !== "faculty") {
      navigate(getDefaultRouteForSession(initialSession), { replace: true });
      return;
    }

    const loadDashboard = async () => {
      try {
        await fetchSession(initialSession.email);
        const data = await fetchFacultyDashboard(initialSession.email);
        setDashboard(data);
        const overrideList = await listTopicVideoOverrides(initialSession.email);
        setOverrides(overrideList);
      } catch (err) {
        setError((err as Error).message || "Failed to load faculty dashboard.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [initialSession, navigate]);

  const handleLogout = () => {
    clearCachedSession();
    navigate("/login", { replace: true });
  };

  const profile = dashboard?.facultyProfile || initialSession?.profile;

  const allSubjects = useMemo(() => {
    const subjects: Array<{ subjectTitle: string; units: Array<{ title: string; topics: string[] }> }> = [];
    Object.values(coursesData).forEach((course) => {
      Object.values(course.years).forEach((year) => {
        Object.entries(year.subjects).forEach(([subjectKey, rawSubject]) => {
          const subject: any = rawSubject;
          const subjectTitle = subject?.name || subjectKey;
          const units = Array.isArray(subject?.units) ? subject.units : [];
          if (!units.length) return;
          if (subjects.some((item) => item.subjectTitle === subjectTitle)) return;
          subjects.push({ subjectTitle, units });
        });
      });
    });
    return subjects;
  }, []);

  const subjectUnits = useMemo(
    () => allSubjects.find((subject) => subject.subjectTitle === selectedSubject)?.units || [],
    [allSubjects, selectedSubject]
  );

  const unitTopics = useMemo(
    () => subjectUnits.find((unit) => unit.title === selectedUnit)?.topics || [],
    [selectedUnit, subjectUnits]
  );

  const handleSaveTopicVideo = async () => {
    if (!initialSession?.email) return;
    setVideoError("");
    setVideoInfo("");

    if (!selectedSubject || !selectedUnit || !selectedTopic || !videoUrl.trim()) {
      setVideoError("Subject, unit, topic, aur video URL sab required hain.");
      return;
    }

    setSavingVideo(true);
    try {
      await saveTopicVideoOverride({
        facultyEmail: initialSession.email,
        subjectTitle: selectedSubject,
        unitTitle: selectedUnit,
        topicTitle: selectedTopic,
        videoUrl: videoUrl.trim(),
      });
      const overrideList = await listTopicVideoOverrides(initialSession.email);
      setOverrides(overrideList);
      setVideoInfo("Faculty-selected video save ho gaya. Ab students ke liye ye topic isi video se open hoga.");
    } catch (err) {
      setVideoError((err as Error).message || "Failed to save faculty video.");
    } finally {
      setSavingVideo(false);
    }
  };

  return (
    <div
      className={`min-h-screen px-4 py-8 transition-colors duration-300 ${
        isDarkTheme
          ? "bg-black text-white"
          : "bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.96),_rgba(238,243,255,0.96),_rgba(228,236,252,0.98))] text-slate-900"
      }`}
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p
              className={`text-xs uppercase tracking-[0.28em] ${
                isDarkTheme ? "text-white/45" : "text-slate-500"
              }`}
            >
              Faculty Workspace
            </p>
            <h1 className="mt-2 text-3xl font-semibold">Faculty Dashboard</h1>
            <p
              className={`mt-2 text-sm ${
                isDarkTheme ? "text-white/60" : "text-slate-600"
              }`}
            >
              Monitor onboarding, review learner activity, and manage your profile from one place.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                isDarkTheme
                  ? "border-white/10 bg-white/[0.05] text-white/80 hover:bg-white/[0.1]"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {isDarkTheme ? "Light Mode" : "Dark Mode"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/profile")}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                isDarkTheme
                  ? "border-white/10 bg-white/[0.05] text-white/80 hover:bg-white/[0.1]"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              My Profile
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
            >
              Logout
            </button>
          </div>
        </div>

        {loading ? (
          <div
            className={`rounded-[28px] border p-8 ${
              isDarkTheme
                ? "border-white/10 bg-zinc-950/80"
                : "border-slate-300/70 bg-white/88"
            }`}
          >
            Loading faculty dashboard...
          </div>
        ) : error ? (
          <div
            className={`rounded-[28px] border p-8 ${
              isDarkTheme
                ? "border-rose-500/20 bg-rose-500/10 text-rose-200"
                : "border-rose-200 bg-rose-50 text-rose-700"
            }`}
          >
            {error}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-6">
              <section
                className={`rounded-[30px] border p-6 ${
                  isDarkTheme
                    ? "border-white/10 bg-zinc-950/80"
                    : "border-slate-300/70 bg-white/88"
                }`}
              >
                <div className="flex flex-wrap items-center gap-5">
                  <img
                    src={
                      profile?.avatar ||
                      "https://api.dicebear.com/7.x/notionists-neutral/svg?seed=faculty"
                    }
                    alt={profile?.fullName || "Faculty"}
                    className="h-20 w-20 rounded-full border border-white/10 object-cover"
                  />
                  <div>
                    <h2 className="text-2xl font-semibold">
                      {profile?.fullName || "Faculty User"}
                    </h2>
                    <p
                      className={`mt-1 text-sm ${
                        isDarkTheme ? "text-white/60" : "text-slate-600"
                      }`}
                    >
                      {profile?.email}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          isDarkTheme
                            ? "bg-violet-500/15 text-violet-200"
                            : "bg-violet-100 text-violet-700"
                        }`}
                      >
                        {profile?.designation || "Faculty Member"}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          isDarkTheme
                            ? "bg-cyan-500/15 text-cyan-200"
                            : "bg-cyan-100 text-cyan-700"
                        }`}
                      >
                        {profile?.department || "Department not set"}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              <section className="grid gap-4 md:grid-cols-3">
                {[
                  ["Students", dashboard?.stats.studentCount ?? 0],
                  ["Faculty", dashboard?.stats.facultyCount ?? 0],
                  ["New This Week", dashboard?.stats.newUsersThisWeek ?? 0],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className={`rounded-[26px] border p-5 ${
                      isDarkTheme
                        ? "border-white/10 bg-zinc-950/80"
                        : "border-slate-300/70 bg-white/88"
                    }`}
                  >
                    <p
                      className={`text-xs uppercase tracking-[0.22em] ${
                        isDarkTheme ? "text-white/40" : "text-slate-500"
                      }`}
                    >
                      {label}
                    </p>
                    <p className="mt-4 text-3xl font-semibold">{value}</p>
                  </div>
                ))}
              </section>

              <section
                className={`rounded-[30px] border p-6 ${
                  isDarkTheme
                    ? "border-white/10 bg-zinc-950/80"
                    : "border-slate-300/70 bg-white/88"
                }`}
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xl font-semibold">Recent Onboardings</h3>
                  <p className={isDarkTheme ? "text-white/45" : "text-slate-500"}>
                    Latest users in Firestore
                  </p>
                </div>

                <div className="space-y-3">
                  {dashboard?.recentOnboardings?.length ? (
                    dashboard.recentOnboardings.map((user) => (
                      <div
                        key={user.uid}
                        className={`rounded-2xl border px-4 py-4 ${
                          isDarkTheme
                            ? "border-white/10 bg-white/[0.03]"
                            : "border-slate-200 bg-slate-50/85"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-base font-semibold">{user.fullName}</p>
                            <p
                              className={`mt-1 truncate text-sm ${
                                isDarkTheme ? "text-white/55" : "text-slate-600"
                              }`}
                            >
                              {user.email}
                            </p>
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                              user.role === "faculty"
                                ? isDarkTheme
                                  ? "bg-violet-500/15 text-violet-200"
                                  : "bg-violet-100 text-violet-700"
                                : isDarkTheme
                                  ? "bg-emerald-500/15 text-emerald-200"
                                  : "bg-emerald-100 text-emerald-700"
                            }`}
                          >
                            {user.role}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div
                      className={`rounded-2xl border border-dashed px-4 py-5 ${
                        isDarkTheme
                          ? "border-white/10 bg-white/[0.02] text-white/45"
                          : "border-slate-200 bg-slate-50 text-slate-500"
                      }`}
                    >
                      No onboarding records yet.
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <section
                className={`rounded-[30px] border p-6 ${
                  isDarkTheme
                    ? "border-white/10 bg-zinc-950/80"
                    : "border-slate-300/70 bg-white/88"
                }`}
              >
                <h3 className="text-xl font-semibold">Manage Topic Videos</h3>
                <p
                  className={`mt-2 text-sm ${
                    isDarkTheme ? "text-white/55" : "text-slate-600"
                  }`}
                >
                  Mam agar kisi topic ke liye apni pasand ki video set karegi, toh student side par wahi video pehle chalegi. Agar faculty video set nahi karegi, toh existing default video hi play hoga.
                </p>

                <div className="mt-5 grid gap-4">
                  <select
                    value={selectedSubject}
                    onChange={(e) => {
                      setSelectedSubject(e.target.value);
                      setSelectedUnit("");
                      setSelectedTopic("");
                    }}
                    className={`rounded-2xl border px-4 py-3 outline-none ${
                      isDarkTheme
                        ? "border-white/10 bg-white/[0.04] text-white"
                        : "border-slate-300 bg-white text-slate-900"
                    }`}
                  >
                    <option value="">Select subject</option>
                    {allSubjects.map((subject) => (
                      <option key={subject.subjectTitle} value={subject.subjectTitle}>
                        {subject.subjectTitle}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedUnit}
                    onChange={(e) => {
                      setSelectedUnit(e.target.value);
                      setSelectedTopic("");
                    }}
                    className={`rounded-2xl border px-4 py-3 outline-none ${
                      isDarkTheme
                        ? "border-white/10 bg-white/[0.04] text-white"
                        : "border-slate-300 bg-white text-slate-900"
                    }`}
                  >
                    <option value="">Select unit</option>
                    {subjectUnits.map((unit) => (
                      <option key={unit.title} value={unit.title}>
                        {unit.title}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedTopic}
                    onChange={(e) => setSelectedTopic(e.target.value)}
                    className={`rounded-2xl border px-4 py-3 outline-none ${
                      isDarkTheme
                        ? "border-white/10 bg-white/[0.04] text-white"
                        : "border-slate-300 bg-white text-slate-900"
                    }`}
                  >
                    <option value="">Select topic</option>
                    {unitTopics.map((topic) => (
                      <option key={topic} value={topic}>
                        {topic}
                      </option>
                    ))}
                  </select>

                  <input
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="Paste YouTube link or video ID"
                    className={`rounded-2xl border px-4 py-3 outline-none ${
                      isDarkTheme
                        ? "border-white/10 bg-white/[0.04] text-white placeholder:text-white/30"
                        : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400"
                    }`}
                  />

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleSaveTopicVideo}
                      className="rounded-2xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
                    >
                      {savingVideo ? "Saving..." : "Save Topic Video"}
                    </button>
                    <span
                      className={`rounded-2xl border px-4 py-3 text-sm ${
                        isDarkTheme
                          ? "border-white/10 bg-white/[0.03] text-white/60"
                          : "border-slate-300 bg-slate-50 text-slate-600"
                      }`}
                    >
                      No faculty video? Current default video automatically chalega.
                    </span>
                  </div>

                  {videoError ? (
                    <div
                      className={`rounded-2xl border px-4 py-3 text-sm ${
                        isDarkTheme
                          ? "border-rose-500/20 bg-rose-500/10 text-rose-200"
                          : "border-rose-200 bg-rose-50 text-rose-700"
                      }`}
                    >
                      {videoError}
                    </div>
                  ) : null}

                  {videoInfo ? (
                    <div
                      className={`rounded-2xl border px-4 py-3 text-sm ${
                        isDarkTheme
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {videoInfo}
                    </div>
                  ) : null}
                </div>
              </section>

              <section
                className={`rounded-[30px] border p-6 ${
                  isDarkTheme
                    ? "border-white/10 bg-zinc-950/80"
                    : "border-slate-300/70 bg-white/88"
                }`}
              >
                <h3 className="text-xl font-semibold">Saved Video Overrides</h3>
                <div className="mt-5 space-y-3">
                  {(overrides.length
                    ? overrides.slice(0, 5).map(
                        (item) =>
                          `${item.topicTitle} -> faculty-selected video active`
                      )
                    : [
                        "Approve or review newly onboarded users.",
                        "Track student learning activity by unit and topic.",
                        "Assign subjects and topic bundles to faculty members.",
                        "Export onboarding and learning reports.",
                      ]).map((item) => (
                    <div
                      key={item}
                      className={`rounded-2xl border px-4 py-4 ${
                        isDarkTheme
                          ? "border-white/10 bg-white/[0.03] text-white/75"
                          : "border-slate-200 bg-slate-50/85 text-slate-700"
                      }`}
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
