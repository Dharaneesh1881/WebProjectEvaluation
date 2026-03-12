import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { CodeEditor } from '../components/CodeEditor.jsx';
import { ResultsPanel } from '../components/ResultsPanel.jsx';
import { getAssignments, submitCode, getResult, socket } from '../api/index.js';

function AssignmentCard({ a, onStart }) {
  return (
    <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl overflow-hidden flex flex-col">
      {a.referenceScreenshotUrl && (
        <img
          src={a.referenceScreenshotUrl}
          alt={a.title}
          className="w-full h-36 object-cover object-top border-b border-[#2a2a4a]"
        />
      )}
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-semibold text-white text-sm mb-1">{a.title}</h3>
        {a.description && <p className="text-xs text-[#666] mb-3 flex-1">{a.description}</p>}
        <button
          onClick={() => onStart(a)}
          className="mt-auto w-full py-2 text-xs font-semibold bg-[#2f80ed] text-white rounded-lg hover:bg-[#1a6cda] transition-colors"
        >
          Start Assignment
        </button>
      </div>
    </div>
  );
}

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const [assignments, setAssignments]           = useState([]);
  const [loadingList, setLoadingList]           = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  // Submission state
  const [files, setFiles]           = useState({ html: '', css: '', js: '' });
  const [submissionId, setSubmissionId] = useState(null);
  const [status, setStatus]         = useState(null);
  const [result, setResult]         = useState(null);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    getAssignments()
      .then(setAssignments)
      .catch(console.error)
      .finally(() => setLoadingList(false));
  }, []);

  const handleStart = (assignment) => {
    setSelectedAssignment(assignment);
    setFiles({ html: '', css: '', js: '' });
    setSubmissionId(null);
    setStatus(null);
    setResult(null);
    setSubmitError('');
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
      if (data.status === 'done') { setStatus('done'); setResult(data.result); }
      else setStatus(data.status);
    };
    socket.on('evaluation:complete', handler);
    return () => socket.off('evaluation:complete', handler);
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
                <AssignmentCard key={a._id} a={a} onStart={handleStart} />
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

            <CodeEditor files={files} onChange={handleFileChange} />

            <div className="shrink-0 px-3 py-2 bg-[#0f0f1a]">
              <button
                onClick={handleSubmit}
                disabled={isEvaluating}
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
