import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, Post } from '../types';
import { getUserByUsername, getCurrentUser, toggleFollow } from '../services/authService';
import { getPostsByUsername, sharePost } from '../services/storageService';

const PublicProfile: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    const curr = getCurrentUser();
    setCurrentUser(curr);

    if (username) {
      const user = getUserByUsername(username);
      if (user) {
        setProfileUser(user);
        setPosts(getPostsByUsername(username));
        if (curr) {
          setIsFollowing(curr.following.includes(username));
        }
      }
    }
  }, [username]);

  const handleToggleFollow = () => {
    if (profileUser && currentUser) {
      const newStatus = toggleFollow(profileUser.username);
      setIsFollowing(newStatus);
      
      // Update local state numbers visually
      setProfileUser(prev => {
        if (!prev) return null;
        const followers = newStatus 
            ? [...prev.followers, currentUser.username]
            : prev.followers.filter(u => u !== currentUser.username);
        return { ...prev, followers };
      });
    }
  };

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

  if (!profileUser) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-zinc-500">
            <h2 className="text-2xl font-bold mb-2">Pengguna tidak ditemukan</h2>
            <Link to="/users" className="text-indigo-600 hover:underline">Kembali ke pencarian</Link>
        </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-12 animate-fade-in">
        {/* Header Profile */}
      <div className="flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
        <div className="shrink-0">
             {profileUser.profilePicture ? (
                 <img 
                    src={profileUser.profilePicture} 
                    alt={profileUser.name} 
                    className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover shadow-lg border-4 border-white dark:border-zinc-800" 
                 />
             ) : (
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-br from-indigo-500 to-rose-500 flex items-center justify-center text-white font-bold text-4xl shadow-lg">
                    {profileUser.name.charAt(0).toUpperCase()}
                </div>
             )}
        </div>
        
        <div className="space-y-4 flex-1 w-full">
            <div>
                <h1 className="text-3xl font-serif font-bold text-zinc-900 dark:text-zinc-50">{profileUser.name}</h1>
                <p className="text-zinc-500 dark:text-zinc-400 font-medium">@{profileUser.username}</p>
            </div>
            
            {profileUser.bio && (
                <p className="text-zinc-600 dark:text-zinc-300 max-w-lg leading-relaxed mx-auto md:mx-0">{profileUser.bio}</p>
            )}

            <div className="flex items-center justify-center md:justify-start gap-6 text-sm">
                <div className="text-center md:text-left">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 block text-lg">{profileUser.followers.length}</span>
                    <span className="text-zinc-500">Pengikut</span>
                </div>
                <div className="text-center md:text-left">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 block text-lg">{profileUser.following.length}</span>
                    <span className="text-zinc-500">Mengikuti</span>
                </div>
                <div className="text-center md:text-left">
                    <span className="font-bold text-zinc-900 dark:text-zinc-100 block text-lg">{posts.length}</span>
                    <span className="text-zinc-500">Tulisan</span>
                </div>
            </div>

            {currentUser && currentUser.username !== profileUser.username && (
                <div className="flex items-center justify-center md:justify-start gap-3">
                    <button
                        onClick={handleToggleFollow}
                        className={`px-6 py-2 rounded-full font-medium transition-all ${
                            isFollowing
                            ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                            : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:scale-105 shadow-md'
                        }`}
                    >
                        {isFollowing ? 'Mengikuti' : 'Ikuti'}
                    </button>
                    <Link
                        to={`/chat/${profileUser.username}`}
                        className="px-4 py-2 rounded-full font-medium bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        Pesan
                    </Link>
                </div>
            )}
        </div>
      </div>

      <hr className="border-zinc-200 dark:border-zinc-800" />

      {/* Post List */}
      <section className="space-y-8">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Karya Tulis</h2>
        
        {posts.length === 0 ? (
            <p className="text-zinc-500 italic">Belum ada tulisan yang diterbitkan.</p>
        ) : (
            <div className="grid gap-6">
                 {posts.map((post) => (
                    <Link 
                        key={post.id} 
                        to={`/writing/${post.id}`}
                        className="group block p-6 rounded-2xl bg-white/50 dark:bg-zinc-900/50 hover:bg-white dark:hover:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 transition-all duration-300 hover:shadow-lg"
                    >
                        <div className="flex justify-between items-start mb-2">
                             <div>
                                <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                    {post.title}
                                </h3>
                                <span className="text-xs text-zinc-400">{new Date(post.date).toLocaleDateString('id-ID')}</span>
                             </div>
                             <div className="flex items-center gap-2">
                                <button onClick={(e) => handleShareClick(e, post)} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-indigo-500 transition-colors z-10">
                                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                                     <span>{post.shares || 0}</span>
                                </button>
                             </div>
                        </div>
                        <p className="text-zinc-600 dark:text-zinc-400 line-clamp-2">{post.excerpt}</p>
                    </Link>
                 ))}
            </div>
        )}
      </section>
    </div>
  );
};

export default PublicProfile;