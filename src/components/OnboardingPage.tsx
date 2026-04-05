import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  clearPendingSignupRole,
  completeOnboarding,
  getCachedSession,
  getDefaultRouteForSession,
  getPendingSignupRole,
  type UserRole,
} from "../services/appSession";

const THEME_STORAGE_KEY = "lernoTheme";

function readTheme() {
  return localStorage.getItem(THEME_STORAGE_KEY) === "light" ? "light" : "dark";
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const session = useMemo(() => getCachedSession(), []);
  const pendingRole = useMemo(() => getPendingSignupRole(), []);
  const initialRole = session?.role || pendingRole;
  const [role] = useState<UserRole>(initialRole || "student");
  const [fullName, setFullName] = useState(session?.profile?.fullName || "");
  const [phone, setPhone] = useState(session?.profile?.phone || "");
  const [course, setCourse] = useState(session?.profile?.course || "");
  const [year, setYear] = useState(session?.profile?.year || "");
  const [semester, setSemester] = useState(session?.profile?.semester || "");
  const [department, setDepartment] = useState(session?.profile?.department || "");
  const [designation, setDesignation] = useState(session?.profile?.designation || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const theme = readTheme();
  const isDarkTheme = theme === "dark";

  useEffect(() => {
    if (!session?.isAuthenticated || !session.email) {
      navigate("/login", { replace: true });
      return;
    }

    if (session.isOnboarded) {
      navigate(getDefaultRouteForSession(session), { replace: true });
      return;
    }

    if (!initialRole) {
      navigate("/signup", { replace: true });
    }
  }, [initialRole, navigate, session]);

  const email = session?.email || localStorage.getItem("userEmail") || "";

  const handleSubmit = async () => {
    setError("");

    if (fullName.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }

    setLoading(true);
    try {
      const nextSession = await completeOnboarding({
        email,
        role,
        fullName,
        phone,
        course,
        year,
        semester,
        department,
        designation,
        avatar: session?.profile?.avatar,
      });

      clearPendingSignupRole();
      navigate(getDefaultRouteForSession(nextSession), { replace: true });
    } catch (err) {
      setError((err as Error).message || "Failed to complete onboarding.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen px-4 py-10 transition-colors duration-300 ${
        isDarkTheme
          ? "bg-black text-white"
          : "bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.96),_rgba(238,243,255,0.96),_rgba(228,236,252,0.98))] text-slate-900"
      }`}
    >
      <div className="mx-auto max-w-5xl">
        <div className="mx-auto max-w-3xl text-center">
          <p
            className={`text-xs uppercase tracking-[0.28em] ${
              isDarkTheme ? "text-white/45" : "text-slate-500"
            }`}
          >
            Welcome To Lerno.ai
          </p>
          <h1 className="mt-4 text-4xl font-semibold">
            Complete your onboarding
          </h1>
          <p
            className={`mt-4 text-base ${
              isDarkTheme ? "text-white/60" : "text-slate-600"
            }`}
          >
            We will use this information to create your student or faculty workspace and
            persist your profile in Firestore.
          </p>
        </div>

        <div
          className={`mx-auto mt-10 max-w-4xl rounded-[32px] border p-6 shadow-[0_30px_120px_-60px_rgba(15,23,42,0.35)] backdrop-blur-xl md:p-8 ${
            isDarkTheme
              ? "border-white/10 bg-zinc-950/75"
              : "border-slate-300/70 bg-white/88"
          }`}
        >
          <div className="grid gap-8 md:grid-cols-[0.9fr_1.1fr]">
            <div
              className={`rounded-[28px] border p-5 ${
                isDarkTheme
                  ? "border-white/10 bg-white/[0.03]"
                  : "border-slate-200 bg-slate-50/85"
              }`}
            >
              <p
                className={`text-xs uppercase tracking-[0.24em] ${
                  isDarkTheme ? "text-white/40" : "text-slate-500"
                }`}
              >
                Account Setup
              </p>
              <p className="mt-3 text-2xl font-semibold">{email}</p>
              <p
                className={`mt-3 text-sm leading-6 ${
                  isDarkTheme ? "text-white/55" : "text-slate-600"
                }`}
              >
                This account is signing up as a{" "}
                <span className="font-semibold capitalize">{role}</span>. Fill in the profile
                details to continue.
              </p>
              <div
                className={`mt-6 rounded-2xl border px-4 py-4 ${
                  isDarkTheme
                    ? "border-violet-400/25 bg-violet-500/10"
                    : "border-violet-200 bg-violet-50"
                }`}
              >
                <p className="text-base font-semibold capitalize">{role}</p>
                <p
                  className={`mt-1 text-sm ${
                    isDarkTheme ? "text-white/55" : "text-slate-600"
                  }`}
                >
                  {role === "student"
                    ? "Personalized learning workspace with recent topics, bookmarks, and AI study tools."
                    : "Faculty dashboard with profile summary, activity overview, onboarding insights, and topic video controls."}
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <label className="space-y-2">
                  <span className={`text-sm font-medium ${isDarkTheme ? "text-white/75" : "text-slate-700"}`}>
                    Full Name
                  </span>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={`w-full rounded-2xl border px-4 py-3 outline-none transition ${
                      isDarkTheme
                        ? "border-white/10 bg-white/[0.03] text-white"
                        : "border-slate-300 bg-white text-slate-900"
                    }`}
                    placeholder="Enter your full name"
                  />
                </label>

                <label className="space-y-2">
                  <span className={`text-sm font-medium ${isDarkTheme ? "text-white/75" : "text-slate-700"}`}>
                    Phone Number
                  </span>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, "").slice(0, 10))}
                    className={`w-full rounded-2xl border px-4 py-3 outline-none transition ${
                      isDarkTheme
                        ? "border-white/10 bg-white/[0.03] text-white"
                        : "border-slate-300 bg-white text-slate-900"
                    }`}
                    placeholder="10-digit mobile number"
                  />
                </label>
              </div>

              {role === "student" ? (
                <div className="grid gap-5 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className={`text-sm font-medium ${isDarkTheme ? "text-white/75" : "text-slate-700"}`}>
                      Course
                    </span>
                    <input
                      value={course}
                      onChange={(e) => setCourse(e.target.value)}
                      className={`w-full rounded-2xl border px-4 py-3 outline-none transition ${
                        isDarkTheme
                          ? "border-white/10 bg-white/[0.03] text-white"
                          : "border-slate-300 bg-white text-slate-900"
                      }`}
                      placeholder="BCA / B.Tech / MBA"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className={`text-sm font-medium ${isDarkTheme ? "text-white/75" : "text-slate-700"}`}>
                      Department
                    </span>
                    <input
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className={`w-full rounded-2xl border px-4 py-3 outline-none transition ${
                        isDarkTheme
                          ? "border-white/10 bg-white/[0.03] text-white"
                          : "border-slate-300 bg-white text-slate-900"
                      }`}
                      placeholder="Computer Science"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className={`text-sm font-medium ${isDarkTheme ? "text-white/75" : "text-slate-700"}`}>
                      Year
                    </span>
                    <input
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className={`w-full rounded-2xl border px-4 py-3 outline-none transition ${
                        isDarkTheme
                          ? "border-white/10 bg-white/[0.03] text-white"
                          : "border-slate-300 bg-white text-slate-900"
                      }`}
                      placeholder="1st Year / 2nd Year"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className={`text-sm font-medium ${isDarkTheme ? "text-white/75" : "text-slate-700"}`}>
                      Semester
                    </span>
                    <input
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      className={`w-full rounded-2xl border px-4 py-3 outline-none transition ${
                        isDarkTheme
                          ? "border-white/10 bg-white/[0.03] text-white"
                          : "border-slate-300 bg-white text-slate-900"
                      }`}
                      placeholder="Semester 6"
                    />
                  </label>
                </div>
              ) : (
                <div className="grid gap-5 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className={`text-sm font-medium ${isDarkTheme ? "text-white/75" : "text-slate-700"}`}>
                      Department
                    </span>
                    <input
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className={`w-full rounded-2xl border px-4 py-3 outline-none transition ${
                        isDarkTheme
                          ? "border-white/10 bg-white/[0.03] text-white"
                          : "border-slate-300 bg-white text-slate-900"
                      }`}
                      placeholder="Computer Science Department"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className={`text-sm font-medium ${isDarkTheme ? "text-white/75" : "text-slate-700"}`}>
                      Designation
                    </span>
                    <input
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      className={`w-full rounded-2xl border px-4 py-3 outline-none transition ${
                        isDarkTheme
                          ? "border-white/10 bg-white/[0.03] text-white"
                          : "border-slate-300 bg-white text-slate-900"
                      }`}
                      placeholder="Assistant Professor"
                    />
                  </label>
                </div>
              )}

              {error ? (
                <div
                  className={`rounded-2xl border px-4 py-3 text-sm ${
                    isDarkTheme
                      ? "border-rose-500/20 bg-rose-500/10 text-rose-200"
                      : "border-rose-200 bg-rose-50 text-rose-700"
                  }`}
                >
                  {error}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    clearPendingSignupRole();
                    navigate("/signup");
                  }}
                  className={`rounded-2xl border px-5 py-3 text-sm font-medium transition ${
                    isDarkTheme
                      ? "border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.08]"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="rounded-2xl bg-emerald-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
                >
                  {loading ? "Saving..." : "Complete Setup"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
