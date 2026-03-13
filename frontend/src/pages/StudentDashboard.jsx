import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { CodeEditor } from '../components/CodeEditor.jsx';
import { MultiFileUpload } from '../components/MultiFileUpload.jsx';
import { FileList } from '../components/FileList.jsx';
import { ResultsPanel } from '../components/ResultsPanel.jsx';
import { GeminiChatbot } from '../components/GeminiChatbot.jsx';
import { getAssignments, submitCode, getResult, getStudentProgress, getBestCode, getStudentLeaderboard, socket } from '../api/index.js';
import { FiAward, FiFlag, FiTarget, FiZap, FiArrowLeft, FiList, FiBarChart2, FiLogOut, FiChevronRight, FiChevronLeft, FiCode, FiMenu, FiSun, FiMoon } from 'react-icons/fi';
import { MdCheckCircle } from 'react-icons/md';
import {
  hasHtmlFile,
  removeProjectFile,
  setProjectMainFile,
  updateProjectFileContent
} from '../utils/projectFiles.js';

function StudentLeaderboardView({ currentUser, onBack }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    getStudentLeaderboard()
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const assignment = data[activeTab];

  // Podium order: 2nd, 1st, 3rd (classic podium shape)
  const podiumOrder = (top3) => {
    const second = top3.find(s => s.rank === 2) || null;
    const first = top3.find(s => s.rank === 1) || null;
    const third = top3.find(s => s.rank === 3) || null;
    return [second, first, third].filter(Boolean);
  };

  const podiumConfig = {
    1: { h: 'h-28', bg: 'from-[#f0c040]/20 to-[#f0c040]/5', border: 'border-[#f0c040]/40', text: 'text-[#f0c040]', color: '#f0c040', label: '1st' },
    2: { h: 'h-20', bg: 'from-[#b0b8c8]/20 to-[#b0b8c8]/5', border: 'border-[#b0b8c8]/40', text: 'text-[#b0b8c8]', color: '#b0b8c8', label: '2nd' },
    3: { h: 'h-14', bg: 'from-[#cd7f32]/20 to-[#cd7f32]/5', border: 'border-[#cd7f32]/40', text: 'text-[#cd7f32]', color: '#cd7f32', label: '3rd' },
  };

  const scoreColor = (score) =>
    score >= 80 ? 'text-[#3fb950]' : score >= 50 ? 'text-[#f0a500]' : 'text-[#f85149]';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-[#4e9af1] text-sm hover:underline">← Back</button>
        <div>
          <h2 className="text-xl font-bold text-[var(--text-strong)]">Leaderboard</h2>
          <p className="text-xs text-[var(--text-faint)]">Top students per assignment</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-9 h-9 rounded-full border-[3px] border-[var(--border-color)] border-t-[#4e9af1] animate-spin" />
        </div>
      ) : data.length === 0 ? (
        <p className="text-[var(--text-faint)] text-center py-20">No assignments available yet.</p>
      ) : (
        <>
          {/* Assignment tabs */}
          <div className="flex gap-2 flex-wrap mb-8">
            {data.map((a, i) => (
              <button
                key={a.assignmentId}
                onClick={() => setActiveTab(i)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${activeTab === i
                  ? 'bg-[#2f80ed]/20 border-[#4e9af1] text-[#4e9af1] shadow-[0_0_12px_rgba(78,154,241,0.15)]'
                  : 'bg-[var(--bg-surface-alt)] border-[var(--border-color)] text-[var(--text-faint)] hover:border-[var(--text-faintest)] hover:text-[#bbb]'
                  }`}
              >
                {a.title}
                {a.myRank && (
                  <span className={`ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${a.myRank.completed ? 'bg-[#3fb950]/20 text-[#3fb950]' : 'bg-[#f0a500]/10 text-[#f0a500]'
                    }`}>
                    #{a.myRank.rank}
                  </span>
                )}
              </button>
            ))}
          </div>

          {assignment && (
            <>
              {/* No submissions at all */}
              {assignment.totalStudents === 0 ? (
                <div className="text-center py-16 text-[var(--text-faint)]">
                  <FiFlag size={36} className="mx-auto mb-3 text-[var(--text-faintest)]" />
                  <p className="text-sm">No one has submitted yet. Be the first!</p>
                </div>
              ) : (
                <>
                  {/* ── PODIUM ────────────────────── */}
                  <div className="flex items-end justify-center gap-3 mb-8">
                    {podiumOrder(assignment.top3).map((s) => {
                      const cfg = podiumConfig[s.rank];
                      const isMe = s.name === currentUser?.name;
                      return (
                        <div key={s.rank} className="flex flex-col items-center gap-2" style={{ width: 140 }}>
                          {/* Medal icon */}
                          <div className={`mb-1 p-2 rounded-full ${isMe ? 'ring-2 ring-[#4e9af1]' : ''}`}>
                            <FiAward size={28} style={{ color: cfg.color }} />
                          </div>
                          <p className={`text-xs font-bold text-center leading-tight ${isMe ? 'text-[#4e9af1]' : 'text-[var(--text-strong)]'
                            }`}>
                            {s.name}{isMe ? ' (You)' : ''}
                          </p>
                          <p className={`text-sm font-bold ${scoreColor(s.bestScore)}`}>{s.bestScore}/100</p>
                          {s.completed && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 bg-[#3fb950]/10 border border-[#3fb950]/30 text-[#3fb950] rounded-full">
                              <MdCheckCircle size={10} /> Done
                            </span>
                          )}
                          {/* Podium block */}
                          <div className={`w-full ${cfg.h} bg-gradient-to-b ${cfg.bg} border ${cfg.border} rounded-t-xl flex items-center justify-center`}>
                            <span className={`text-xl font-black ${cfg.text}`}>{cfg.label}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Podium base line */}
                  <div className="h-1 bg-gradient-to-r from-transparent via-[var(--border-color)] to-transparent rounded-full mb-8" />

                  {/* ── YOUR RANK ─────────────────── */}
                  {assignment.myRank ? (
                    <div className={`rounded-2xl border p-5 flex items-center gap-5 ${assignment.myRank.completed
                      ? 'bg-[#3fb950]/5 border-[#3fb950]/30'
                      : 'bg-[var(--bg-surface-alt)] border-[var(--border-color)]'
                      }`}>
                      <div className="p-3 rounded-xl" style={{ background: `${podiumConfig[assignment.myRank.rank]?.color ?? '#4e9af1'}18` }}>
                        {assignment.myRank.rank <= 3
                          ? <FiAward size={32} style={{ color: podiumConfig[assignment.myRank.rank]?.color }} />
                          : <FiTarget size={32} className="text-[#4e9af1]" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-[var(--text-faint)] mb-0.5">Your rank</p>
                        <p className="text-3xl font-black text-[var(--text-strong)]">#{assignment.myRank.rank}</p>
                        <p className="text-xs text-[var(--text-faint)] mt-0.5">out of {assignment.totalStudents} student{assignment.totalStudents !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-[var(--text-faint)] mb-0.5">Best score</p>
                        <p className={`text-2xl font-bold ${scoreColor(assignment.myRank.bestScore)}`}>{assignment.myRank.bestScore}/100</p>
                        {assignment.myRank.completed && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-[#3fb950]/10 border border-[#3fb950]/30 text-[#3fb950] rounded-full">
                            <MdCheckCircle size={10} /> Completed
                          </span>
                        )}
                      </div>
                      {/* Score progress bar */}
                      <div className="w-24">
                        <div className="w-full bg-[var(--bg-surface)] rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${assignment.myRank.bestScore >= 80 ? 'bg-[#3fb950]' :
                              assignment.myRank.bestScore >= 50 ? 'bg-[#f0a500]' : 'bg-[#f85149]'
                              }`}
                            style={{ width: `${assignment.myRank.bestScore}%` }}
                          />
                        </div>
                        <p className="text-[9px] text-[var(--text-faint)] mt-1 text-center">{assignment.myRank.bestScore}% score</p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[var(--border-color)] p-8 text-center">
                      <FiZap size={36} className="mx-auto mb-2 text-[var(--text-faintest)]" />
                      <p className="text-sm font-semibold text-[var(--text-strong)] mb-1">You haven&apos;t submitted yet</p>
                      <p className="text-xs text-[var(--text-faint)]">Submit your code to appear on the leaderboard!</p>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function AssignmentCard({ a, progress, onStart }) {
  const p = progress[a._id];
  const isCompleted = p?.completed;
  const hasTried = p?.attempts > 0;

  return (
    <div className={`bg-[var(--bg-surface-alt)] border rounded-xl overflow-hidden flex flex-col transition-colors ${isCompleted ? 'border-[#3fb950]/40' : 'border-[var(--border-color)]'}`}>
      {a.referenceScreenshotUrl && (
        <div className="relative">
          <img src={a.referenceScreenshotUrl} alt={a.title} className="w-full h-36 object-cover object-top border-b border-[var(--border-color)]" />
          {isCompleted ? (
            <span className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-[#3fb950]/20 border border-[#3fb950]/50 text-[#3fb950] text-[10px] font-bold rounded-full backdrop-blur-sm">
              <MdCheckCircle size={12} /> Completed
            </span>
          ) : hasTried ? (
            <span className="absolute top-2 right-2 px-2 py-0.5 bg-[#f0a500]/10 border border-[#f0a500]/40 text-[#f0a500] text-[10px] font-bold rounded-full backdrop-blur-sm">
              Best: {p.bestScore}/100
            </span>
          ) : null}
        </div>
      )}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="font-semibold text-[var(--text-strong)] text-sm leading-snug">{a.title}</h3>
          {!a.referenceScreenshotUrl && isCompleted && (
            <span className="inline-flex items-center gap-1 shrink-0 text-[10px] font-bold px-2 py-0.5 bg-[#3fb950]/10 border border-[#3fb950]/40 text-[#3fb950] rounded-full">
              <MdCheckCircle size={10} /> Completed
            </span>
          )}
          {!a.referenceScreenshotUrl && !isCompleted && hasTried && (
            <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 bg-[#f0a500]/10 border border-[#f0a500]/30 text-[#f0a500] rounded-full">{p.bestScore}/100</span>
          )}
        </div>
        {hasTried && (
          <p className="text-[10px] text-[var(--text-faint)] mb-3">{p.attempts} attempt{p.attempts !== 1 ? 's' : ''} · Best: <span className={isCompleted ? 'text-[#3fb950]' : 'text-[#f0a500]'}>{p.bestScore}/100</span></p>
        )}
        <button
          type="button"
          onClick={() => onStart(a)}
          className={`mt-auto w-full py-2 text-xs font-semibold rounded-lg transition-colors ${isCompleted
            ? 'bg-[#3fb950]/20 text-[#3fb950] border border-[#3fb950]/40 hover:bg-[#3fb950]/30'
            : 'bg-[#2f80ed] text-[var(--text-strong)] hover:bg-[#1a6cda]'
            }`}
        >
          {isCompleted ? 'Resubmit' : hasTried ? 'Try Again' : 'Start Assignment'}
        </button>
      </div>
    </div>
  );
}

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [view, setView] = useState('list'); // 'list' | 'editor' | 'leaderboard'
  const [assignments, setAssignments] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [progress, setProgress] = useState({});

  // Submission state
  const [files, setFiles] = useState([]);
  const [selectedFileName, setSelectedFileName] = useState(null);
  const [submissionId, setSubmissionId] = useState(null);
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [filesMessage, setFilesMessage] = useState(null);
  const [loadingCode, setLoadingCode] = useState(false);
  const [codePrefilled, setCodePrefilled] = useState(false);
  const [showResults, setShowResults] = useState(false); // results slide-in overlay
  const [infoTab, setInfoTab] = useState('description');  // LeetCode-style panel tab
  const [activeShot, setActiveShot] = useState(0);        // active screenshot in gallery
  const [lightbox, setLightbox] = useState(null);         // lightbox URL

  useEffect(() => {
    getAssignments()
      .then(setAssignments)
      .catch(console.error)
      .finally(() => setLoadingList(false));
    // Also fetch student progress for badges
    getStudentProgress().then(setProgress).catch(console.error);
  }, []);

  const handleStart = async (assignment) => {
    setSelectedAssignment(assignment);
    setFiles([]);
    setSelectedFileName(null);
    setSubmissionId(null);
    setStatus(null);
    setResult(null);
    setSubmitError('');
    setFilesMessage(null);
    setCodePrefilled(false);
    setShowResults(false);
    setInfoTab('description'); // reset panel tab
    setActiveShot(0);          // reset screenshot gallery
    setLightbox(null);

    // If the student has a previous best submission, load that code into the editor
    const p = progress[assignment._id];
    if (p?.attempts > 0) {
      setLoadingCode(true);
      try {
        const bestCode = await getBestCode(assignment._id);
        if (bestCode.files?.length > 0) {
          setFiles(bestCode.files);
          setSelectedFileName(bestCode.files[0].name);
          setCodePrefilled(true);
        }
      } catch (err) {
        console.error('Failed to load best code:', err.message);
      } finally {
        setLoadingCode(false);
      }
    }
  };

  const handleSubmit = async () => {
    if (!hasHtmlFile(files)) {
      setSubmitError('Upload at least one HTML file before submitting.');
      return;
    }

    setSubmitError('');
    setResult(null);
    setSubmissionId(null);
    setStatus('pending');
    setShowResults(false);
    try {
      const { submissionId: id } = await submitCode({ files, assignmentId: selectedAssignment._id });
      setSubmissionId(id);
    } catch (err) {
      setSubmitError(err.message);
      setStatus(null);
    }
  };

  // Listen for real-time completion
  useEffect(() => {
    if (!submissionId) return;
    const handler = async ({ submissionId: doneId }) => {
      if (doneId !== submissionId) return;
      const data = await getResult(doneId);
      if (data.status === 'done') {
        setStatus('done');
        setResult(data.result);
        setShowResults(true); // auto-open results panel
        getStudentProgress().then(setProgress).catch(console.error);
      } else setStatus(data.status);
    };
    socket.on('evaluation:complete', handler);

    // Fallback polling — in case the socket event arrived before this listener registered
    const poll = setInterval(async () => {
      try {
        const data = await getResult(submissionId);
        if (data.status === 'done') {
          clearInterval(poll);
          setStatus('done');
          setResult(data.result);
          setShowResults(true); // auto-open results panel
        }
      } catch { /* ignore, keep polling */ }
    }, 3000);

    return () => {
      socket.off('evaluation:complete', handler);
      clearInterval(poll);
    };
  }, [submissionId]);

  const handleFileChange = useCallback((fileName, value) => {
    setFiles((currentFiles) => updateProjectFileContent(currentFiles, fileName, value));
  }, []);

  const isEvaluating = status === 'pending' || status === 'processing';
  const activeView = selectedAssignment ? 'editor' : view;
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-main)] flex">

      {/* ── LEFT SIDEBAR ── */}
      <aside
        className="shrink-0 bg-[var(--bg-surface)] border-r border-[var(--border-color)] flex flex-col min-h-screen sticky top-0 h-screen overflow-hidden transition-all duration-300"
        style={{ width: sidebarOpen ? '224px' : '48px' }}
      >
        {/* Brand */}
        <div className="px-3 py-4 border-b border-[var(--border-color)] shrink-0">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 shrink-0 rounded-lg bg-gradient-to-br from-[#2f80ed]/30 to-[#4e9af1]/10 border border-[#2f80ed]/30 flex items-center justify-center">
              <FiCode size={14} className="text-[#4e9af1]" />
            </div>
            <div className={`overflow-hidden transition-all duration-300 ${sidebarOpen ? 'w-auto opacity-100' : 'w-0 opacity-0'}`}>
              <p className="text-[var(--text-strong)] text-sm font-bold leading-tight whitespace-nowrap">Student</p>
              <p className="text-[var(--text-faintest)] text-[10px] truncate max-w-[100px]">{user?.name}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-1.5 py-3 space-y-1 overflow-hidden">
          {[
            { id: 'list', icon: FiList, label: 'Assignments' },
            { id: 'leaderboard', icon: FiBarChart2, label: 'Leaderboard' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => { setSelectedAssignment(null); setView(item.id); }}
              title={!sidebarOpen ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-medium transition-all ${activeView === item.id
                ? 'bg-[#2f80ed]/10 text-[#4e9af1] border border-[#2f80ed]/25'
                : 'text-[var(--text-faint)] hover:text-[#bbb] hover:bg-[var(--bg-surface-alt)]'
                }`}
            >
              <item.icon size={16} className="shrink-0" />
              <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${sidebarOpen ? 'opacity-100 max-w-[160px]' : 'opacity-0 max-w-0'}`}>
                {item.label}
              </span>
              {sidebarOpen && activeView === item.id && <FiChevronRight size={12} className="ml-auto shrink-0" />}
            </button>
          ))}

          {/* Shown when inside a specific assignment */}
          {selectedAssignment && sidebarOpen && (
            <>
              <div className="border-t border-[var(--border-color)] my-2" />
              <div className="px-3 py-2">
                <p className="text-[10px] text-[var(--text-faintest)] font-semibold uppercase tracking-wider mb-1.5">Current</p>
                <p className="text-xs text-[var(--text-muted)] font-medium leading-snug line-clamp-2">{selectedAssignment.title}</p>
              </div>
              <button
                onClick={() => setSelectedAssignment(null)}
                className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm text-[var(--text-faint)] hover:text-[#4e9af1] hover:bg-[#4e9af1]/10 transition-all"
              >
                <FiArrowLeft size={16} className="shrink-0" />
                <span className="overflow-hidden whitespace-nowrap">All Assignments</span>
              </button>
            </>
          )}
          {selectedAssignment && !sidebarOpen && (
            <button
              onClick={() => setSelectedAssignment(null)}
              title="All Assignments"
              className="w-full flex items-center justify-center px-2.5 py-2.5 rounded-xl text-sm text-[var(--text-faint)] hover:text-[#4e9af1] hover:bg-[#4e9af1]/10 transition-all"
            >
              <FiArrowLeft size={16} />
            </button>
          )}
        </nav>

        {/* Sign out */}
        <div className="px-1.5 pb-4 shrink-0">
          <button
            onClick={logout}
            title={!sidebarOpen ? 'Sign Out' : undefined}
            className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm text-[var(--text-faint)] hover:text-[#f85149] hover:bg-[#f85149]/10 transition-all"
          >
            <FiLogOut size={16} className="shrink-0" />
            <span className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${sidebarOpen ? 'opacity-100 max-w-[160px]' : 'opacity-0 max-w-0'}`}>
              Sign Out
            </span>
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header className="bg-[var(--bg-surface)] border-b border-[var(--border-color)] px-4 py-3 sticky top-0 z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Sidebar toggle */}
            <button
              onClick={() => setSidebarOpen(o => !o)}
              className="flex items-center justify-center w-7 h-7 rounded-lg text-[var(--text-faint)] hover:text-[#bbb] hover:bg-[var(--bg-surface-alt)] transition-all shrink-0"
              title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {sidebarOpen ? <FiChevronLeft size={16} /> : <FiMenu size={16} />}
            </button>
            <h1 className="font-bold text-[var(--text-strong)] text-sm">
              {selectedAssignment ? selectedAssignment.title
                : view === 'leaderboard' ? 'Leaderboard'
                  : 'Available Assignments'}
            </h1>
          </div>
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-lg bg-[var(--bg-base)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-strong)] flex items-center justify-center transition-colors shrink-0"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <FiSun size={14} /> : <FiMoon size={14} />}
          </button>
        </header>


        {/* ─ Leaderboard view ─ */}
        {!selectedAssignment && view === 'leaderboard' && (
          <main className="flex-1 overflow-y-auto px-8 py-8 max-w-2xl">
            <StudentLeaderboardView currentUser={user} onBack={() => setView('list')} />
          </main>
        )}

        {/* ─ Assignment list ─ */}
        {!selectedAssignment && view === 'list' && (
          <main className="flex-1 overflow-y-auto px-8 py-8">
            <p className="text-sm text-[var(--text-faint)] mb-6">Pick an assignment and submit your code for evaluation.</p>
            {loadingList ? (
              <div className="flex justify-center py-20">
                <div className="w-9 h-9 rounded-full border-[3px] border-[var(--border-color)] border-t-[#4e9af1] animate-spin" />
              </div>
            ) : assignments.length === 0 ? (
              <p className="text-[var(--text-faint)] text-center py-20">No assignments available yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {assignments.map(a => (
                  <AssignmentCard key={a._id} a={a} progress={progress} onStart={handleStart} />
                ))}
              </div>
            )}
          </main>
        )}

        {/* ─ Submission / Editor view ─ */}
        {selectedAssignment && (() => {
          const p = progress[selectedAssignment._id];
          const isCompleted = p?.completed;
          return (
            <div className="flex flex-1 flex-col xl:flex-row overflow-hidden">

              {/* ── LEFT: Problem Panel (LeetCode-style) ── */}
              {(() => {
                return (
                  <aside
                    className="w-full max-h-[360px] lg:max-h-[420px] xl:max-h-none xl:w-[360px] 2xl:w-[400px] shrink-0 flex flex-col overflow-hidden border-b xl:border-b-0 xl:border-r border-[var(--border-color)]"
                    style={{ background: '#0f0f1a' }}
                  >
                    {/* ── Tab Bar ── */}
                    <div className="shrink-0 flex items-center gap-1 px-2 border-b border-[var(--border-color)]" style={{ background: '#0d0d1f' }}>
                      {[
                        { key: 'description', label: 'Description' },
                        { key: 'progress', label: p?.attempts > 0 ? `Progress (${p.attempts})` : 'Progress' },
                      ].map(tab => (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setInfoTab(tab.key)}
                          className={`px-3 py-2.5 text-[13px] font-medium transition-colors border-b-2 -mb-px ${infoTab === tab.key
                            ? 'border-[#4e9af1] text-[var(--text-strong)]'
                            : 'border-transparent text-[var(--text-faint)] hover:text-[var(--text-muted)]'
                            }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* ── Description Tab ── */}
                    {infoTab === 'description' && (
                      <div className="flex-1 overflow-y-auto">
                        <div className="px-6 pt-5 pb-8">

                          {/* Title — large like LeetCode */}
                          <h2 className="text-xl font-bold text-[var(--text-strong)] mb-4 leading-tight">
                            {selectedAssignment.title}
                          </h2>

                          {/* ── Reference Screenshots Gallery ── */}
                          {(() => {
                            // Prefer the array, fall back to single URL
                            const pageShots = (selectedAssignment.referencePageScreenshots?.length > 0)
                              ? selectedAssignment.referencePageScreenshots
                              : (selectedAssignment.referenceScreenshots?.length > 0)
                                ? selectedAssignment.referenceScreenshots.map((url, index) => ({
                                  pageName: `Reference ${index + 1}`,
                                  url,
                                  isMain: index === 0
                                }))
                                : selectedAssignment.referenceScreenshotUrl
                                  ? [{ pageName: 'Main page', url: selectedAssignment.referenceScreenshotUrl, isMain: true }]
                                  : [];

                            if (pageShots.length === 0) return null;

                            return (
                              <div className="mb-5">
                                {/* Main preview */}
                                <div className="relative rounded-lg border border-[var(--border-color)] overflow-hidden group bg-black"
                                  style={{ height: '170px' }}>
                                  <img
                                    src={pageShots[activeShot]?.url}
                                    alt={`Reference state ${activeShot + 1}`}
                                    className="w-full h-full object-cover object-top cursor-zoom-in"
                                    onClick={() => setLightbox(pageShots[activeShot]?.url)}
                                  />
                                  {/* State badge */}
                                  <span className="absolute top-2 left-2 text-[10px] font-bold text-[var(--text-strong)] bg-black/60 px-2 py-0.5 rounded-full">
                                    {pageShots[activeShot]?.pageName || `Page ${activeShot + 1}`}
                                  </span>
                                  {/* Open full size */}
                                  <a
                                    href={pageShots[activeShot]?.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="absolute top-2 right-2 text-[10px] font-semibold text-[var(--text-strong)] bg-black/60 px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                                  >
                                    ↗ Full size
                                  </a>
                                  {/* Prev/Next arrows — only if multiple */}
                                  {pageShots.length > 1 && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => setActiveShot(i => (i - 1 + pageShots.length) % pageShots.length)}
                                        className="absolute left-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/60 text-[var(--text-strong)] flex items-center justify-center text-xs hover:bg-black/80 transition-colors"
                                      >‹</button>
                                      <button
                                        type="button"
                                        onClick={() => setActiveShot(i => (i + 1) % pageShots.length)}
                                        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-black/60 text-[var(--text-strong)] flex items-center justify-center text-xs hover:bg-black/80 transition-colors"
                                      >›</button>
                                    </>
                                  )}
                                </div>

                                {/* Thumbnail strip — horizontal scroll */}
                                {pageShots.length > 1 && (
                                  <div className="flex gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-thin">
                                    {pageShots.map((shot, i) => (
                                      <button
                                        key={i}
                                        type="button"
                                        onClick={() => setActiveShot(i)}
                                        className={`shrink-0 relative overflow-hidden rounded border transition-all ${activeShot === i
                                          ? 'border-[#4e9af1] ring-1 ring-[#4e9af1]/40'
                                          : 'border-[var(--border-color)] opacity-60 hover:opacity-90'
                                        }`}
                                        style={{ width: '60px', height: '40px' }}
                                      >
                                        <img src={shot.url} alt={`Page ${i + 1}`} className="w-full h-full object-cover object-top" />
                                        <span className="absolute bottom-0 left-0 right-0 text-center text-[8px] font-bold text-[var(--text-strong)] bg-black/60 leading-tight py-0.5">
                                          {shot.pageName || `${i + 1}`}
                                        </span>
                                      </button>
                                    ))}
                                  </div>
                                )}

                                <p className="text-[10px] text-[var(--text-faintest)] mt-1.5">
                                  Reference design · {pageShots.length} page{pageShots.length !== 1 ? 's' : ''}
                                </p>

                                {/* Lightbox */}
                                {lightbox && (
                                  <div
                                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                                    onClick={() => setLightbox(null)}
                                  >
                                    <img
                                      src={lightbox}
                                      alt="Full size reference"
                                      className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                                      onClick={e => e.stopPropagation()}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setLightbox(null)}
                                      className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[var(--text-strong)]/10 text-[var(--text-strong)] flex items-center justify-center hover:bg-white/20 text-sm"
                                    >✕</button>
                                  </div>
                                )}
                              </div>
                            );
                          })()}


                          {/* Description body — clean prose, no card */}
                          {selectedAssignment.description ? (
                            <div
                              className="text-sm text-[#b0b0b0] leading-[1.8] whitespace-pre-line"
                              style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}
                            >
                              {selectedAssignment.description}
                            </div>
                          ) : (
                            <p className="text-sm text-[var(--text-faintest)] italic">No description provided.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ── Progress Tab ── */}
                    {infoTab === 'progress' && (
                      <div className="flex-1 overflow-y-auto px-6 py-6">
                        {p?.attempts > 0 ? (
                          <div className="flex flex-col gap-6">
                            {/* Score hero */}
                            <div className="text-center py-4">
                              <p className="text-[11px] text-[var(--text-faint)] uppercase tracking-wider mb-1">Best Score</p>
                              <p className={`text-4xl font-black ${isCompleted ? 'text-[#3fb950]' : 'text-[#f0a500]'}`}>
                                {p.bestScore}
                                <span className="text-xl text-[var(--text-faintest)] font-normal">/100</span>
                              </p>
                              <p className={`text-xs font-semibold mt-1 ${isCompleted ? 'text-[#3fb950]' : 'text-[#f0a500]'}`}>
                                {isCompleted ? '✓ Completed' : 'In Progress'}
                              </p>
                            </div>

                            {/* Progress bar */}
                            <div>
                              <div className="w-full bg-[var(--bg-surface-alt)] rounded-full h-2 overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-700"
                                  style={{ width: `${p.bestScore}%`, background: isCompleted ? '#3fb950' : '#f0a500' }}
                                />
                              </div>
                            </div>

                            {/* Stats */}
                            <div className="flex flex-col gap-3">
                              {[
                                { label: 'Submissions', value: p.attempts },
                                { label: 'Best Score', value: `${p.bestScore}/100` },
                                { label: 'Status', value: isCompleted ? 'Completed' : 'In Progress' },
                              ].map(row => (
                                <div key={row.label} className="flex justify-between items-center border-b border-[var(--bg-surface-alt)] pb-3">
                                  <span className="text-sm text-[var(--text-faint)]">{row.label}</span>
                                  <span className={`text-sm font-semibold ${row.label === 'Status' ? (isCompleted ? 'text-[#3fb950]' : 'text-[#f0a500]') : 'text-[var(--text-strong)]'}`}>
                                    {row.value}
                                  </span>
                                </div>
                              ))}
                            </div>

                            <p className="text-xs text-[var(--text-faintest)] leading-relaxed">
                              Resubmit anytime — only your best score is saved.
                            </p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                            <p className="text-[var(--text-faint)] text-sm font-medium">No submissions yet</p>
                            <p className="text-[#333] text-xs">Write your solution and hit Submit.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </aside>
                );
              })()}




              {/* ── RIGHT: Code Editor + Results ── */}
              <div className="flex-1 min-w-0 min-h-0 flex flex-col xl:flex-row overflow-hidden">
                <div className="flex min-w-0 flex-1 flex-col overflow-hidden">

                  {/* Best-code prefilled banner */}
                  {codePrefilled && (
                    <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-[#3fb950]/10 border-b border-[#3fb950]/20 z-10">
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-[#3fb950]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        <span className="text-xs text-[#3fb950] font-semibold">Loaded from your best submission — edit and resubmit to improve your score</span>
                      </div>
                      <button onClick={() => setCodePrefilled(false)} className="text-[#3fb950]/60 hover:text-[#3fb950] text-xs">✕</button>
                    </div>
                  )}

                  {/* Loading code spinner */}
                  {loadingCode ? (
                    <div className="flex-1 flex items-center justify-center bg-[var(--bg-surface)]">
                      <div className="flex flex-col items-center gap-3 text-[var(--text-faint)]">
                        <div className="w-6 h-6 rounded-full border-2 border-[var(--border-color)] border-t-[#4e9af1] animate-spin" />
                        <p className="text-xs">Loading your best submission…</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="shrink-0 max-h-[38vh] overflow-y-auto scrollbar-thin px-4 py-4 sm:px-5 border-b border-[var(--border-color)] bg-[var(--bg-surface)] space-y-4">
                        <MultiFileUpload
                          files={files}
                          onChange={(nextFiles) => {
                            setFiles(nextFiles);
                            if (!nextFiles.some((file) => file.name === selectedFileName)) {
                              setSelectedFileName(nextFiles[0]?.name || null);
                            }
                          }}
                          onMessage={setFilesMessage}
                          disabled={isEvaluating}
                        />
                        {filesMessage && (
                          <p className={`text-xs ${filesMessage.tone === 'error' ? 'text-[#f85149]' : filesMessage.tone === 'success' ? 'text-[#3fb950]' : 'text-[var(--text-faint)]'}`}>
                            {filesMessage.message}
                          </p>
                        )}
                        <FileList
                          files={files}
                          selectedFileName={selectedFileName}
                          onSelect={setSelectedFileName}
                          onRemove={(fileName) => {
                            const nextFiles = removeProjectFile(files, fileName);
                            setFiles(nextFiles);
                            if (selectedFileName === fileName) {
                              setSelectedFileName(nextFiles[0]?.name || null);
                            }
                          }}
                          onSetMain={(fileName) => setFiles(setProjectMainFile(files, fileName))}
                        />
                      </div>
                      <CodeEditor
                        files={files}
                        selectedFileName={selectedFileName}
                        onSelectFile={setSelectedFileName}
                        onChange={handleFileChange}
                      />
                    </>
                  )}

                  {/* Submit bar */}
                  <div className="shrink-0 px-4 py-3 sm:px-5 bg-[#0a0a16] border-t border-[var(--border-color)] flex flex-wrap items-center gap-3 sm:gap-4 sm:pr-24 xl:pr-5">
                    <button
                      onClick={handleSubmit}
                      disabled={isEvaluating || loadingCode}
                      className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all bg-[#2f80ed] text-[var(--text-strong)] hover:bg-[#1a6cda] shadow-[0_0_20px_rgba(47,128,237,0.25)] disabled:bg-[var(--border-color)] disabled:text-[var(--text-faint)] disabled:cursor-not-allowed disabled:shadow-none"
                    >
                      {isEvaluating ? (
                        <span className="flex items-center gap-2">
                          <span className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin inline-block" />
                          Evaluating…
                        </span>
                      ) : 'Submit for Evaluation'}
                    </button>
                    {submitError && <p className="text-xs text-[#f85149]">{submitError}</p>}
                    {status === 'pending' || status === 'processing' ? (
                      <p className="text-xs text-[var(--text-muted)] sm:ml-auto">Running tests… please wait</p>
                    ) : status === 'done' && result ? (
                      <button
                        onClick={() => setShowResults((open) => !open)}
                        className="sm:ml-auto flex items-center gap-2 px-4 py-2 bg-[#3fb950]/10 border border-[#3fb950]/30 text-[#3fb950] text-xs font-semibold rounded-lg hover:bg-[#3fb950]/20 transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                        {showResults ? 'Hide Results' : `View Results — ${result.totalScore}/100`}
                      </button>
                    ) : null}
                  </div>
                </div>

                {showResults && status === 'done' && result && (
                  <aside
                    className="w-full max-h-[52vh] xl:max-h-none xl:w-[420px] 2xl:w-[460px] shrink-0 border-t xl:border-t-0 xl:border-l border-[var(--border-color)] bg-[var(--bg-surface)] flex flex-col overflow-hidden"
                    style={{ animation: 'slideInRight 0.25s ease-out' }}
                  >
                    <div className="flex items-center justify-between gap-3 px-5 py-3 bg-[var(--bg-surface-alt)] border-b border-[var(--border-color)] shrink-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-[#4e9af1] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
                        <span className="text-sm font-bold text-[var(--text-strong)] truncate">Evaluation Results</span>
                        <span className={`text-xs font-black px-2 py-0.5 rounded-full ${result.totalScore >= 50 ? 'bg-[#3fb950]/20 text-[#3fb950]' : 'bg-[#f85149]/20 text-[#f85149]'}`}>
                          {result.totalScore}/100
                        </span>
                      </div>
                      <button
                        onClick={() => setShowResults(false)}
                        className="w-7 h-7 rounded-lg bg-[var(--border-color)] hover:bg-[var(--border-light)] text-[var(--text-muted)] hover:text-[var(--text-strong)] flex items-center justify-center text-xs transition-colors shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                      <ResultsPanel status={status} result={result} />
                    </div>
                  </aside>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      <GeminiChatbot />
    </div>
  );
}
