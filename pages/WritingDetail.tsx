import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Post, Comment, User } from '../types';
import { getPostById, likePost, addComment, sharePost } from '../services/storageService';
import { getCurrentUser, isAuthenticated, getUserByUsername } from '../services/authService';

// Helper component to display avatar
const UserAvatar = ({ username }: { username: string }) => {
    const [user, setUser] = useState<User | undefined>(undefined);
    useEffect(() => {
        setUser(getUserByUsername(username));
    }, [username]);

    if (user?.profilePicture) {
        return <img src={user.profilePicture} alt={username} className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover shrink-0" />;
    }

    return (
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0 text-indigo-700 dark:text-indigo-400 font-bold uppercase text-xs md:text-sm">
            {username.charAt(0)}
        </div>
    );
};

const WritingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [hasLiked, setHasLiked] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Comment State
  const [commentText, setCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    if (id) {
      const found = getPostById(id);
      if (found) {
        setPost(found);
      } else {
        navigate('/writing');
      }
    }
  }, [id, navigate]);

  const handleLike = () => {
    if (!post || hasLiked) return;

    const newLikes = likePost(post.id);
    setPost({ ...post, likes: newLikes });
    setHasLiked(true);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 500);
  };

  const handleShare = async () => {
    if (!post) return;

    // Update count in storage and UI
    const newShares = sharePost(post.id);
    setPost({ ...post, shares: newShares });

    const shareData = {
        title: post.title,
        text: post.excerpt,
        url: window.location.href,
    };

    if (navigator.share) {
        try {
            await navigator.share(shareData);
        } catch (err) {
            console.log('Share cancelled');
        }
    } else {
        navigator.clipboard.writeText(window.location.href);
        alert('Tautan tulisan telah disalin ke papan klip!');
    }
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!post || !commentText.trim()) return;

      const user = getCurrentUser();
      if (!user) return;

      setIsSubmittingComment(true);
      
      const newComment = addComment(post.id, commentText, user.username);
      if (newComment) {
          setPost(prev => prev ? { ...prev, comments: [...prev.comments, newComment] } : null);
          setCommentText('');
      }
      setIsSubmittingComment(false);
  };

  if (!post) return null;

  const isLoggedIn = isAuthenticated();

  return (
    <article className="max-w-2xl mx-auto space-y-6 md:space-y-8 animate-fade-in pb-20">
      <Link to="/writing" className="inline-flex items-center text-sm text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors mb-2 md:mb-4">
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Kembali ke daftar
      </Link>
      
      <header className="space-y-6 text-center px-2">
        <div className="space-y-4">
            <h1 className="text-3xl md:text-4xl font-serif font-bold text-zinc-900 dark:text-zinc-50 leading-tight">
            {post.title}
            </h1>
            <div className="flex flex-col items-center gap-2">
                <Link to={`/users/${post.authorUsername}`} className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                    Oleh @{post.authorUsername}
                </Link>
                <div className="flex items-center justify-center gap-3 text-sm text-zinc-500 font-medium">
                    <span>{new Date(post.date).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                    <span>{post.readTime}</span>
                </div>
            </div>
        </div>
      </header>

      <div className="prose prose-lg prose-zinc dark:prose-invert prose-headings:font-serif prose-a:text-indigo-600 dark:prose-a:text-indigo-400 hover:prose-a:text-indigo-500 mx-auto px-1">
        {post.content.split('\n\n').map((paragraph, index) => {
            if (paragraph.startsWith('###')) {
                 return <h3 key={index} className="text-xl font-bold mt-8 mb-4">{paragraph.replace('###', '').trim()}</h3>;
            }
            if (paragraph.startsWith('>')) {
                return (
                    <blockquote key={index} className="border-l-4 border-indigo-500 pl-4 italic my-6 text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900/50 py-2 pr-2 rounded-r-lg">
                        {paragraph.replace('>', '').trim()}
                    </blockquote>
                );
            }
            return <p key={index} className="mb-4 leading-relaxed font-serif text-zinc-800 dark:text-zinc-300 text-base md:text-lg">{paragraph}</p>;
        })}
      </div>
      
      {/* Actions Section */}
      <div className="pt-8 md:pt-12 mt-8 md:mt-12 border-t border-zinc-200 dark:border-zinc-800 flex justify-center gap-6">
        <button 
            onClick={handleLike}
            disabled={hasLiked}
            className={`group flex items-center gap-2 px-6 py-3 rounded-full transition-all duration-300 ${
                hasLiked 
                ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 cursor-default' 
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-500 hover:scale-105 shadow-sm'
            }`}
            title="Suka tulisan ini"
        >
            <svg 
                className={`w-6 h-6 transition-transform duration-500 ${isAnimating ? 'animate-[ping_0.5s_ease-in-out]' : ''} ${hasLiked ? 'fill-current' : 'fill-none stroke-current group-hover:fill-current'}`} 
                viewBox="0 0 24 24" 
                strokeWidth={2}
            >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span className="font-medium text-lg">{post.likes}</span>
        </button>

        <button 
            onClick={handleShare}
            className="group flex items-center gap-2 px-6 py-3 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400 hover:scale-105 shadow-sm transition-all duration-300"
            title="Bagikan tulisan ini"
        >
            <svg className="w-6 h-6 stroke-current fill-none" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span className="font-medium text-lg">{post.shares}</span>
        </button>
      </div>

      {/* Comments Section */}
      <section className="pt-6 md:pt-10 space-y-6 md:space-y-8">
        <h3 className="text-xl md:text-2xl font-bold font-serif text-zinc-900 dark:text-zinc-100">
            Diskusi <span className="text-zinc-400 font-sans font-normal text-lg">({post.comments.length})</span>
        </h3>

        {/* Comment List */}
        <div className="space-y-4 md:space-y-6">
            {post.comments.length === 0 ? (
                <p className="text-zinc-500 italic">Belum ada komentar. Jadilah yang pertama!</p>
            ) : (
                post.comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 md:gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50">
                        <UserAvatar username={comment.authorUsername} />
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Link to={`/users/${comment.authorUsername}`} className="font-bold text-zinc-900 dark:text-zinc-100 hover:text-indigo-500 transition-colors text-sm">
                                    @{comment.authorUsername}
                                </Link>
                                <span className="text-xs text-zinc-400">• {new Date(comment.date).toLocaleDateString('id-ID')}</span>
                            </div>
                            <p className="text-zinc-700 dark:text-zinc-300 text-sm leading-relaxed">{comment.content}</p>
                        </div>
                    </div>
                ))
            )}
        </div>

        {/* Comment Form */}
        <div className="pt-4">
            {isLoggedIn ? (
                <form onSubmit={handleCommentSubmit} className="space-y-3">
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Tulis Komentar</label>
                    <textarea 
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none text-sm"
                        rows={3}
                        placeholder="Bagikan pemikiran Anda..."
                        required
                    />
                    <div className="flex justify-end">
                        <button 
                            type="submit" 
                            disabled={isSubmittingComment || !commentText.trim()}
                            className="px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isSubmittingComment ? 'Mengirim...' : 'Kirim Komentar'}
                        </button>
                    </div>
                </form>
            ) : (
                <div className="p-6 rounded-xl bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 text-center space-y-3">
                    <p className="text-zinc-700 dark:text-zinc-300">Ingin bergabung dalam diskusi?</p>
                    <Link to="/login" className="inline-block px-5 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                        Masuk untuk Berkomentar
                    </Link>
                </div>
            )}
        </div>
      </section>
    </article>
  );
};

export default WritingDetail;