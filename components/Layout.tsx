import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Theme, User } from '../types';
import { isAuthenticated, logout, getCurrentUser } from '../services/authService';

interface LayoutProps {
  children: React.ReactNode;
}

// Logo Component
const LogoIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="50" className="fill-zinc-900 dark:fill-zinc-100" />
    {/* Abstract Hand/Pen Shape G-like */}
    <path d="M50 78V88" stroke="currentColor" strokeWidth="4" className="stroke-white dark:stroke-zinc-900" strokeLinecap="round" />
    <path d="M50 78L35 48H65L50 78Z" className="fill-white dark:fill-zinc-900" />
    <path d="M65 48V35C65 25 58 20 50 20C42 20 35 25 35 35V40" stroke="currentColor" strokeWidth="6" className="stroke-white dark:stroke-zinc-900" strokeLinecap="round" />
    <path d="M65 38H50" stroke="currentColor" strokeWidth="6" className="stroke-white dark:stroke-zinc-900" strokeLinecap="round" />
    {/* Digital Pixels */}
    <rect x="20" y="25" width="8" height="8" className="fill-white dark:fill-zinc-900 opacity-80" />
    <rect x="28" y="15" width="6" height="6" className="fill-white dark:fill-zinc-900 opacity-60" />
    <rect x="15" y="35" width="5" height="5" className="fill-white dark:fill-zinc-900 opacity-40" />
  </svg>
);

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return Theme.DARK;
    }
    return Theme.LIGHT;
  });

  const [isAuth, setIsAuth] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (theme === Theme.DARK) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    setIsAuth(isAuthenticated());
    setCurrentUser(getCurrentUser());
  }, [location]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === Theme.LIGHT ? Theme.DARK : Theme.LIGHT));
  };

  const handleLogout = () => {
    logout();
    setIsAuth(false);
    navigate('/login');
  };

  // Helper untuk mengecek active state
  const isActive = (path: string) => location.pathname.startsWith(path) && (path !== '/' || location.pathname === '/');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 transition-colors duration-300 relative overflow-hidden font-sans">
        {/* Ambient background glow */}
        <div className="fixed top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-300/20 dark:bg-indigo-900/10 rounded-full blur-[120px] pointer-events-none z-0" />
        <div className="fixed bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-rose-300/20 dark:bg-rose-900/10 rounded-full blur-[120px] pointer-events-none z-0" />

      {/* --- MOBILE HEADER (Top) --- */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 px-4 py-3 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-zinc-200/50 dark:border-white/5 flex items-center justify-between">
         <Link to="/" className="flex items-center gap-2 font-serif font-bold text-xl text-zinc-900 dark:text-zinc-100 tracking-tight">
            <LogoIcon className="w-8 h-8" />
            <span>Taman Digital</span>
         </Link>
         <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-zinc-500 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
         >
            {theme === Theme.LIGHT ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            )}
         </button>
      </div>

      {/* --- DESKTOP LOGO (Fixed Top Left) --- */}
      <Link to="/" className="hidden md:flex fixed top-6 left-8 z-50 items-center gap-3 group">
          <LogoIcon className="w-10 h-10 shadow-lg group-hover:scale-110 transition-transform duration-300" />
          <span className="font-serif font-bold text-lg text-zinc-900 dark:text-zinc-100 opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 pointer-events-none">
            Taman Digital
          </span>
      </Link>

      {/* --- DESKTOP NAVBAR (Floating Pill) --- */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 px-6 py-4 justify-center">
        <div className="flex items-center gap-1 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md border border-white/20 dark:border-white/5 rounded-full px-4 py-2 shadow-lg shadow-black/5 dark:shadow-black/20">
            
            {isAuth && (
              <>
                <Link to="/" className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${isActive('/') && !isActive('/explore') && !isActive('/users') ? 'text-zinc-900 dark:text-white bg-white dark:bg-zinc-800 shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}`}>Beranda</Link>
                <Link to="/explore" className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${isActive('/explore') ? 'text-zinc-900 dark:text-white bg-white dark:bg-zinc-800 shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}`}>Eksplore</Link>
                <Link to="/users" className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${isActive('/users') ? 'text-zinc-900 dark:text-white bg-white dark:bg-zinc-800 shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'}`}>Cari Pengguna</Link>

                <div className="w-px h-4 bg-zinc-300 dark:bg-zinc-700 mx-2" />

                <Link to="/admin" className={`p-2 rounded-full text-zinc-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${isActive('/admin') ? 'text-indigo-600 dark:text-indigo-400' : ''}`} title="Tulis">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </Link>

                <Link to="/chat" className={`p-2 rounded-full text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${isActive('/chat') ? 'text-indigo-600 dark:text-indigo-400' : ''}`} title="Pesan">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                </Link>

                <Link to="/profile" className={`p-1.5 ml-1 rounded-full text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors ${isActive('/profile') ? 'ring-2 ring-indigo-500' : ''}`} title="Profil">
                   {currentUser?.profilePicture ? (
                       <img src={currentUser.profilePicture} alt="Profile" className="w-6 h-6 rounded-full object-cover" />
                   ) : (
                       <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold">
                           {currentUser?.name?.charAt(0).toUpperCase()}
                       </div>
                   )}
                </Link>
                
                <button onClick={handleLogout} className="p-2 ml-1 rounded-full text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors" title="Keluar">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                </button>
                <div className="w-px h-4 bg-zinc-300 dark:bg-zinc-700 mx-2" />
              </>
            )}

            <button onClick={toggleTheme} className="p-2 rounded-full text-zinc-500 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                {theme === Theme.LIGHT ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                )}
            </button>
        </div>
      </nav>

      {/* --- MOBILE BOTTOM NAV --- */}
      {isAuth && (
          <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-lg border-t border-zinc-200 dark:border-zinc-800 pb-safe">
            <div className="flex items-center justify-around p-3">
                <Link to="/" className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${isActive('/') && !isActive('/explore') ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400 dark:text-zinc-500'}`}>
                    <svg className="w-6 h-6" fill={isActive('/') && !isActive('/explore') ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                    <span className="text-[10px] font-medium">Beranda</span>
                </Link>
                
                <Link to="/explore" className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${isActive('/explore') ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400 dark:text-zinc-500'}`}>
                    <svg className="w-6 h-6" fill={isActive('/explore') ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <span className="text-[10px] font-medium">Eksplore</span>
                </Link>

                <Link to="/admin" className="flex flex-col items-center justify-center -mt-8">
                     <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg border-4 border-gray-50 dark:border-zinc-950 transition-transform ${isActive('/admin') ? 'bg-indigo-600 text-white scale-110' : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'}`}>
                         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                     </div>
                </Link>

                <Link to="/chat" className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${isActive('/chat') ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400 dark:text-zinc-500'}`}>
                    <svg className="w-6 h-6" fill={isActive('/chat') ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    <span className="text-[10px] font-medium">Pesan</span>
                </Link>

                <Link to="/profile" className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${isActive('/profile') ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400 dark:text-zinc-500'}`}>
                    {currentUser?.profilePicture ? (
                       <img src={currentUser.profilePicture} alt="Profile" className="w-6 h-6 rounded-full object-cover" />
                   ) : (
                       <svg className="w-6 h-6" fill={isActive('/profile') ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                   )}
                    <span className="text-[10px] font-medium">Profil</span>
                </Link>
            </div>
          </nav>
      )}

      {/* Main Content: Padding bottom extra on mobile to avoid nav overlap, Padding top adjusted for desktop vs mobile */}
      <main className="relative z-10 pt-24 md:pt-32 pb-24 md:pb-20 px-4 md:px-8 max-w-4xl mx-auto min-h-screen">
        {children}
      </main>

      <footer className="relative z-10 py-10 pb-28 md:pb-10 text-center text-zinc-400 dark:text-zinc-600 text-sm flex flex-col gap-2">
        <p className="opacity-70">&copy; {new Date().getFullYear()} Taman Digital</p>
        <button onClick={handleLogout} className="md:hidden text-xs text-rose-500 mt-2">Keluar Sesi</button>
      </footer>
    </div>
  );
};

export default Layout;