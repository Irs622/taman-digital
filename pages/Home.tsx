import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Post } from '../types';
import { getTrendingPosts, sharePost, getUserStats } from '../services/storageService';
import { getCurrentUser } from '../services/authService';

const Home: React.FC = () => {
  const [featuredPosts, setFeaturedPosts] = useState<Post[]>([]);
  const [greeting, setGreeting] = useState('Selamat Datang');
  const [reminder, setReminder] = useState('');

  useEffect(() => {
    // Get trending posts (most likes + comments + shares)
    setFeaturedPosts(getTrendingPosts());

    // Time-based greeting logic
    const hour = new Date().getHours();
    const user = getCurrentUser();
    
    let timeGreeting = '';
    if (hour < 12) timeGreeting = 'Selamat Pagi';
    else if (hour < 15) timeGreeting = 'Selamat Siang';
    else if (hour < 18) timeGreeting = 'Selamat Sore';
    else timeGreeting = 'Selamat Malam';

    if (user) {
        setGreeting(`${timeGreeting}, ${user.penName || user.name.split(' ')[0]}`);
        
        // Gentle Reminder Logic
        const stats = getUserStats(user.username);
        
        if (stats.totalPosts === 0) {
            setReminder("Taman ini masih kosong. Mari mulai menanam tulisan pertamamu.");
        } else if (stats.lastActive) {
            const lastDate = new Date(stats.lastActive);
            const diffDays = Math.floor((Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
            
            if (diffDays > 7) {
                setReminder("Tamanmu merindukan sentuhan baru. Tidak perlu panjang, satu kalimat pun cukup.");
            } else if (diffDays > 3) {
                setReminder("Sudah beberapa hari sejak tulisan terakhirmu. Apa yang sedang kau pikirkan?");
            }
        }
    } else {
        setGreeting('Taman Digital');
    }

  }, []);

  const handleShareClick = async (e: React.MouseEvent, post: Post) => {
    e.preventDefault(); // Prevent navigating to detail page
    e.stopPropagation();

    // Optimistically update UI
    const newShares = sharePost(post.id);
    setFeaturedPosts(prev => prev.map(p => p.id === post.id ? { ...p, shares: newShares } : p));

    const url = `${window.location.origin}/#/writing/${post.id}`;
    if (navigator.share) {
        try {
            await navigator.share({ title: post.title, text: post.excerpt, url });
        } catch (err) {
            // Cancelled
        }
    } else {
        navigator.clipboard.writeText(url);
        alert('Tautan disalin ke papan klip!');
    }
  };

  return (
    <div className="space-y-12 md:space-y-16 animate-fade-in">
      <section className="text-center space-y-4 md:space-y-6 max-w-2xl mx-auto mt-4 md:mt-10">
        <h1 className="text-3xl md:text-5xl font-serif font-bold text-zinc-900 dark:text-zinc-50 tracking-tight leading-tight">
          {greeting}
        </h1>
        {reminder && (
            <p className="text-sm md:text-base text-indigo-600 dark:text-indigo-400 font-medium italic animate-pulse">
                {reminder}
            </p>
        )}
        <p className="text-base md:text-xl text-zinc-600 dark:text-zinc-400 leading-relaxed px-4">
          Tempat di mana kebebasan benar-benar dituhankan.
        </p>
        <div className="pt-4">
             <Link 
                to="/writing" 
                className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition-colors border-b border-transparent hover:border-current pb-0.5 text-sm md:text-base"
             >
                Baca semua tulisan
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
             </Link>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-6 md:mb-8">
            <div className="flex items-center gap-2">
                 <span className="flex h-3 w-3 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                </span>
                <h2 className="text-xl md:text-2xl font-serif font-bold text-zinc-900 dark:text-zinc-100">Sedang Hype</h2>
            </div>
            <Link to="/explore" className="text-sm text-zinc-500 hover:text-indigo-600 transition-colors">Lihat Lainnya</Link>
        </div>
        
        {featuredPosts.length === 0 ? (
            <div className="text-center py-16 border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50">
                <p className="text-zinc-500 font-serif italic mb-2">"Suara-suara sedang beristirahat."</p>
                <p className="text-zinc-400 text-sm">Belum ada tulisan yang sedang tren saat ini.</p>
            </div>
        ) : (
            <div className="grid gap-4 md:gap-6 md:grid-cols-2">
            {featuredPosts.map((post) => (
                <Link 
                    key={post.id} 
                    to={`/writing/${post.id}`}
                    className="group relative block p-6 md:p-8 rounded-2xl bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm border border-white/40 dark:border-white/5 hover:border-indigo-500/30 dark:hover:border-indigo-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1"
                >
                <div className="space-y-3 md:space-y-4">
                    <div className="flex items-center justify-between text-xs font-medium text-zinc-500 dark:text-zinc-500 uppercase tracking-wider">
                    <div className="flex items-center gap-2 md:gap-3">
                        <span>{new Date(post.date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}</span>
                        <span>•</span>
                        <span>{post.readTime}</span>
                    </div>
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold lowercase bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">@{post.authorUsername}</span>
                    </div>
                    
                    <h3 className="text-lg md:text-xl font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight">
                    {post.title}
                    </h3>
                    
                    <p className="text-sm md:text-base text-zinc-600 dark:text-zinc-400 line-clamp-3 leading-relaxed">
                    {post.excerpt}
                    </p>

                    <div className="pt-2 flex items-center gap-4 text-xs text-zinc-400 font-medium">
                        <div className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                            <span>{post.likes}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                            <span>{post.comments ? post.comments.length : 0}</span>
                        </div>
                        <button onClick={(e) => handleShareClick(e, post)} className="flex items-center gap-1 hover:text-indigo-500 transition-colors z-10">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                            <span>{post.shares || 0}</span>
                        </button>
                    </div>
                </div>
                </Link>
            ))}
            </div>
        )}
      </section>
    </div>
  );
};

export default Home;