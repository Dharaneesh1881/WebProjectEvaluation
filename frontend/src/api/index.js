import { io } from 'socket.io-client';

export const socket = io('http://localhost:3001', {
  autoConnect: true,
  transports: ['websocket', 'polling']
});

const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('token');
}

function authHeaders() {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

function authOnlyHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse(res) {
  const data = await res.json().catch(() => ({ error: 'Unknown error' }));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// ── Auth ────────────────────────────────────────────────────────────────────

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return handleResponse(res);  // { token, user }
}

export async function register(name, email, password, role) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password, role })
  });
  return handleResponse(res);  // { token, user }
}

export async function getCurrentUser(token) {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return handleResponse(res);  // { id, name, email, role }
}

// ── Assignments ─────────────────────────────────────────────────────────────

export async function getAssignments() {
  const res = await fetch(`${API_BASE}/assignments`, { headers: authHeaders() });
  return handleResponse(res);  // [{ _id, title, description, referenceScreenshotUrl, createdAt }]
}

export async function createAssignment(data) {
  const res = await fetch(`${API_BASE}/assignments`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data)
  });
  return handleResponse(res);
}

export async function updateAssignmentTests(assignmentId, { functionalityTests, interactionTests }) {
  const res = await fetch(`${API_BASE}/assignments/${assignmentId}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ functionalityTests, interactionTests })
  });
  return handleResponse(res);
}

export async function deleteAssignment(assignmentId) {
  const res = await fetch(`${API_BASE}/assignments/${assignmentId}`, {
    method: 'DELETE',
    headers: authHeaders()
  });
  return handleResponse(res);  // { success, message, deletedSubmissions }
}

export async function getAssignmentSubmissions(assignmentId) {
  const res = await fetch(`${API_BASE}/assignments/${assignmentId}/submissions`, {
    headers: authHeaders()
  });
  return handleResponse(res);  // [{ submissionId, studentId, status, submittedAt, result }]
}

// ── Submissions ─────────────────────────────────────────────────────────────

export async function submitCode({ files, assignmentId }) {
  const res = await fetch(`${API_BASE}/submissions`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ files, assignmentId })
  });
  return handleResponse(res);
}

export async function getResult(submissionId) {
  const res = await fetch(`${API_BASE}/result/${submissionId}`, {
    headers: authHeaders()
  });
  return handleResponse(res);
}

export async function getStudentProgress() {
  const res = await fetch(`${API_BASE}/progress`, { headers: authHeaders() });
  return handleResponse(res);  // { [assignmentId]: { bestScore, completed, completedAt, attempts } }
}

export async function getBestCode(assignmentId) {
  const res = await fetch(`${API_BASE}/progress/${assignmentId}/code`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function getLeaderboard() {
  const res = await fetch(`${API_BASE}/leaderboard`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function getStudentLeaderboard() {
  const res = await fetch(`${API_BASE}/student-leaderboard`, { headers: authHeaders() });
  return handleResponse(res); // [{ assignmentId, title, totalStudents, top3, myRank }]
}

export async function getTeacherStudentSubmission(assignmentId, studentId) {
  const res = await fetch(`${API_BASE}/teacher/student-submission/${assignmentId}/${studentId}`, { headers: authHeaders() });
  return handleResponse(res);
}

export async function parseProjectZip(zipFile) {
  const body = new FormData();
  body.append('zip', zipFile);

  const res = await fetch(`${API_BASE}/project-files/zip`, {
    method: 'POST',
    headers: authOnlyHeaders(),
    body
  });

  return handleResponse(res);
}
