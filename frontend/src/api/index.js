import { io } from 'socket.io-client';

// Socket.io connects directly to the backend (not through Vite proxy)
export const socket = io('http://localhost:3001', {
  autoConnect: true,
  transports: ['websocket', 'polling']
});

const API_BASE = '/api';   // uses Vite proxy → http://localhost:3001

export async function submitCode({ html, css, js }) {
  const res = await fetch(`${API_BASE}/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html, css, js })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || 'Submission failed');
  }
  return res.json();   // { submissionId }
}

export async function getResult(submissionId) {
  const res = await fetch(`${API_BASE}/result/${submissionId}`);
  return res.json();
}
