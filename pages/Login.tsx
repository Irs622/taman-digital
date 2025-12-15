import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login, loginWithGoogle } from '../services/authService';

const Login: React.FC = () => {
  const [identifier, setIdentifier] = useState(''); // Username or Email
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(identifier, password)) {
      navigate('/admin');
    } else {
      setError('Username, Email, atau kata sandi salah.');
    }
  };

  const handleGoogleLogin = () => {
      // SIMULATION: In a real app, this would use the Google OAuth SDK
      // We are simulating a successful callback for demonstration
      const mockGoogleData = {
          email: "penulis.baru@gmail.com",
          name: "Penulis Google",
          picture: "" 
      };
      
      const result = loginWithGoogle(mockGoogleData);
      if (result.success) {
          alert("Simulasi: Login Google Berhasil (Akun Demo)");
          navigate('/admin');
      }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-serif font-bold text-zinc-900 dark:text-zinc-50">Masuk</h1>
        <p className="text-zinc-600 dark:text-zinc-400">Selamat datang kembali, Penulis.</p>
      </div>

      <div className="w-full max-w-sm space-y-6">
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-4">
            <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase mb-1 ml-1">Akun</label>
                <input
                type="text"
                value={identifier}
                onChange={(e) => {
                    setIdentifier(e.target.value);
                    setError('');
                }}
                className="w-full px-4 py-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="Username atau Email"
                autoFocus
                />
            </div>
            <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase mb-1 ml-1">Keamanan</label>
                <input
                type="password"
                value={password}
                onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                }}
                className="w-full px-4 py-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="Kata Sandi"
                />
            </div>
          </div>
          
          {error && <p className="text-red-500 text-sm text-center bg-red-50 dark:bg-red-900/20 py-2 rounded-lg">{error}</p>}
          
          <button
            type="submit"
            className="w-full py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
          >
            Masuk dengan Akun
          </button>
        </form>

        <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-zinc-200 dark:border-zinc-700"></div>
            <span className="flex-shrink-0 mx-4 text-zinc-400 text-xs">ATAU</span>
            <div className="flex-grow border-t border-zinc-200 dark:border-zinc-700"></div>
        </div>

        <button
            onClick={handleGoogleLogin}
            type="button"
            className="w-full py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-lg font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors flex items-center justify-center gap-3"
        >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Masuk dengan Google
        </button>

        <p className="text-center text-sm text-zinc-500">
          Belum punya akun?{' '}
          <Link to="/register" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
            Daftar Sekarang
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;