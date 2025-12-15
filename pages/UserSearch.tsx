import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User } from '../types';
import { searchUsers, getCurrentUser, toggleFollow } from '../services/authService';

const UserSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Helper to force re-render or update local user list after interaction
  const [updateTrigger, setUpdateTrigger] = useState(0);

  useEffect(() => {
    setCurrentUser(getCurrentUser());
    setResults(searchUsers(query));
  }, [query, updateTrigger]);

  const handleFollowClick = (e: React.MouseEvent, targetUsername: string) => {
    e.preventDefault(); // Prevent navigating to profile
    toggleFollow(targetUsername);
    setUpdateTrigger(prev => prev + 1); // Refresh UI to show new state
  };

  const isFollowing = (targetUsername: string) => {
      return currentUser?.following.includes(targetUsername);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
      <header className="space-y-4">
        <h1 className="text-3xl font-serif font-bold text-zinc-900 dark:text-zinc-50">Cari Pengguna</h1>
        <p className="text-zinc-600 dark:text-zinc-400">Temukan penulis lain untuk diikuti.</p>
        
        <div className="relative mt-6">
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari nama atau username..."
                className="w-full pl-12 pr-4 py-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all text-lg"
            />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {results.length === 0 ? (
            <div className="col-span-full text-center py-20 text-zinc-500 dark:text-zinc-500">
                <p>Pengguna tidak ditemukan.</p>
            </div>
        ) : (
            results.map((user) => (
                <Link 
                    key={user.username} 
                    to={`/users/${user.username}`}
                    className="flex items-center justify-between p-4 rounded-xl bg-white/50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group"
                >
                    <div className="flex items-center gap-4">
                        {user.profilePicture ? (
                            <img src={user.profilePicture} alt={user.name} className="w-12 h-12 rounded-full object-cover bg-zinc-100" />
                        ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-rose-500 flex items-center justify-center text-white font-bold text-xl">
                                {user.name.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div>
                            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{user.name}</h3>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">@{user.username}</p>
                        </div>
                    </div>
                    
                    {currentUser && currentUser.username !== user.username && (
                        <button
                            onClick={(e) => handleFollowClick(e, user.username)}
                            className={`px-3 py-1 text-xs rounded-full font-medium transition-all ${
                                isFollowing(user.username)
                                ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-900/30 dark:hover:text-rose-400'
                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                            }`}
                        >
                            {isFollowing(user.username) ? 'Mengikuti' : 'Ikuti'}
                        </button>
                    )}
                </Link>
            ))
        )}
      </div>
    </div>
  );
};

export default UserSearch;