import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { login } from '../api/index.js';

export default function LoginPage() {
  const { login: authLogin } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token, user } = await login(form.email, form.password);
      authLogin(token, user);
      navigate(user.role === 'teacher' ? '/teacher' : '/student', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-white text-center mb-1">Welcome back</h1>
        <p className="text-sm text-[#666] text-center mb-8">Sign in to your account</p>

        <form onSubmit={handleSubmit} className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#888] mb-1.5">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full px-3 py-2.5 bg-[#0d0d1a] border border-[#2a2a4a] rounded-lg text-sm text-white
                         placeholder:text-[#3a3a5a] focus:outline-none focus:border-[#4e9af1]"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#888] mb-1.5">Password</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="w-full px-3 py-2.5 bg-[#0d0d1a] border border-[#2a2a4a] rounded-lg text-sm text-white
                         placeholder:text-[#3a3a5a] focus:outline-none focus:border-[#4e9af1]"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-xs text-[#f85149]">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#2f80ed] text-white text-sm font-semibold rounded-lg
                       hover:bg-[#1a6cda] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-sm text-[#666] text-center mt-4">
          Don't have an account?{' '}
          <Link to="/register" className="text-[#4e9af1] hover:underline">Register</Link>
        </p>
      </div>
    </div>
  );
}
