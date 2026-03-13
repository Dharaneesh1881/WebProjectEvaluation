import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { CodeEditor } from '../components/CodeEditor.jsx';
import { ResultsPanel } from '../components/ResultsPanel.jsx';
import { AnalyticsView } from '../components/AnalyticsView.jsx';
import { getAssignments, createAssignment, getAssignmentSubmissions, updateAssignmentTests, deleteAssignment, getLeaderboard, getTeacherStudentSubmission } from '../api/index.js';
import { FiAward, FiRefreshCw, FiBookOpen, FiPlus, FiLogOut, FiChevronRight, FiBarChart2, FiList, FiPieChart, FiSun, FiMoon } from 'react-icons/fi';
import { MdCheckCircle } from 'react-icons/md';

function AssignmentCard({ a, onViewSubmissions, onEditTests, onDelete, deletingId }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isDeleting = deletingId === a._id;

  return (
    <div className={`bg-[var(--bg-surface-alt)] border rounded-xl overflow-hidden transition-all duration-200 ${isDeleting ? 'border-[#f85149]/50 opacity-60' : 'border-[var(--border-color)]'
      }`}>
      {a.referenceScreenshotUrl && (
        <div className="relative">
          <img
            src={a.referenceScreenshotUrl}
            alt={a.title}
            className="w-full h-32 object-cover object-top border-b border-[var(--border-color)]"
          />
          {/* Trash icon top-right */}
          {!confirmDelete && !isDeleting && (
            <button
              onClick={() => setConfirmDelete(true)}
              title="Delete assignment"
              className="absolute top-2 right-2 p-1.5 rounded-lg bg-[var(--bg-surface)]/80 text-[#f85149] hover:bg-[#f85149]/20 transition-colors backdrop-blur-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </button>
          )}
        </div>
      )}
      <div className="p-4">
        {/* Title row with trash icon (when no screenshot) */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-semibold text-[var(--text-strong)] text-sm">{a.title}</h3>
          {!a.referenceScreenshotUrl && !confirmDelete && !isDeleting && (
            <button
              onClick={() => setConfirmDelete(true)}
              title="Delete assignment"
              className="shrink-0 p-1 rounded-lg text-[var(--text-faint)] hover:text-[#f85149] hover:bg-[#f85149]/10 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </button>
          )}
        </div>

        {a.description && <p className="text-xs text-[var(--text-faint)] mb-3 line-clamp-2">{a.description}</p>}

        {/* Confirm delete banner */}
        {confirmDelete ? (
          <div className="mt-3 p-3 bg-[#f85149]/10 border border-[#f85149]/30 rounded-lg">
            <p className="text-xs text-[#f85149] font-semibold mb-1">Delete this assignment?</p>
            <p className="text-[10px] text-[var(--text-muted)] mb-3">All student submissions and evaluation data will be permanently removed.</p>
            <div className="flex gap-2">
              <button
                onClick={() => { onDelete(a._id); setConfirmDelete(false); }}
                disabled={isDeleting}
                className="flex-1 py-1.5 text-xs font-bold bg-[#f85149] text-[var(--text-strong)] rounded-lg hover:bg-[#e03131] transition-colors disabled:opacity-50"
              >
                {isDeleting ? 'Deleting…' : 'Yes, delete'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-1.5 text-xs font-semibold bg-[var(--bg-surface-alt)] text-[var(--text-muted)] border border-[var(--border-color)] rounded-lg hover:border-[var(--text-faintest)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => onViewSubmissions(a)}
              disabled={isDeleting}
              className="flex-1 py-1.5 text-xs font-semibold bg-[#2f80ed] text-[var(--text-strong)] rounded-lg hover:bg-[#1a6cda] transition-colors disabled:opacity-40"
            >
              View Submissions
            </button>
            <button
              onClick={() => onEditTests(a)}
              disabled={isDeleting}
              className="flex-1 py-1.5 text-xs font-semibold bg-[var(--bg-surface-alt)] text-[#4e9af1] border border-[#4e9af1]/40 rounded-lg hover:border-[#4e9af1] transition-colors disabled:opacity-40"
            >
              Edit Tests
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const EDIT_TESTS_PLACEHOLDER = `{
  "functionalityTests": [
    {
      "id": "fn-1",
      "name": "Counter increases on Add Task",
      "marks": 10,
      "steps": [
        { "action": "read",  "selector": "#counter",   "saveAs": "before" },
        { "action": "type",  "selector": "#taskInput", "value": "Learn JS" },
        { "action": "click", "selector": "#increment" },
        { "action": "read",  "selector": "#counter",   "saveAs": "after" }
      ],
      "assert": { "type": "incrementedBy", "from": "before", "to": "after", "by": 1 },
      "failHint": "Clicking Add Task should increase #counter by 1."
    }
  ],
  "interactionTests": [
    {
      "name": "Add Task button is clickable",
      "weight": 5,
      "steps": [
        { "action": "type",  "selector": "#taskInput", "value": "Test" },
        { "action": "click", "selector": "#increment" }
      ],
      "assert": { "type": "countEquals", "selector": "#taskList li", "value": 1 }
    }
  ]
}`;

function EditTestsView({ assignment, onBack }) {
  const [json, setJson] = useState('');
  const [jsonError, setJsonError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(null);
  const [saveError, setSaveError] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    if (!json.trim()) { setJsonError('Paste the JSON object before saving.'); return; }

    let parsed;
    try {
      parsed = JSON.parse(json.trim());
      setJsonError('');
    } catch {
      setJsonError('Invalid JSON — check your syntax.');
      return;
    }

    const payload = {};
    if (Array.isArray(parsed.functionalityTests)) payload.functionalityTests = parsed.functionalityTests;
    if (Array.isArray(parsed.interactionTests)) payload.interactionTests = parsed.interactionTests;

    if (!Object.keys(payload).length) {
      setJsonError('JSON must have "functionalityTests" and/or "interactionTests" arrays.');
      return;
    }

    setSaving(true); setSaveError('');
    try {
      const result = await updateAssignmentTests(assignment._id, payload);
      setSaved(result);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <button onClick={onBack} className="text-[#4e9af1] text-sm hover:underline mb-4 flex items-center gap-1">← Back</button>
      <h2 className="text-lg font-bold text-[var(--text-strong)] mb-1">Edit Tests — {assignment.title}</h2>
      <p className="text-sm text-[var(--text-faint)] mb-6">
        Paste a JSON object with <code className="text-[#4e9af1]">functionalityTests</code> and/or <code className="text-[#4e9af1]">interactionTests</code> arrays.
      </p>

      {saved ? (
        <div className="bg-[var(--bg-surface-alt)] border border-[#3fb950]/40 rounded-xl p-6">
          <p className="text-[#3fb950] font-semibold text-sm mb-2">Tests updated!</p>
          <p className="text-sm text-[var(--text-muted)]">Functionality tests saved: <span className="text-[var(--text-strong)] font-bold">{saved.functionalityTests}</span></p>
          <p className="text-sm text-[var(--text-muted)]">Interaction tests saved: <span className="text-[var(--text-strong)] font-bold">{saved.interactionTests}</span></p>
          <button onClick={onBack} className="mt-4 px-4 py-2 text-sm font-semibold bg-[#2f80ed] text-[var(--text-strong)] rounded-lg hover:bg-[#1a6cda]">Done</button>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
              Tests JSON — <span className="text-[var(--text-faint)] font-normal">object with functionalityTests (40 marks) and interactionTests (15 marks)</span>
            </label>
            <textarea
              rows={20} value={json}
              onChange={e => { setJson(e.target.value); setJsonError(''); }}
              placeholder={EDIT_TESTS_PLACEHOLDER}
              className="w-full px-3 py-2.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-xs text-[var(--text-muted)] font-mono placeholder:text-[var(--border-color)] focus:outline-none focus:border-[#4e9af1] resize-y"
              spellCheck={false}
            />
            {jsonError && <p className="text-xs text-[#f85149] mt-1">{jsonError}</p>}
          </div>

          {saveError && <p className="text-xs text-[#f85149]">{saveError}</p>}
          <button
            type="submit" disabled={saving}
            className="px-6 py-2.5 bg-[#2f80ed] text-[var(--text-strong)] text-sm font-semibold rounded-lg hover:bg-[#1a6cda] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving…' : 'Save Tests'}
          </button>
        </form>
      )}
    </div>
  );
}

function LeaderboardView({ onBack, onStudentClick }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  const fetchData = () => {
    setLoading(true);
    getLeaderboard()
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, []);

  const assignment = data[activeTab];

  const medalColor = (rank) =>
    rank === 1 ? '#f0c040' :
      rank === 2 ? '#b0b8c8' :
        rank === 3 ? '#cd7f32' : '#555';

  const MedalIcon = ({ rank }) => (
    rank <= 3
      ? <FiAward size={18} style={{ color: medalColor(rank) }} />
      : <span className="text-xs font-bold text-[var(--text-faint)]">#{rank}</span>
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-[#4e9af1] text-sm hover:underline">← Back</button>
        <h2 className="text-xl font-bold text-[var(--text-strong)]">Student Leaderboard</h2>
        <button onClick={fetchData} className="ml-auto text-xs text-[var(--text-faint)] hover:text-[var(--text-muted)] border border-[var(--border-color)] rounded px-2 py-1 transition-colors">↻ Refresh</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-9 h-9 rounded-full border-[3px] border-[var(--border-color)] border-t-[#4e9af1] animate-spin" />
        </div>
      ) : data.length === 0 ? (
        <p className="text-[var(--text-faint)] text-center py-20">No assignment data yet. Students need to submit first.</p>
      ) : (
        <>
          {/* Assignment tabs */}
          <div className="flex gap-2 flex-wrap mb-6">
            {data.map((a, i) => (
              <button
                key={a.assignmentId}
                onClick={() => setActiveTab(i)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${activeTab === i
                  ? 'bg-[#2f80ed]/20 border-[#4e9af1] text-[#4e9af1]'
                  : 'bg-[var(--bg-surface-alt)] border-[var(--border-color)] text-[var(--text-faint)] hover:border-[var(--text-faintest)] hover:text-[#bbb]'
                  }`}
              >
                {a.title}
                {a.completedCount > 0 && (
                  <span className={`ml-2 text-xs font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 ${activeTab === i ? 'bg-[#3fb950]/20 text-[#3fb950]' : 'bg-[var(--bg-surface-alt)] text-[var(--text-faint)]'
                    }`}>
                    {a.completedCount} <MdCheckCircle size={10} />
                  </span>
                )}
              </button>
            ))}
          </div>

          {assignment && (
            <>
              {/* Assignment stats bar */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { label: 'Students', value: assignment.totalStudents, color: 'text-[var(--text-strong)]' },
                  { label: 'Completed', value: `${assignment.completedCount} / ${assignment.totalStudents}`, color: 'text-[#3fb950]' },
                  { label: 'Avg Score', value: `${assignment.avgScore}/100`, color: assignment.avgScore >= 50 ? 'text-[#3fb950]' : assignment.avgScore >= 30 ? 'text-[#f0a500]' : 'text-[#f85149]' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-[var(--bg-surface-alt)] border border-[var(--border-color)] rounded-xl p-4 text-center">
                    <p className={`text-xl font-bold ${color}`}>{value}</p>
                    <p className="text-xs text-[var(--text-faint)] mt-1">{label}</p>
                  </div>
                ))}
              </div>

              {/* Ranked table */}
              {assignment.students.length === 0 ? (
                <p className="text-[var(--text-faint)] text-sm text-center py-12">No submissions yet for this assignment.</p>
              ) : (
                <div className="bg-[var(--bg-surface-alt)] border border-[var(--border-color)] rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border-color)] text-left text-xs text-[var(--text-faint)]">
                        <th className="pb-3 pt-3 px-4 font-semibold w-12">Rank</th>
                        <th className="pb-3 pt-3 px-4 font-semibold">Student</th>
                        <th className="pb-3 pt-3 px-4 font-semibold">Status</th>
                        <th className="pb-3 pt-3 px-4 font-semibold">Attempts</th>
                        <th className="pb-3 pt-3 px-4 font-semibold">Best Score</th>
                        <th className="pb-3 pt-3 px-4 font-semibold w-40">Score Bar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignment.students.map((s) => (
                        <tr
                          key={s.studentId}
                          onClick={() => onStudentClick(assignment.assignmentId, s.studentId, 'leaderboard')}
                          className="border-b border-[#111122] hover:bg-[var(--bg-surface-alt)] transition-colors cursor-pointer group"
                        >
                          {/* Rank */}
                          <td className="py-3 px-4 font-bold text-base">
                            <MedalIcon rank={s.rank} />
                          </td>
                          {/* Student name + email */}
                          <td className="py-3 px-4">
                            <p className="font-semibold text-[var(--text-strong)] text-sm">{s.name}</p>
                            <p className="text-[10px] text-[var(--text-faint)]">{s.email}</p>
                          </td>
                          {/* Completed badge */}
                          <td className="py-3 px-4">
                            {s.completed ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-[#3fb950]/10 border border-[#3fb950]/30 text-[#3fb950] rounded-full">
                                <MdCheckCircle size={10} /> Done
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-[var(--border-color)] text-[var(--text-faint)] rounded-full">In progress</span>
                            )}
                          </td>
                          {/* Attempts */}
                          <td className="py-3 px-4 text-[var(--text-muted)] text-xs">{s.attempts}</td>
                          {/* Score number */}
                          <td className={`py-3 px-4 font-bold text-sm ${s.bestScore >= 80 ? 'text-[#3fb950]' :
                            s.bestScore >= 50 ? 'text-[#f0a500]' : 'text-[#f85149]'
                            }`}>{s.bestScore}/100</td>
                          {/* Score bar */}
                          <td className="py-3 px-4">
                            <div className="w-full bg-[var(--bg-surface)] rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${s.bestScore >= 80 ? 'bg-[#3fb950]' :
                                  s.bestScore >= 50 ? 'bg-[#f0a500]' : 'bg-[#f85149]'
                                  }`}
                                style={{ width: `${s.bestScore}%` }}
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function SubmissionsView({ assignment, onBack, onStudentClick }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAssignmentSubmissions(assignment._id)
      .then(setSubmissions)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [assignment._id]);

  return (
    <div>
      <button onClick={onBack} className="text-[#4e9af1] text-sm hover:underline mb-4 flex items-center gap-1">
        ← Back
      </button>
      <h2 className="text-lg font-bold text-[var(--text-strong)] mb-1">{assignment.title}</h2>
      <p className="text-sm text-[var(--text-faint)] mb-6">Student submissions</p>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--border-color)] border-t-[#4e9af1] animate-spin" />
        </div>
      ) : submissions.length === 0 ? (
        <p className="text-[var(--text-faint)] text-sm text-center py-12">No submissions yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-color)] text-left text-xs text-[var(--text-faint)]">
                <th className="pb-2 pr-4 font-semibold">Student ID</th>
                <th className="pb-2 pr-4 font-semibold">Completed</th>
                <th className="pb-2 pr-4 font-semibold">Attempts</th>
                <th className="pb-2 pr-4 font-semibold">Best Score</th>
                <th className="pb-2 pr-4 font-semibold">Linter/10</th>
                <th className="pb-2 pr-4 font-semibold">Func/40</th>
                <th className="pb-2 pr-4 font-semibold">Interact/15</th>
                <th className="pb-2 pr-4 font-semibold">Visual/20</th>
                <th className="pb-2 font-semibold">Perf/15</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map(s => {
                const r = s.result;
                const scoreColor = s.bestScore >= 80 ? 'text-[#3fb950]' : s.bestScore >= 50 ? 'text-[#f0a500]' : 'text-[#f85149]';
                return (
                  <tr
                    key={s.submissionId ?? s.studentId}
                    onClick={() => onStudentClick(assignment._id, s.studentId, 'submissions')}
                    className="border-b border-[var(--bg-surface-alt)] hover:bg-[#202035] transition-colors cursor-pointer group"
                  >
                    <td className="py-2 pr-4 text-[var(--text-muted)] font-mono text-xs">{s.studentId?.slice(0, 8)}…</td>
                    <td className="py-2 pr-4">
                      {s.completed ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-[#3fb950]/10 text-[#3fb950]">
                          <MdCheckCircle size={12} /> Done
                        </span>
                      ) : (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--border-color)] text-[var(--text-faint)]">In progress</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-[var(--text-muted)] text-xs">{s.attempts ?? 1}</td>
                    <td className={`py-2 pr-4 font-bold ${scoreColor}`}>{s.bestScore ?? r?.totalScore ?? '—'}/100</td>
                    <td className="py-2 pr-4 text-[var(--text-muted)]">{r ? `${r.breakdown.linter?.score ?? '—'}` : '—'}</td>
                    <td className="py-2 pr-4 text-[var(--text-muted)]">{r ? `${r.breakdown.functionality?.score ?? '—'}` : '—'}</td>
                    <td className="py-2 pr-4 text-[var(--text-muted)]">{r ? `${r.breakdown.interaction?.score ?? '—'}` : '—'}</td>
                    <td className="py-2 pr-4 text-[var(--text-muted)]">{r ? `${r.breakdown.visual?.score ?? '—'}` : '—'}</td>
                    <td className="py-2 text-[var(--text-muted)]">{r ? `${r.breakdown.performance?.score ?? '—'}` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StudentDetailView({ assignmentId, studentId, onBack }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getTeacherStudentSubmission(assignmentId, studentId)
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message || 'Failed to load code & score'); setLoading(false); });
  }, [assignmentId, studentId]);

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 rounded-full border-2 border-[var(--border-color)] border-t-[#4e9af1] animate-spin" />
    </div>
  );
  if (error) return (
    <div className="py-20 text-center">
      <p className="text-[#f85149] mb-4">{error}</p>
      <button onClick={onBack} className="text-[#4e9af1] text-sm hover:underline">← Go Back</button>
    </div>
  );
  if (!data) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] -mt-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 shrink-0 px-2">
        <button onClick={onBack} className="text-[#4e9af1] text-sm hover:underline shrink-0">← Back</button>
        <div>
          <h2 className="text-xl font-bold text-[var(--text-strong)] leading-tight">
            {data.student?.name || 'Student'}&apos;s Submission
            {data.completed ? (
              <span className="ml-3 align-middle inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-[#3fb950]/10 border border-[#3fb950]/30 text-[#3fb950] rounded-full">
                <MdCheckCircle size={10} /> Done
              </span>
            ) : (
              <span className="ml-3 align-middle text-[10px] font-bold px-2 py-0.5 bg-[var(--border-color)] text-[var(--text-faint)] rounded-full">In progress</span>
            )}
          </h2>
          <p className="text-xs text-[var(--text-muted)]">{data.student?.email || studentId}</p>
        </div>
      </div>

      {/* Two Pane Split */}
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden border border-[var(--border-color)] rounded-xl bg-[var(--bg-base)] shadow-lg">
        {/* Left: Code */}
        <section className="flex flex-col md:w-[50%] border-b md:border-b-0 md:border-r border-[var(--border-color)] bg-[var(--bg-surface)]">
          <div className="px-4 py-3 bg-[var(--bg-surface-alt)] border-b border-[var(--border-color)] flex justify-between items-center text-xs shrink-0">
            <span className="font-semibold text-[var(--text-strong)]">Submitted Code</span>
            <span className="text-[var(--text-muted)] font-mono">Attempts: {data.attempts ?? 1}</span>
          </div>
          <CodeEditor files={data.files} readOnly={true} />
        </section>

        {/* Right: Results Panel */}
        <section className="flex-1 overflow-y-auto p-4 bg-[var(--bg-surface)] custom-scrollbar">
          {data.result ? (
            <ResultsPanel status="done" result={data.result} />
          ) : (
            <div className="text-center py-16 text-[var(--text-faint)]">
              <FiRefreshCw size={36} className="mx-auto mb-3 text-[var(--text-faintest)]" />
              <p className="text-sm">No evaluation result found for this submission.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function TeacherDashboard() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [view, setView] = useState('list'); // 'list' | 'create' | 'submissions' | 'editTests' | 'leaderboard' | 'studentDetail'
  const [historyView, setHistoryView] = useState('list');
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  // Create form state
  const [form, setForm] = useState({ title: '', description: '' });
  const [files, setFiles] = useState({ html: '', css: '', js: '' });
  const [testsJson, setTestsJson] = useState('');
  const [testsJsonError, setTestsJsonError] = useState('');
  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState(null);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    if (view === 'list') {
      setLoading(true);
      getAssignments()
        .then(setAssignments)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [view]);

  const handleDelete = async (assignmentId) => {
    setDeletingId(assignmentId);
    try {
      await deleteAssignment(assignmentId);
      setAssignments(prev => prev.filter(a => a._id !== assignmentId));
    } catch (err) {
      console.error('Delete failed:', err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title || !files.html) {
      setCreateError('Title and HTML are required.');
      return;
    }

    // Parse tests JSON if provided
    let functionalityTests = [];
    let interactionTests = [];
    if (testsJson.trim()) {
      try {
        const parsed = JSON.parse(testsJson.trim());
        functionalityTests = Array.isArray(parsed.functionalityTests) ? parsed.functionalityTests : [];
        interactionTests = Array.isArray(parsed.interactionTests) ? parsed.interactionTests : [];
        setTestsJsonError('');
      } catch {
        setTestsJsonError('Invalid JSON — check the tests format.');
        return;
      }
    }

    setCreateError('');
    setCreating(true);
    try {
      const result = await createAssignment({ ...form, ...files, functionalityTests, interactionTests });
      setCreateResult(result);
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleStudentClick = (assignmentId, studentId, fromView) => {
    setSelectedStudentId(studentId);
    setSelectedAssignmentId(assignmentId);
    setHistoryView(fromView);
    setView('studentDetail');
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-main)] flex">

      {/* ── LEFT SIDEBAR ── */}
      <aside className="w-56 shrink-0 bg-[var(--bg-surface)] border-r border-[var(--border-color)] flex flex-col min-h-screen sticky top-0 h-screen">
        {/* Logo / Brand */}
        <div className="px-5 py-5 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2f80ed]/30 to-[#4e9af1]/10 border border-[#2f80ed]/30 flex items-center justify-center">
              <FiBookOpen size={14} className="text-[#4e9af1]" />
            </div>
            <div>
              <p className="text-[var(--text-strong)] text-sm font-bold leading-tight">Teacher</p>
              <p className="text-[var(--text-faintest)] text-[10px] truncate max-w-[100px]">{user?.name}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {[
            { id: 'list', icon: FiList, label: 'Assignments' },
            { id: 'leaderboard', icon: FiBarChart2, label: 'Leaderboard' },
            { id: 'analytics', icon: FiPieChart, label: 'Analytics' },
            { id: 'create', icon: FiPlus, label: 'New Assignment' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'create') {
                  setView('create');
                  setCreateResult(null); setCreateError('');
                  setForm({ title: '', description: '' });
                  setFiles({ html: '', css: '', js: '' });
                  setTestsJson(''); setTestsJsonError('');
                } else {
                  setView(item.id);
                }
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${view === item.id
                ? 'bg-[#2f80ed]/10 text-[#4e9af1] border border-[#2f80ed]/25'
                : 'text-[var(--text-faint)] hover:text-[#bbb] hover:bg-[var(--bg-surface-alt)]'
                }`}
            >
              <item.icon size={16} />
              {item.label}
              {view === item.id && <FiChevronRight size={12} className="ml-auto" />}
            </button>
          ))}
        </nav>

        {/* Sign out */}
        <div className="px-3 pb-5">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[var(--text-faint)] hover:text-[#f85149] hover:bg-[#f85149]/10 transition-all"
          >
            <FiLogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar — context title only */}
        <header className="bg-[var(--bg-surface)] border-b border-[var(--border-color)] px-8 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <h1 className="font-bold text-[var(--text-strong)] text-sm capitalize">
              {view === 'list' ? 'Assignments' :
                view === 'create' ? 'New Assignment' :
                  view === 'leaderboard' ? 'Leaderboard' :
                    view === 'analytics' ? 'Analytics' :
                      view === 'submissions' ? `Submissions — ${selectedAssignment?.title}` :
                        view === 'editTests' ? `Edit Tests — ${selectedAssignment?.title}` :
                          view === 'studentDetail' ? 'Student Submission' : view}
            </h1>
          </div>
          <button
            onClick={toggleTheme}
            className="w-8 h-8 rounded-lg bg-[var(--bg-base)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-strong)] flex items-center justify-center transition-colors"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <FiSun size={14} /> : <FiMoon size={14} />}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto">
          {/* full-height views (no padding wrapper) */}
          {view === 'studentDetail' && selectedAssignmentId && selectedStudentId ? (
            <div className="px-8 py-8">
              <StudentDetailView
                assignmentId={selectedAssignmentId}
                studentId={selectedStudentId}
                onBack={() => setView(historyView)}
              />
            </div>
          ) : (
            <div className="px-8 py-8">

              {/* ── ANALYTICS VIEW ── */}
              {view === 'analytics' && (
                <AnalyticsView onBack={() => setView('list')} />
              )}

              {/* ── LEADERBOARD VIEW ── */}
              {view === 'leaderboard' && (
                <LeaderboardView onBack={() => setView('list')} onStudentClick={handleStudentClick} />
              )}

              {/* ── SUBMISSIONS VIEW ── */}
              {view === 'submissions' && selectedAssignment && (
                <SubmissionsView assignment={selectedAssignment} onBack={() => setView('list')} onStudentClick={handleStudentClick} />
              )}

              {/* ── EDIT TESTS VIEW ── */}
              {view === 'editTests' && selectedAssignment && (
                <EditTestsView assignment={selectedAssignment} onBack={() => setView('list')} />
              )}

              {/* ── LIST VIEW ── */}
              {view === 'list' && (
                <>
                  <h2 className="text-xl font-bold text-[var(--text-strong)] mb-6">Your Assignments</h2>
                  {loading ? (
                    <div className="flex justify-center py-20">
                      <div className="w-9 h-9 rounded-full border-[3px] border-[var(--border-color)] border-t-[#4e9af1] animate-spin" />
                    </div>
                  ) : assignments.length === 0 ? (
                    <div className="text-center py-20 text-[var(--text-faint)]">
                      <p className="text-lg mb-2">No assignments yet.</p>
                      <p className="text-sm">Click &quot;New Assignment&quot; in the sidebar to create your first one.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {assignments.map(a => (
                        <AssignmentCard
                          key={a._id}
                          a={a}
                          onViewSubmissions={(assignment) => { setSelectedAssignment(assignment); setView('submissions'); }}
                          onEditTests={(assignment) => { setSelectedAssignment(assignment); setView('editTests'); }}
                          onDelete={handleDelete}
                          deletingId={deletingId}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ── CREATE VIEW ── */}
              {view === 'create' && (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => setView('list')} className="text-[#4e9af1] text-sm hover:underline">← Back</button>
                    <h2 className="text-xl font-bold text-[var(--text-strong)]">Create Assignment</h2>
                  </div>

                  {createResult ? (
                    <div className="bg-[var(--bg-surface-alt)] border border-[#3fb950]/40 rounded-xl p-6">
                      <p className="text-[#3fb950] font-semibold text-sm mb-3">Assignment created successfully!</p>
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {[
                          ['DOM tests (auto)', createResult.testsGenerated?.dom],
                          ['Style tests (auto)', createResult.testsGenerated?.style],
                          ['Functionality tests', createResult.testsGenerated?.functionality],
                          ['Interaction tests', createResult.testsGenerated?.interaction],
                        ].map(([label, val]) => (
                          <p key={label} className="text-sm text-[var(--text-muted)]">
                            {label}: <span className="text-[var(--text-strong)] font-semibold">{val ?? 0}</span>
                          </p>
                        ))}
                      </div>
                      {createResult.referenceScreenshotUrl && (
                        <div>
                          <p className="text-xs text-[var(--text-faint)] mb-2">Reference screenshot:</p>
                          <img src={createResult.referenceScreenshotUrl} alt="Reference" className="w-full max-w-md rounded-lg border border-[var(--border-color)]" />
                        </div>
                      )}
                      <button onClick={() => setView('list')} className="mt-4 px-4 py-2 text-sm font-semibold bg-[#2f80ed] text-[var(--text-strong)] rounded-lg hover:bg-[#1a6cda]">
                        View all assignments
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleCreate} className="space-y-4">
                      {/* Title — full width */}
                      <div>
                        <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Assignment title *</label>
                        <input
                          type="text"
                          required
                          value={form.title}
                          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                          className="w-full px-3 py-2.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-strong)] placeholder:text-[var(--border-light)] focus:outline-none focus:border-[#4e9af1]"
                          placeholder="e.g. Quiz App Recreation"
                        />
                      </div>

                      {/* Description — full width, tall textarea, directly below title */}
                      <div>
                        <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                          Description
                          <span className="ml-1 text-[var(--text-faintest)] font-normal normal-case">— explain the assignment for students</span>
                        </label>
                        <textarea
                          value={form.description}
                          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                          rows={12}
                          className="w-full px-3 py-3 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-sm text-[var(--text-strong)] placeholder:text-[var(--border-light)] focus:outline-none focus:border-[#4e9af1] resize-y leading-relaxed"
                          placeholder={"Describe what students need to build.\n\nExample:\n1. Overview — what the app does\n2. Requirements — specific features expected\n3. Examples — any input/output examples\n4. Notes — constraints or hints"}
                        />
                      </div>


                      <div>
                        <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Reference code *</label>
                        <p className="text-xs text-[var(--text-faint)] mb-2">Paste the original/reference HTML, CSS, and JS. Tests will be auto-generated from this.</p>
                        <div className="h-[400px] flex flex-col border border-[var(--border-color)] rounded-xl overflow-hidden">
                          <CodeEditor files={files} onChange={(tab, val) => setFiles(f => ({ ...f, [tab]: val }))} />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                          Tests JSON — <span className="text-[var(--text-faint)] font-normal">functionalityTests (40 marks) and interactionTests (15 marks)</span>
                        </label>
                        <textarea rows={10} value={testsJson}
                          onChange={e => { setTestsJson(e.target.value); setTestsJsonError(''); }}
                          placeholder={EDIT_TESTS_PLACEHOLDER}
                          className="w-full px-3 py-2.5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-lg text-xs text-[var(--text-muted)] font-mono placeholder:text-[var(--border-color)] focus:outline-none focus:border-[#4e9af1] resize-y"
                          spellCheck={false} />
                        {testsJsonError && <p className="text-xs text-[#f85149] mt-1">{testsJsonError}</p>}
                      </div>

                      {createError && <p className="text-xs text-[#f85149]">{createError}</p>}

                      <button type="submit" disabled={creating}
                        className="px-6 py-2.5 bg-[#2f80ed] text-[var(--text-strong)] text-sm font-semibold rounded-lg hover:bg-[#1a6cda] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        {creating ? 'Creating & capturing screenshot…' : 'Create Assignment'}
                      </button>
                    </form>
                  )}
                </>
              )}

            </div>
          )}
        </main>
      </div>
    </div>
  );
}
