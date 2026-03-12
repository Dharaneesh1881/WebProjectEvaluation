import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { CodeEditor } from '../components/CodeEditor.jsx';
import { ResultsPanel } from '../components/ResultsPanel.jsx';
import { getAssignments, submitCode, getResult, getStudentProgress, getBestCode, socket } from '../api/index.js';

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
              ✓ Completed
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
            <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 bg-[#3fb950]/10 border border-[#3fb950]/40 text-[#3fb950] rounded-full">✓ Completed</span>
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
  const [assignments, setAssignments] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [progress, setProgress] = useState({});  // { [assignmentId]: {...} }

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

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-[#e0e0e0]">
      {/* Header */}
      <header className="bg-[#1a1a2e] border-b border-[#2a2a4a] px-6 py-3 flex items-center justify-between">
        <div>
          <span className="text-white font-bold">Student Dashboard</span>
          <span className="text-[#666] text-sm ml-2">— {user?.name}</span>
        </div>
        <div className="flex gap-3">
          {selectedAssignment && (
            <button
              onClick={() => setSelectedAssignment(null)}
              className="text-sm text-[#4e9af1] hover:underline"
            >
              ← All assignments
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

      {/* Assignment list */}
      {!selectedAssignment && (
        <main className="max-w-5xl mx-auto px-6 py-8">
          <h2 className="text-xl font-bold text-white mb-2">Available Assignments</h2>
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

      {/* Submission view — two panel */}
      {selectedAssignment && (
        <div className="flex flex-col md:flex-row h-[calc(100vh-57px)] overflow-hidden">
          {/* Editor column */}
          <section className="flex flex-col md:w-[55%] border-b md:border-b-0 md:border-r border-[#2a2a4a] h-[55vh] md:h-auto">
            <div className="px-4 py-3 bg-[#1a1a2e] border-b border-[#2a2a4a] shrink-0">
              <p className="text-xs text-[#666]">Assignment</p>
              <h3 className="text-sm font-semibold text-white">{selectedAssignment.title}</h3>
              {selectedAssignment.description && (
                <p className="text-xs text-[#555] mt-0.5">{selectedAssignment.description}</p>
              )}
            </div>

            {/* Loading spinner while fetching best code */}
            {loadingCode ? (
              <div className="flex-1 flex items-center justify-center bg-[#0d0d1a]">
                <div className="flex flex-col items-center gap-3 text-[#555]">
                  <div className="w-6 h-6 rounded-full border-2 border-[#2a2a4a] border-t-[#4e9af1] animate-spin" />
                  <p className="text-xs">Loading your best submission…</p>
                </div>
              </div>
            ) : (
              <>
                {/* Banner: editor pre-filled with best code */}
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
                className="w-full sm:w-auto px-5 py-2.5 rounded-md text-sm font-semibold transition-colors
                           bg-[#2f80ed] text-white hover:bg-[#1a6cda]
                           disabled:bg-[#2a2a4a] disabled:text-[#555] disabled:cursor-not-allowed"
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
  );
}
