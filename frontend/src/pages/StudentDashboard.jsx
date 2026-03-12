import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { CodeEditor } from '../components/CodeEditor.jsx';
import { ResultsPanel } from '../components/ResultsPanel.jsx';
import { getAssignments, submitCode, getResult, getStudentProgress, getBestCode, getStudentLeaderboard, socket } from '../api/index.js';
import { FiAward, FiFlag, FiTarget, FiZap, FiArrowLeft, FiList, FiBarChart2, FiLogOut, FiChevronRight, FiCode } from 'react-icons/fi';
import { MdCheckCircle } from 'react-icons/md';

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
          <h2 className="text-xl font-bold text-white">Leaderboard</h2>
          <p className="text-xs text-[#555]">Top students per assignment</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-9 h-9 rounded-full border-[3px] border-[#2a2a4a] border-t-[#4e9af1] animate-spin" />
        </div>
      ) : data.length === 0 ? (
        <p className="text-[#555] text-center py-20">No assignments available yet.</p>
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
                  : 'bg-[#1a1a2e] border-[#2a2a4a] text-[#666] hover:border-[#444] hover:text-[#bbb]'
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
                <div className="text-center py-16 text-[#555]">
                  <FiFlag size={36} className="mx-auto mb-3 text-[#444]" />
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
                          <p className={`text-xs font-bold text-center leading-tight ${isMe ? 'text-[#4e9af1]' : 'text-white'
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
                  <div className="h-1 bg-gradient-to-r from-transparent via-[#2a2a4a] to-transparent rounded-full mb-8" />

                  {/* ── YOUR RANK ─────────────────── */}
                  {assignment.myRank ? (
                    <div className={`rounded-2xl border p-5 flex items-center gap-5 ${assignment.myRank.completed
                      ? 'bg-[#3fb950]/5 border-[#3fb950]/30'
                      : 'bg-[#1a1a2e] border-[#2a2a4a]'
                      }`}>
                      <div className="p-3 rounded-xl" style={{ background: `${podiumConfig[assignment.myRank.rank]?.color ?? '#4e9af1'}18` }}>
                        {assignment.myRank.rank <= 3
                          ? <FiAward size={32} style={{ color: podiumConfig[assignment.myRank.rank]?.color }} />
                          : <FiTarget size={32} className="text-[#4e9af1]" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-[#555] mb-0.5">Your rank</p>
                        <p className="text-3xl font-black text-white">#{assignment.myRank.rank}</p>
                        <p className="text-xs text-[#555] mt-0.5">out of {assignment.totalStudents} student{assignment.totalStudents !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-[#555] mb-0.5">Best score</p>
                        <p className={`text-2xl font-bold ${scoreColor(assignment.myRank.bestScore)}`}>{assignment.myRank.bestScore}/100</p>
                        {assignment.myRank.completed && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-[#3fb950]/10 border border-[#3fb950]/30 text-[#3fb950] rounded-full">
                            <MdCheckCircle size={10} /> Completed
                          </span>
                        )}
                      </div>
                      {/* Score progress bar */}
                      <div className="w-24">
                        <div className="w-full bg-[#0d0d1a] rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${assignment.myRank.bestScore >= 80 ? 'bg-[#3fb950]' :
                              assignment.myRank.bestScore >= 50 ? 'bg-[#f0a500]' : 'bg-[#f85149]'
                              }`}
                            style={{ width: `${assignment.myRank.bestScore}%` }}
                          />
                        </div>
                        <p className="text-[9px] text-[#555] mt-1 text-center">{assignment.myRank.bestScore}% score</p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[#2a2a4a] p-8 text-center">
                      <FiZap size={36} className="mx-auto mb-2 text-[#444]" />
                      <p className="text-sm font-semibold text-white mb-1">You haven&apos;t submitted yet</p>
                      <p className="text-xs text-[#555]">Submit your code to appear on the leaderboard!</p>
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
    <div className={`bg-[#1a1a2e] border rounded-xl overflow-hidden flex flex-col transition-colors ${isCompleted ? 'border-[#3fb950]/40' : 'border-[#2a2a4a]'
      }`}>
      {a.referenceScreenshotUrl && (
        <div className="relative">
          <img
            src={a.referenceScreenshotUrl}
            alt={a.title}
            className="w-full h-36 object-cover object-top border-b border-[#2a2a4a]"
          />
          {/* Completion / progress badge overlay */}
          {isCompleted ? (
            <span className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-[#3fb950]/20 border border-[#3fb950]/50 text-[#3fb950] text-[10px] font-bold rounded-full backdrop-blur-sm">
              <span className="inline-flex items-center gap-1"><MdCheckCircle size={12} /> Completed</span>
            </span>
          ) : hasTried ? (
            <span className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-[#f0a500]/10 border border-[#f0a500]/40 text-[#f0a500] text-[10px] font-bold rounded-full backdrop-blur-sm">
              Best: {p.bestScore}/100
            </span>
          ) : null}
        </div>
      )}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-white text-sm">{a.title}</h3>
          {/* Badge when no screenshot */}
          {!a.referenceScreenshotUrl && isCompleted && (
            <span className="inline-flex items-center gap-1 shrink-0 text-[10px] font-bold px-2 py-0.5 bg-[#3fb950]/10 border border-[#3fb950]/40 text-[#3fb950] rounded-full">
              <MdCheckCircle size={10} /> Completed
            </span>
          )}
          {!a.referenceScreenshotUrl && !isCompleted && hasTried && (
            <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 bg-[#f0a500]/10 border border-[#f0a500]/30 text-[#f0a500] rounded-full">{p.bestScore}/100</span>
          )}
        </div>
        {a.description && <p className="text-xs text-[#666] mb-3 flex-1">{a.description}</p>}
        {hasTried && (
          <p className="text-[10px] text-[#555] mb-2">{p.attempts} attempt{p.attempts !== 1 ? 's' : ''} · Best score: <span className={isCompleted ? 'text-[#3fb950]' : 'text-[#f0a500]'}>{p.bestScore}/100</span></p>
        )}
        <button
          onClick={() => onStart(a)}
          className={`mt-auto w-full py-2 text-xs font-semibold rounded-lg transition-colors ${isCompleted
            ? 'bg-[#3fb950]/20 text-[#3fb950] border border-[#3fb950]/40 hover:bg-[#3fb950]/30'
            : 'bg-[#2f80ed] text-white hover:bg-[#1a6cda]'
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
  const [view, setView] = useState('list'); // 'list' | 'editor' | 'leaderboard'
  const [assignments, setAssignments] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [progress, setProgress] = useState({});

  // Submission state
  const [files, setFiles] = useState({ html: '', css: '', js: '' });
  const [submissionId, setSubmissionId] = useState(null);
  const [status, setStatus] = useState(null);
  const [result, setResult] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [loadingCode, setLoadingCode] = useState(false);  // fetching best submission code
  const [codePrefilled, setCodePrefilled] = useState(false); // true when editor has prev best code

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
    setFiles({ html: '', css: '', js: '' });
    setSubmissionId(null);
    setStatus(null);
    setResult(null);
    setSubmitError('');
    setCodePrefilled(false);

    // If the student has a previous best submission, load that code into the editor
    const p = progress[assignment._id];
    if (p?.attempts > 0) {
      setLoadingCode(true);
      try {
        const bestCode = await getBestCode(assignment._id);
        if (bestCode.html || bestCode.css || bestCode.js) {
          setFiles(bestCode);
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
    setSubmitError('');
    setResult(null);
    setSubmissionId(null);
    setStatus('pending');
    try {
      const { submissionId: id } = await submitCode({ ...files, assignmentId: selectedAssignment._id });
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
        // Refresh progress badges after evaluation completes
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
        }
      } catch { /* ignore, keep polling */ }
    }, 3000);

    return () => {
      socket.off('evaluation:complete', handler);
      clearInterval(poll);
    };
  }, [submissionId]);

  const handleFileChange = useCallback((tab, val) => {
    setFiles(f => ({ ...f, [tab]: val }));
  }, []);

  const isEvaluating = status === 'pending' || status === 'processing';
  const activeView = selectedAssignment ? 'editor' : view;

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-[#e0e0e0] flex">

      {/* ── LEFT SIDEBAR ── */}
      <aside className="w-56 shrink-0 bg-[#0d0d1a] border-r border-[#2a2a4a] flex flex-col min-h-screen sticky top-0 h-screen">
        {/* Brand */}
        <div className="px-5 py-5 border-b border-[#2a2a4a]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2f80ed]/30 to-[#4e9af1]/10 border border-[#2f80ed]/30 flex items-center justify-center">
              <FiCode size={14} className="text-[#4e9af1]" />
            </div>
            <div>
              <p className="text-white text-sm font-bold leading-tight">Student</p>
              <p className="text-[#444] text-[10px] truncate max-w-[100px]">{user?.name}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {[
            { id: 'list', icon: FiList, label: 'Assignments' },
            { id: 'leaderboard', icon: FiBarChart2, label: 'Leaderboard' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => { setSelectedAssignment(null); setView(item.id); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${activeView === item.id
                ? 'bg-[#2f80ed]/10 text-[#4e9af1] border border-[#2f80ed]/25'
                : 'text-[#666] hover:text-[#bbb] hover:bg-[#1a1a2e]'
                }`}
            >
              <item.icon size={16} />
              {item.label}
              {activeView === item.id && <FiChevronRight size={12} className="ml-auto" />}
            </button>
          ))}

          {/* Shown when inside a specific assignment */}
          {selectedAssignment && (
            <>
              <div className="border-t border-[#2a2a4a] my-2" />
              <div className="px-3 py-2">
                <p className="text-[10px] text-[#444] font-semibold uppercase tracking-wider mb-1.5">Current</p>
                <p className="text-xs text-[#888] font-medium leading-snug line-clamp-2">{selectedAssignment.title}</p>
              </div>
              <button
                onClick={() => setSelectedAssignment(null)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#666] hover:text-[#4e9af1] hover:bg-[#4e9af1]/10 transition-all"
              >
                <FiArrowLeft size={16} />
                All Assignments
              </button>
            </>
          )}
        </nav>

        {/* Sign out */}
        <div className="px-3 pb-5">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#666] hover:text-[#f85149] hover:bg-[#f85149]/10 transition-all"
          >
            <FiLogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <header className="bg-[#0d0d1a] border-b border-[#2a2a4a] px-8 py-3 sticky top-0 z-10">
          <h1 className="font-bold text-white text-sm">
            {selectedAssignment ? selectedAssignment.title
              : view === 'leaderboard' ? 'Leaderboard'
                : 'Available Assignments'}
          </h1>
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
            <p className="text-sm text-[#666] mb-6">Pick an assignment and submit your code for evaluation.</p>
            {loadingList ? (
              <div className="flex justify-center py-20">
                <div className="w-9 h-9 rounded-full border-[3px] border-[#2a2a4a] border-t-[#4e9af1] animate-spin" />
              </div>
            ) : assignments.length === 0 ? (
              <p className="text-[#555] text-center py-20">No assignments available yet.</p>
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
        {selectedAssignment && (
          <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            {/* Editor column */}
            <section className="flex flex-col md:w-[55%] border-b md:border-b-0 md:border-r border-[#2a2a4a] h-[55vh] md:h-auto">
              <div className="px-4 py-3 bg-[#1a1a2e] border-b border-[#2a2a4a] shrink-0">
                <p className="text-xs text-[#666]">Assignment</p>
                <h3 className="text-sm font-semibold text-white">{selectedAssignment.title}</h3>
                {selectedAssignment.description && (
                  <p className="text-xs text-[#555] mt-0.5">{selectedAssignment.description}</p>
                )}
              </div>

              {loadingCode ? (
                <div className="flex-1 flex items-center justify-center bg-[#0d0d1a]">
                  <div className="flex flex-col items-center gap-3 text-[#555]">
                    <div className="w-6 h-6 rounded-full border-2 border-[#2a2a4a] border-t-[#4e9af1] animate-spin" />
                    <p className="text-xs">Loading your best submission…</p>
                  </div>
                </div>
              ) : (
                <>
                  {codePrefilled && (
                    <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-[#3fb950]/10 border-b border-[#3fb950]/20">
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-[#3fb950]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        <span className="text-xs text-[#3fb950] font-semibold">Loaded from your best submission — edit and resubmit to improve your score</span>
                      </div>
                      <button onClick={() => setCodePrefilled(false)} className="text-[#3fb950]/60 hover:text-[#3fb950] text-xs">✕</button>
                    </div>
                  )}
                  <CodeEditor files={files} onChange={handleFileChange} />
                </>
              )}

              <div className="shrink-0 px-3 py-2 bg-[#0f0f1a]">
                <button
                  onClick={handleSubmit}
                  disabled={isEvaluating || loadingCode}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-md text-sm font-semibold transition-colors bg-[#2f80ed] text-white hover:bg-[#1a6cda] disabled:bg-[#2a2a4a] disabled:text-[#555] disabled:cursor-not-allowed"
                >
                  {isEvaluating ? 'Evaluating…' : 'Submit for Evaluation'}
                </button>
                {submitError && <p className="mt-1.5 text-xs text-[#f85149]">{submitError}</p>}
              </div>
            </section>

            {/* Results column */}
            <section className="flex-1 overflow-y-auto p-4">
              {status ? (
                <ResultsPanel status={status} result={result} />
              ) : (
                <div className="flex items-center justify-center h-full text-[#555] text-sm text-center px-4">
                  <p>Your evaluation results will appear here after submission.</p>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
