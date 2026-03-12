import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { CodeEditor } from '../components/CodeEditor.jsx';
import { getAssignments, createAssignment, getAssignmentSubmissions } from '../api/index.js';

function AssignmentCard({ a, onViewSubmissions }) {
  return (
    <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl overflow-hidden">
      {a.referenceScreenshotUrl && (
        <img
          src={a.referenceScreenshotUrl}
          alt={a.title}
          className="w-full h-32 object-cover object-top border-b border-[#2a2a4a]"
        />
      )}
      <div className="p-4">
        <h3 className="font-semibold text-white text-sm mb-1">{a.title}</h3>
        {a.description && <p className="text-xs text-[#666] mb-3 line-clamp-2">{a.description}</p>}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => onViewSubmissions(a)}
            className="flex-1 py-1.5 text-xs font-semibold bg-[#2f80ed] text-white rounded-lg hover:bg-[#1a6cda] transition-colors"
          >
            View Submissions
          </button>
        </div>
      </div>
    </div>
  );
}

function SubmissionsView({ assignment, onBack }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading]         = useState(true);

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
      <h2 className="text-lg font-bold text-white mb-1">{assignment.title}</h2>
      <p className="text-sm text-[#666] mb-6">Student submissions</p>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 rounded-full border-2 border-[#2a2a4a] border-t-[#4e9af1] animate-spin" />
        </div>
      ) : submissions.length === 0 ? (
        <p className="text-[#555] text-sm text-center py-12">No submissions yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a4a] text-left text-xs text-[#666]">
                <th className="pb-2 pr-4 font-semibold">Student ID</th>
                <th className="pb-2 pr-4 font-semibold">Status</th>
                <th className="pb-2 pr-4 font-semibold">Score</th>
                <th className="pb-2 pr-4 font-semibold">HTML</th>
                <th className="pb-2 pr-4 font-semibold">CSS</th>
                <th className="pb-2 pr-4 font-semibold">JS</th>
                <th className="pb-2 font-semibold">Visual</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map(s => {
                const r = s.result;
                const scoreColor = r?.totalScore >= 80 ? 'text-[#3fb950]' : r?.totalScore >= 50 ? 'text-[#f0a500]' : 'text-[#f85149]';
                return (
                  <tr key={s.submissionId} className="border-b border-[#1a1a2e] hover:bg-[#1a1a2e]">
                    <td className="py-2 pr-4 text-[#888] font-mono text-xs">{s.studentId?.slice(0, 8)}…</td>
                    <td className="py-2 pr-4">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        s.status === 'done'       ? 'bg-[#3fb950]/10 text-[#3fb950]' :
                        s.status === 'error'      ? 'bg-[#f85149]/10 text-[#f85149]' :
                        s.status === 'processing' ? 'bg-[#f0a500]/10 text-[#f0a500]' :
                        'bg-[#2a2a4a] text-[#666]'
                      }`}>{s.status}</span>
                    </td>
                    <td className={`py-2 pr-4 font-bold ${scoreColor}`}>{r ? `${r.totalScore}/100` : '—'}</td>
                    <td className="py-2 pr-4 text-[#ccc]">{r ? `${r.breakdown.html.score}/${r.breakdown.html.maxScore}` : '—'}</td>
                    <td className="py-2 pr-4 text-[#ccc]">{r ? `${r.breakdown.css.score}/${r.breakdown.css.maxScore}` : '—'}</td>
                    <td className="py-2 pr-4 text-[#ccc]">{r ? `${r.breakdown.js.score}/${r.breakdown.js.maxScore}` : '—'}</td>
                    <td className="py-2 text-[#ccc]">{r ? `${r.breakdown.visual.score}/${r.breakdown.visual.maxScore}` : '—'}</td>
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

export default function TeacherDashboard() {
  const { user, logout } = useAuth();
  const [view, setView]               = useState('list');  // 'list' | 'create' | 'submissions'
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  // Create form state
  const [form, setForm]         = useState({ title: '', description: '' });
  const [files, setFiles]       = useState({ html: '', css: '', js: '' });
  const [creating, setCreating] = useState(false);
  const [createResult, setCreateResult] = useState(null);
  const [createError, setCreateError]   = useState('');

  useEffect(() => {
    if (view === 'list') {
      setLoading(true);
      getAssignments()
        .then(setAssignments)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [view]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title || !files.html) {
      setCreateError('Title and HTML are required.');
      return;
    }
    setCreateError('');
    setCreating(true);
    try {
      const result = await createAssignment({ ...form, ...files });
      setCreateResult(result);
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-[#e0e0e0]">
      {/* Header */}
      <header className="bg-[#1a1a2e] border-b border-[#2a2a4a] px-6 py-3 flex items-center justify-between">
        <div>
          <span className="text-white font-bold">Teacher Dashboard</span>
          <span className="text-[#666] text-sm ml-2">— {user?.name}</span>
        </div>
        <div className="flex gap-3">
          {view !== 'create' && (
            <button
              onClick={() => { setView('create'); setCreateResult(null); setCreateError(''); setForm({ title: '', description: '' }); setFiles({ html: '', css: '', js: '' }); }}
              className="px-4 py-1.5 text-sm font-semibold bg-[#2f80ed] text-white rounded-lg hover:bg-[#1a6cda] transition-colors"
            >
              + New Assignment
            </button>
          )}
          <button
            onClick={logout}
            className="px-4 py-1.5 text-sm text-[#888] border border-[#2a2a4a] rounded-lg hover:border-[#444] transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">

        {/* ── SUBMISSIONS VIEW ── */}
        {view === 'submissions' && selectedAssignment && (
          <SubmissionsView assignment={selectedAssignment} onBack={() => setView('list')} />
        )}

        {/* ── LIST VIEW ── */}
        {view === 'list' && (
          <>
            <h2 className="text-xl font-bold text-white mb-6">Your Assignments</h2>
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="w-9 h-9 rounded-full border-[3px] border-[#2a2a4a] border-t-[#4e9af1] animate-spin" />
              </div>
            ) : assignments.length === 0 ? (
              <div className="text-center py-20 text-[#555]">
                <p className="text-lg mb-2">No assignments yet.</p>
                <p className="text-sm">Click "New Assignment" to create your first one.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {assignments.map(a => (
                  <AssignmentCard
                    key={a._id}
                    a={a}
                    onViewSubmissions={(assignment) => { setSelectedAssignment(assignment); setView('submissions'); }}
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
              <h2 className="text-xl font-bold text-white">Create Assignment</h2>
            </div>

            {createResult ? (
              <div className="bg-[#1a1a2e] border border-[#3fb950]/40 rounded-xl p-6">
                <p className="text-[#3fb950] font-semibold text-sm mb-3">Assignment created successfully!</p>
                <p className="text-sm text-[#888] mb-1">
                  DOM tests generated: <span className="text-white font-semibold">{createResult.testsGenerated?.dom}</span>
                </p>
                <p className="text-sm text-[#888] mb-4">
                  Style tests generated: <span className="text-white font-semibold">{createResult.testsGenerated?.style}</span>
                </p>
                {createResult.referenceScreenshotUrl && (
                  <div>
                    <p className="text-xs text-[#666] mb-2">Reference screenshot (uploaded to Cloudinary):</p>
                    <img
                      src={createResult.referenceScreenshotUrl}
                      alt="Reference"
                      className="w-full max-w-md rounded-lg border border-[#2a2a4a]"
                    />
                  </div>
                )}
                <button
                  onClick={() => setView('list')}
                  className="mt-4 px-4 py-2 text-sm font-semibold bg-[#2f80ed] text-white rounded-lg hover:bg-[#1a6cda]"
                >
                  View all assignments
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#888] mb-1.5">Assignment title *</label>
                    <input
                      type="text" required
                      value={form.title}
                      onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-[#0d0d1a] border border-[#2a2a4a] rounded-lg text-sm text-white
                                 placeholder:text-[#3a3a5a] focus:outline-none focus:border-[#4e9af1]"
                      placeholder="e.g. Quiz App Recreation"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#888] mb-1.5">Description</label>
                    <input
                      type="text"
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-[#0d0d1a] border border-[#2a2a4a] rounded-lg text-sm text-white
                                 placeholder:text-[#3a3a5a] focus:outline-none focus:border-[#4e9af1]"
                      placeholder="Brief description for students"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#888] mb-1.5">Reference code *</label>
                  <p className="text-xs text-[#555] mb-2">Paste the original/reference HTML, CSS, and JS. Tests will be auto-generated from this.</p>
                  <div className="h-[400px] border border-[#2a2a4a] rounded-xl overflow-hidden">
                    <CodeEditor files={files} onChange={(tab, val) => setFiles(f => ({ ...f, [tab]: val }))} />
                  </div>
                </div>

                {createError && <p className="text-xs text-[#f85149]">{createError}</p>}

                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-2.5 bg-[#2f80ed] text-white text-sm font-semibold rounded-lg
                             hover:bg-[#1a6cda] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {creating ? 'Creating & capturing screenshot…' : 'Create Assignment'}
                </button>
              </form>
            )}
          </>
        )}
      </main>
    </div>
  );
}
