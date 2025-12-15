import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Post } from '../types';
import { getPosts, sharePost } from '../services/storageService';

const WritingList: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    // Only show published posts in the public list
    const allPosts = getPosts();
    setPosts(allPosts.filter(p => p.status === 'published'));
  }, []);

  const handleShareClick = async (e: React.MouseEvent, post: Post) => {
    e.preventDefault(); 
    e.stopPropagation();

    const newShares = sharePost(post.id);
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, shares: newShares } : p));

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

  return (
    <div className="max-w-3xl mx-auto space-y-12">
      <header className="space-y-4 mb-12">
        <h1 className="text-3xl font-serif font-bold text-zinc-900 dark:text-zinc-50">Koleksi Tulisan</h1>
        <p className="text-zinc-600 dark:text-zinc-400">Arsip pemikiran dan cerita yang telah terbit.</p>
      </header>

      {posts.length === 0 ? (
          <div className="text-center py-24 animate-fade-in border border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl bg-zinc-50 dark:bg-zinc-900/30">
              <p className="text-zinc-500 font-serif italic text-lg mb-3">"Setiap hutan besar bermula dari satu benih."</p>
              <p className="text-zinc-400 text-sm max-w-md mx-auto leading-relaxed">
                  Halaman ini menanti cerita pertamamu. Tidak perlu sempurna, mulailah dari satu kalimat sederhana.
              </p>
              <Link to="/admin" className="inline-block mt-8 px-6 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full text-sm font-medium hover:opacity-90 transition-opacity">
                  Mulai Menulis Sekarang
              </Link>
          </div>
      ) : (
          <div className="space-y-10 relative">
            <div className="absolute left-0 top-2 bottom-2 w-px bg-zinc-200 dark:bg-zinc-800 hidden md:block" />
            
            {posts.map((post) => (
              <div key={post.id} className="relative md:pl-8 group">
                 {/* Timeline dot */}
                <div className="absolute left-[-4px] top-2 w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-700 ring-4 ring-gray-50 dark:ring-zinc-950 group-hover:bg-indigo-500 transition-colors hidden md:block" />
                
                <Link to={`/writing/${post.id}`} className="block space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400 dark:text-zinc-500 font-mono">
                        {new Date(post.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                    <div className="flex items-center gap-3 text-xs text-zinc-400 dark:text-zinc-500">
                        <div className="flex items-center gap-1">
                            <svg className="w-3 h-3 fill-current opacity-70" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                            <span>{post.likes}</span>
                        </div>
                        <div className="flex items-center gap-1">
                             <svg className="w-3 h-3 stroke-current opacity-70" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                             <span>{post.comments ? post.comments.length : 0}</span>
                        </div>
                        <button onClick={(e) => handleShareClick(e, post)} className="flex items-center gap-1 hover:text-indigo-500 transition-colors z-10">
                             <svg className="w-3 h-3 stroke-current opacity-70" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                             <span>{post.shares || 0}</span>
                        </button>
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-2xl">
                    {post.excerpt}
                  </p>
                  <div className="pt-2 flex gap-2">
                    {post.tags.map(tag => (
                        <span key={tag} className="text-xs px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                            #{tag}
                        </span>
                    ))}
                  </div>
                </Link>
              </div>
            ))}
          </div>
      )}
    </div>
  );
};

export default WritingList;