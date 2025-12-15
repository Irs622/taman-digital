import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Post, User } from '../types';
import { searchPosts, sharePost } from '../services/storageService';
import { searchUsers, getCurrentUser, toggleFollow } from '../services/authService';

const Explore: React.FC = () => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  
  // Search State
  const [searchType, setSearchType] = useState<'posts' | 'users'>('posts');
  const [postResults, setPostResults] = useState<Post[]>([]);
  const [userResults, setUserResults] = useState<User[]>([]);
  
  // User interaction state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [updateTrigger, setUpdateTrigger] = useState(0);

  // Initial Load
  useEffect(() => {
    setCurrentUser(getCurrentUser());
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Execute Search based on Type
  useEffect(() => {
    if (searchType === 'posts') {
        setPostResults(searchPosts(debouncedQuery));
    } else {
        setUserResults(searchUsers(debouncedQuery));
    }
  }, [debouncedQuery, searchType, updateTrigger]);

  // Handlers for Posts
  const handleShareClick = async (e: React.MouseEvent, post: Post) => {
    e.preventDefault(); 
    e.stopPropagation();

    const newShares = sharePost(post.id);
    setPostResults(prev => prev.map(p => p.id === post.id ? { ...p, shares: newShares } : p));

    const url = `${window.location.origin}/#/writing/${post.id}`;
    if (navigator.share) {
        try {
            await navigator.share({ title: post.title, text: post.excerpt, url });
        } catch (err) {}
    } else {
        navigator.clipboard.writeText(url);
        alert('Tautan disalin ke papan klip!');
    }
  };

  // Handlers for Users
  const handleFollowClick = (e: React.MouseEvent, targetUsername: string) => {
    e.preventDefault();
    toggleFollow(targetUsername);
    setUpdateTrigger(prev => prev + 1); // Trigger re-render to update button state
  };

  const isFollowing = (targetUsername: string) => {
      return currentUser?.following.includes(targetUsername);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
      <header className="space-y-4">
        <h1 className="text-3xl font-serif font-bold text-zinc-900 dark:text-zinc-50">Eksplore</h1>
        <p className="text-zinc-600 dark:text-zinc-400">Temukan ide-ide baru dan penulis berbakat.</p>
        
        <div className="relative mt-6">
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchType === 'posts' ? "Cari judul, konten, atau tag..." : "Cari nama penulis..."}
                className="w-full pl-12 pr-4 py-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-all text-lg"
            />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
      </header>

      {/* MOBILE ONLY TOGGLE: Switches between Posts and Users */}
      <div className="md:hidden flex p-1 bg-zinc-200 dark:bg-zinc-800 rounded-xl">
          <button 
            onClick={() => setSearchType('posts')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${searchType === 'posts' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 dark:text-zinc-400'}`}
          >
              Tulisan
          </button>
          <button 
            onClick={() => setSearchType('users')}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${searchType === 'users' ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 dark:text-zinc-400'}`}
          >
              Penulis
          </button>
      </div>

      <div className="space-y-6">
        {/* RENDER POSTS LIST */}
        {searchType === 'posts' && (
            postResults.length === 0 ? (
                <div className="text-center py-20 text-zinc-500 dark:text-zinc-500">
                    <p>Tidak ada tulisan yang ditemukan.</p>
                </div>
            ) : (
                postResults.map((post) => (
                    <Link 
                        key={post.id} 
                        to={`/writing/${post.id}`}
                        className="block p-6 rounded-2xl bg-white/50 dark:bg-zinc-900/50 hover:bg-white dark:hover:bg-zinc-900 border border-transparent hover:border-indigo-100 dark:hover:border-zinc-800 transition-all duration-300 hover:shadow-lg"
                    >
                        <div className="flex justify-between items-start mb-2">
                             <div>
                                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 leading-tight">{post.title}</h2>
                                <div className="flex items-center gap-2 mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                                    <span className="font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-1.5 py-0.5 rounded">@{post.authorUsername}</span>
                                    <span>•</span>
                                    <span>{new Date(post.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                                </div>
                             </div>
                             <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1">
                                <div className="flex items-center gap-1">
                                    <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                                    {post.likes}
                                </div>
                                <button onClick={(e) => handleShareClick(e, post)} className="flex items-center gap-1 hover:text-indigo-500 transition-colors z-10">
                                    <svg className="w-3 h-3 stroke-current" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                    <span>{post.shares || 0}</span>
                                </button>
                             </div>
                        </div>
                        <p className="text-zinc-600 dark:text-zinc-400 mb-4 line-clamp-2 mt-3">{post.excerpt}</p>
                        <div className="flex items-center gap-2">
                            {post.tags.slice(0, 3).map(tag => (
                                 <span key={tag} className="text-xs px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                                    #{tag}
                                 </span>
                            ))}
                        </div>
                    </Link>
                ))
            )
        )}

        {/* RENDER USERS LIST (Mobile Only Selection) */}
        {searchType === 'users' && (
             userResults.length === 0 ? (
                <div className="text-center py-20 text-zinc-500 dark:text-zinc-500">
                    <p>Penulis tidak ditemukan.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {userResults.map((user) => (
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
                    ))}
                </div>
            )
        )}
      </div>
    </div>
  );
};

export default Explore;