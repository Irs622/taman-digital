import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Post } from '../types';
import { savePost, getPosts, deletePost, restorePost, permanentDeletePost, saveSnapshot, getSnapshot, clearSnapshot } from '../services/storageService';
import { polishText, generateSummary } from '../services/geminiService';
import { isAuthenticated, getCurrentUser, updateProfile } from '../services/authService';

const Admin: React.FC = () => {
  const navigate = useNavigate();
  
  // View State (Flow Logic)
  const [viewMode, setViewMode] = useState<'list' | 'editor'>('list');
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'published' | 'trash'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [tags, setTags] = useState('');
  const [date, setDate] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  
  // Enhanced Feedback State
  const [statusMessage, setStatusMessage] = useState<string>('');
  
  // Logic State
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [existingPosts, setExistingPosts] = useState<Post[]>([]);
  const [currentUserUsername, setCurrentUserUsername] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [quickIdea, setQuickIdea] = useState('');
  
  // Refs for timers and dirty checking
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Computed Text Stats
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const readTimeEst = Math.ceil(wordCount / 200);
  const longSentencesCount = content.split(/[.!?]+/).filter(s => s.trim().split(/\s+/).length > 30).length;

  // Check Auth & Onboarding Logic
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
    } else {
        const user = getCurrentUser();
        if (user) {
            setCurrentUserUsername(user.username);
            
            // Mini Onboarding Logic
            const userPosts = getPosts().filter(p => p.authorUsername === user.username);
            if (!user.hasOnboarded && userPosts.length === 0) {
                 updateProfile({ ...user, hasOnboarded: true });
            }
        }
    }
  }, [navigate]);

  // Load and Filter posts
  useEffect(() => {
      const allPosts = getPosts();
      if (currentUserUsername) {
          let userPosts = allPosts.filter(p => p.authorUsername === currentUserUsername);
          
          // Filter Logic
          if (filterStatus === 'trash') {
              userPosts = userPosts.filter(p => p.isDeleted === true);
          } else {
              userPosts = userPosts.filter(p => p.isDeleted !== true); // Not deleted
              if (filterStatus !== 'all') {
                  userPosts = userPosts.filter(p => p.status === filterStatus);
              }
          }

          // Search Logic
          if (searchQuery) {
              const lowerQ = searchQuery.toLowerCase();
              userPosts = userPosts.filter(p => 
                  p.title.toLowerCase().includes(lowerQ) || 
                  p.content.toLowerCase().includes(lowerQ)
              );
          }

          // Sort by last edited (Most recent first)
          userPosts.sort((a, b) => {
                const dateA = new Date(a.lastEdited || a.date).getTime();
                const dateB = new Date(b.lastEdited || b.date).getTime();
                return dateB - dateA;
          });
          
          setExistingPosts(userPosts);
      } else {
          setExistingPosts([]);
      }
  }, [currentUserUsername, editingId, isSaving, filterStatus, viewMode, searchQuery]);

  // --- SAFETY & SHORTCUTS LOGIC ---

  // 1. Prevent accidental exit if dirty
  useEffect(() => {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
          if (isDirty && viewMode === 'editor') {
              e.preventDefault();
              e.returnValue = '';
          }
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, viewMode]);

  // 2. Keyboard Shortcuts
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (viewMode === 'editor') {
              // Save: Ctrl/Cmd + S
              if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                  e.preventDefault();
                  handleSave(null, status);
              }
              // Escape Focus Mode
              if (e.key === 'Escape' && isFocusMode) {
                  setIsFocusMode(false);
              }
          } else {
              // New Post: Ctrl/Cmd + N (List Mode)
              if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                  e.preventDefault();
                  handleCreateNew();
              }
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, isFocusMode, title, content, excerpt, tags, status]); // Dependencies needed for save closure

  // 3. Auto-Save Snapshot & Reassurance
  useEffect(() => {
      if (viewMode === 'editor' && isDirty) {
          setStatusMessage('Mengetik...');
          
          if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
          
          autoSaveTimerRef.current = setTimeout(() => {
              const tempId = editingId || 'new_temp';
              saveSnapshot({
                  id: tempId,
                  title,
                  content,
                  excerpt,
                  tags: tags.split(','),
                  status
              });
              // Feedback halus tanpa mengganggu
              setStatusMessage('Tersimpan di memori sementara'); 
          }, 2000); 
      }
      return () => {
          if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      };
  }, [title, content, excerpt, tags, status, isDirty, editingId, viewMode]);


  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setExcerpt('');
    setTags('');
    setDate('');
    setStatus('draft');
    setStatusMessage('');
    setIsDirty(false);
  };

  const handleCreateNew = () => {
      // Recovery check for new post
      const snapshot = getSnapshot('new_temp');
      if (snapshot) {
          // Humane recovery message
          if (window.confirm('Syukurlah, kami menemukan tulisan baru yang belum sempat disimpan. Ingin melanjutkannya?')) {
              setTitle(snapshot.title || '');
              setContent(snapshot.content || '');
              setExcerpt(snapshot.excerpt || '');
              setTags(snapshot.tags?.join(', ') || '');
              setStatus(snapshot.status || 'draft');
              setEditingId(null); 
              setIsDirty(true);
              setStatusMessage('Tulisan berhasil dipulihkan.');
              setViewMode('editor');
              return;
          } else {
              clearSnapshot('new_temp');
          }
      }

      resetForm();
      setViewMode('editor');
  };

  const handleEdit = (post: Post) => {
    setEditingId(post.id);
    
    // Recovery check for specific post
    const snapshot = getSnapshot(post.id);
    // Logic: If snapshot exists and is newer than the saved post
    if (snapshot && snapshot.timestamp > new Date(post.lastEdited || post.date).getTime()) {
        if (window.confirm('Terdeteksi versi tulisan yang lebih baru di perangkat ini. Pulihkan versi terakhir?')) {
             setTitle(snapshot.title || '');
             setContent(snapshot.content || '');
             setExcerpt(snapshot.excerpt || '');
             setTags(snapshot.tags?.join(', ') || '');
             setStatus(snapshot.status || 'draft');
             setIsDirty(true); 
             setStatusMessage('Versi darurat berhasil dipulihkan.');
             setViewMode('editor');
             window.scrollTo({ top: 0, behavior: 'smooth' });
             return;
        } else {
            clearSnapshot(post.id);
        }
    }

    // Normal Load
    setTitle(post.title);
    setContent(post.content);
    setExcerpt(post.excerpt);
    setTags(post.tags.join(', '));
    setDate(post.date);
    setStatus(post.status || 'published');
    
    // Friendly status
    const savedTime = new Date(post.lastEdited || post.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    setStatusMessage(`Terakhir disimpan pukul ${savedTime}`);
    
    setIsDirty(false);
    
    setViewMode('editor');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToList = () => {
      if (isDirty) {
          // Exit Protection
          if (!window.confirm("Tulisan belum disimpan permanen. Jika keluar, Anda mungkin kehilangan perubahan terbaru.\n\nTetap keluar?")) return;
          // Clear snapshot if user explicitly discards
          if (editingId) clearSnapshot(editingId);
          else clearSnapshot('new_temp');
      }
      resetForm();
      setViewMode('list');
  };

  // --- TRASH LOGIC ---

  const handleDelete = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (filterStatus === 'trash') {
        // Permanent Delete
        if (window.confirm('Hapus selamanya? Data tidak bisa dikembalikan.')) {
            permanentDeletePost(id);
            setExistingPosts(prev => prev.filter(p => p.id !== id));
        }
    } else {
        // Soft Delete
        if (window.confirm('Pindahkan ke tempat sampah?')) {
            deletePost(id);
            // Optimistic update
            const allPosts = getPosts(); 
            // Trigger re-render via effect or manual set
            setExistingPosts(prev => prev.filter(p => p.id !== id));
            if (editingId === id) {
                resetForm();
                setViewMode('list');
            }
        }
    }
  };

  const handleRestore = (id: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      if (window.confirm('Kembalikan tulisan ini ke daftar utama?')) {
          restorePost(id);
          setExistingPosts(prev => prev.filter(p => p.id !== id));
      }
  };

  const handleArchive = (post: Post, e?: React.MouseEvent) => {
      e?.stopPropagation();
      const newStatus = post.status === 'published' ? 'draft' : 'published';
      
      let confirmText = '';
      if (newStatus === 'draft') {
          confirmText = 'Tarik kembali tulisan ini menjadi Draft? (Tidak akan terlihat publik)';
      } else {
          confirmText = 'Siap menerbitkan tulisan ini untuk dibaca dunia?';
      }
      
      if(window.confirm(confirmText)) {
          savePost({ ...post, status: newStatus });
          setExistingPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: newStatus } : p));
      }
  };

  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
      setter(value);
      setIsDirty(true);
  };

  const handleSave = async (e: React.SyntheticEvent | null, targetStatus: 'draft' | 'published') => {
    if (e) e.preventDefault();
    
    if (!currentUserUsername) {
        alert("Sesi telah berakhir demi keamanan. Mohon login kembali.");
        return;
    }

    // STRICT Manual Validation
    if (!title.trim()) {
        alert("Tulisan ini membutuhkan judul sebelum bisa disimpan.");
        return;
    }

    if (!content.trim()) {
        alert("Konten tulisan masih kosong.");
        return;
    }

    // Konfirmasi Publikasi (Updated Requirement)
    if (targetStatus === 'published' && status !== 'published') {
        if (!window.confirm("Terbitkan tulisan ini sekarang?")) {
            return;
        }
    }

    setIsSaving(true);
    setStatusMessage('Sedang menyimpan...');
    
    try {
        // Simulate network/process
        await new Promise(resolve => setTimeout(resolve, 600));

        // EDGE CASE: Connection Check
        if (!navigator.onLine) {
            setStatusMessage('Offline. Menyimpan di perangkat lokal...');
        }

        const originalPost = editingId ? existingPosts.find(p => p.id === editingId) : null; 
        const sourcePost = originalPost || (editingId ? getPosts().find(p => p.id === editingId) : null);

        const newPost: Post = {
        id: editingId || Date.now().toString(),
        title: title || 'Tanpa Judul',
        content,
        excerpt: excerpt || content.substring(0, 150) + '...',
        date: editingId && date ? date : new Date().toISOString(),
        readTime: `${Math.ceil(content.split(/\s+/).filter(Boolean).length / 200)} min baca`,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        likes: sourcePost ? sourcePost.likes : 0,
        shares: sourcePost ? sourcePost.shares : 0,
        authorUsername: sourcePost ? sourcePost.authorUsername : currentUserUsername,
        comments: sourcePost ? sourcePost.comments : [],
        status: targetStatus,
        isDeleted: false
        };

        savePost(newPost);
        
        // Clear snapshot
        if (editingId) clearSnapshot(editingId);
        else clearSnapshot('new_temp');

        const successTime = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        setStatusMessage(navigator.onLine ? `Aman tersimpan (${successTime})` : `Tersimpan di perangkat (${successTime})`);

        // Only redirect if explicitly asked or switching context significantly
        if (targetStatus === 'published') {
            setIsDirty(false);
            alert("Tulisan berhasil diterbitkan.");
            resetForm();
            setViewMode('list');
        } else {
             // For draft save, stay in editor but mark clean
             setStatus('draft');
             setEditingId(newPost.id); // Ensure we are editing the new ID if it was new
             setIsDirty(false);
        }
        
    } catch (error) {
        console.error("Save error:", error);
        setStatusMessage("Gagal menyimpan. Mencoba ulang...");
        // Retry logic simulation could go here, for now we warn user
        alert("Kendala teknis saat menyimpan. Data Anda aman di editor, silakan coba lagi sesaat lagi.");
    } finally {
        setIsSaving(false); 
    }
  };

  const handleQuickIdeaSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!quickIdea.trim()) return;

      const newPost: Post = {
          id: Date.now().toString(),
          title: 'Ide: ' + quickIdea.substring(0, 30) + (quickIdea.length > 30 ? '...' : ''),
          content: quickIdea,
          excerpt: quickIdea.substring(0, 100),
          date: new Date().toISOString(),
          readTime: '1 min baca',
          tags: ['Ide'],
          likes: 0,
          shares: 0,
          authorUsername: currentUserUsername,
          comments: [],
          status: 'draft',
          isDeleted: false
      };
      
      savePost(newPost);
      setQuickIdea('');
      setExistingPosts(prev => [newPost, ...prev]);
  };

  const handleAiPolish = async () => {
    if (!content) return;
    setIsProcessing(true);
    setStatusMessage('AI sedang membaca...');
    try {
      const polished = await polishText(content);
      setContent(polished);
      setIsDirty(true);
      setStatusMessage('Teks berhasil dipoles.');
    } catch (err) {
      setStatusMessage('AI sedang istirahat. Coba lagi nanti.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAiSummary = async () => {
      if (!content) return;
      setIsProcessing(true);
      setStatusMessage('Membuat ringkasan...');
      try {
          const summary = await generateSummary(content);
          setExcerpt(summary);
          setIsDirty(true);
          setStatusMessage('Ringkasan siap.');
      } catch (err) {
          setStatusMessage('Gagal membuat ringkasan.');
      } finally {
          setIsProcessing(false);
      }
  }

  // --- RENDER: LIST MODE ---
  if (viewMode === 'list') {
      return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            {/* Header List */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
                <div>
                    <h1 className="text-3xl font-serif font-bold text-zinc-900 dark:text-zinc-50">Daftar Tulisan</h1>
                    <p className="text-zinc-600 dark:text-zinc-400 text-sm mt-1">Kelola seluruh karya tulis Anda.</p>
                </div>
                <button 
                    onClick={handleCreateNew}
                    aria-label="Buat Tulisan Baru"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 transition-all font-medium shadow-lg hover:-translate-y-0.5"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Buat Tulisan
                </button>
            </div>

            {/* Quick Idea Input */}
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                <form onSubmit={handleQuickIdeaSubmit} className="flex gap-2">
                    <input 
                        type="text" 
                        value={quickIdea}
                        onChange={(e) => setQuickIdea(e.target.value)}
                        placeholder="Sekilas ide yang lewat? Tangkap di sini..." 
                        className="flex-1 bg-transparent outline-none text-sm text-zinc-700 dark:text-zinc-300 placeholder-zinc-400"
                    />
                    <button 
                        type="submit" 
                        disabled={!quickIdea.trim()}
                        className="text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider disabled:opacity-50 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 px-3 py-1 rounded transition-colors"
                    >
                        Simpan Ide
                    </button>
                </form>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-1">
                <div className="flex gap-2 overflow-x-auto">
                    {(['all', 'published', 'draft', 'trash'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilterStatus(f)}
                            aria-label={`Filter ${f}`}
                            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors relative top-[1px] ${
                                filterStatus === f
                                    ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 bg-zinc-50 dark:bg-zinc-900/50'
                                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
                            }`}
                        >
                            {f === 'all' ? 'Semua' : f === 'published' ? 'Terbit' : f === 'draft' ? 'Draft' : 'Sampah'}
                        </button>
                    ))}
                </div>
                <div className="relative mb-2 md:mb-0">
                    <input 
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Cari tulisan..."
                        className="pl-9 pr-4 py-1.5 text-sm rounded-lg bg-zinc-100 dark:bg-zinc-800 border-none focus:ring-1 focus:ring-indigo-500 w-full md:w-64"
                    />
                    <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
            </div>

            {/* Post List */}
            <div className="space-y-4">
                {existingPosts.length === 0 ? (
                    <div className="text-center py-20 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-900/30">
                        <p className="text-zinc-500 font-serif italic text-lg mb-2">
                            {filterStatus === 'trash' ? '"Sampah kosong adalah pikiran yang jernih."' : '"Taman ini masih sunyi."'}
                        </p>
                        {filterStatus !== 'trash' && <p className="text-zinc-400 text-sm">Satu tulisan kecil akan mengubah segalanya.</p>}
                        {filterStatus !== 'all' && (
                            <button onClick={() => setFilterStatus('all')} className="mt-4 text-xs text-indigo-600 hover:underline">
                                Hapus filter
                            </button>
                        )}
                    </div>
                ) : (
                    existingPosts.map(post => (
                        <div 
                            key={post.id} 
                            onClick={filterStatus !== 'trash' ? () => handleEdit(post) : undefined}
                            className={`group flex flex-col md:flex-row md:items-center justify-between p-5 bg-white/50 dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800 transition-all ${filterStatus !== 'trash' ? 'hover:border-indigo-300 dark:hover:border-indigo-700 cursor-pointer hover:shadow-md' : 'opacity-75'}`}
                        >
                            <div className="space-y-2 flex-1 pr-4">
                                <div className="flex items-center gap-2 flex-wrap">
                                     <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                         {post.title}
                                     </h3>
                                     {post.status === 'draft' && !post.isDeleted ? (
                                         <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-500 tracking-wide border border-yellow-200 dark:border-yellow-900/50">
                                             Draft
                                         </span>
                                     ) : post.status === 'published' && !post.isDeleted ? (
                                         <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-500 tracking-wide border border-emerald-200 dark:border-emerald-900/50">
                                             Terbit
                                         </span>
                                     ) : post.isDeleted ? (
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-500 tracking-wide border border-rose-200 dark:border-rose-900/50">
                                            Dihapus
                                        </span>
                                     ) : null}
                                </div>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">
                                    {post.excerpt}
                                </p>
                                <div className="flex items-center gap-3 text-xs text-zinc-400 pt-1">
                                    <span>{new Date(post.lastEdited || post.date).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit'})}</span>
                                    {!post.isDeleted && (
                                        <>
                                            <span>•</span>
                                            <span className="flex items-center gap-0.5">
                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                                                {post.likes}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mt-4 md:mt-0 md:border-l md:pl-4 border-zinc-200 dark:border-zinc-800">
                                {filterStatus === 'trash' ? (
                                    <>
                                        <button
                                            onClick={(e) => handleRestore(post.id, e)}
                                            aria-label="Pulihkan"
                                            className="p-2 text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
                                            title="Pulihkan"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                        </button>
                                        <button
                                            onClick={(e) => handleDelete(post.id, e)}
                                            aria-label="Hapus Permanen"
                                            className="p-2 text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
                                            title="Hapus Permanen"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleEdit(post); }}
                                            aria-label="Edit Tulisan"
                                            className="p-2 text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
                                            title="Edit"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                        </button>
                                        <button
                                            onClick={(e) => handleArchive(post, e)}
                                            aria-label={post.status === 'published' ? "Arsip ke Draft" : "Publikasikan"}
                                            className="p-2 text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
                                            title={post.status === 'published' ? "Arsip ke Draft" : "Publikasikan"}
                                        >
                                            {post.status === 'published' ? (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                                            ) : (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                            )}
                                        </button>
                                        <button
                                            onClick={(e) => handleDelete(post.id, e)}
                                            aria-label="Pindahkan ke Sampah"
                                            className="p-2 text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors"
                                            title="Hapus"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
            
            {/* Spacer for mobile bottom nav */}
            <div className="h-20 md:h-0"></div>
        </div>
      );
  }

  // --- RENDER: EDITOR MODE ---
  return (
    <div className="max-w-4xl mx-auto space-y-16">
      <section className="space-y-8 animate-fade-in relative z-20">
        <div className="flex items-center justify-between sticky top-0 bg-gray-50 dark:bg-zinc-950 py-4 z-40 transition-colors">
            <div className="flex items-center gap-4">
                <button 
                    onClick={handleBackToList}
                    aria-label="Kembali ke Daftar"
                    className="p-2 -ml-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    title="Kembali ke daftar"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </button>
                <div>
                     <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                        {editingId ? 'Edit Entri' : 'Entri Baru'}
                    </h1>
                    <div className="flex items-center gap-2 text-xs font-medium">
                        {isDirty ? (
                            <span className="text-amber-600 dark:text-amber-500 animate-pulse font-semibold">{statusMessage || 'Mengetik...'}</span>
                        ) : (
                            <span className="text-zinc-400">{statusMessage || `Aman.`}</span>
                        )}
                        <span className="text-zinc-300 dark:text-zinc-700">|</span>
                        <span className="text-zinc-500 dark:text-zinc-400">{wordCount} kata</span>
                        <span className="text-zinc-300 dark:text-zinc-700">|</span>
                        <span className="text-zinc-500 dark:text-zinc-400">~{readTimeEst} min</span>
                    </div>
                </div>
            </div>
            
            <div className="flex gap-4">
                <button 
                    onClick={() => setIsFocusMode(!isFocusMode)}
                    aria-label="Toggle Mode Fokus"
                    className={`text-sm font-medium transition-colors ${isFocusMode ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'}`}
                    title="Mode Fokus (Esc untuk keluar)"
                >
                    {isFocusMode ? 'Keluar Mode Fokus' : 'Mode Fokus'}
                </button>
            </div>
        </div>
        
        {/* Changed from <form> to <div> to stop browser validation blocking clicks */}
        <div className="space-y-6">
            {!isFocusMode && (
                <div className="space-y-2 animate-fade-in">
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Judul</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => handleInputChange(setTitle, e.target.value)}
                        className="w-full px-4 py-3 text-lg font-bold rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        placeholder="Keindahan dari..."
                    />
                </div>
            )}

            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Konten</label>
                    <button
                        type="button"
                        onClick={handleAiPolish}
                        disabled={isProcessing || !content}
                        className="text-xs flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 disabled:opacity-50 font-medium"
                    >
                        {isProcessing ? (
                            <span className="animate-pulse">Berpikir...</span>
                        ) : (
                            <>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                AI Poles
                            </>
                        )}
                    </button>
                </div>
            <textarea
                value={content}
                onChange={(e) => handleInputChange(setContent, e.target.value)}
                rows={isFocusMode ? 20 : 12}
                className="w-full px-4 py-4 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-serif text-lg leading-relaxed"
                placeholder="Tulis pemikiranmu..."
            />
            {longSentencesCount > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                    Catatan: Terdeteksi {longSentencesCount} kalimat yang sangat panjang (30 kata). Pertimbangkan untuk memecahnya agar lebih nyaman dibaca.
                </p>
            )}
            </div>

            {!isFocusMode && (
                <>
                    <div className="space-y-2 animate-fade-in">
                        <div className="flex justify-between items-center">
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Ringkasan</label>
                            <button
                                type="button"
                                onClick={handleAiSummary}
                                disabled={isProcessing || !content}
                                className="text-xs flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 disabled:opacity-50 font-medium"
                            >
                                {isProcessing ? 'Berpikir...' : 'AI Ringkas'}
                            </button>
                        </div>
                    <textarea
                        value={excerpt}
                        onChange={(e) => handleInputChange(setExcerpt, e.target.value)}
                        rows={3}
                        className="w-full px-4 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        placeholder="Ringkasan singkat yang ditampilkan di daftar..."
                    />
                    </div>

                    <div className="space-y-2 animate-fade-in">
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Tag (pisahkan dengan koma)</label>
                    <input
                        type="text"
                        value={tags}
                        onChange={(e) => handleInputChange(setTags, e.target.value)}
                        className="w-full px-4 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        placeholder="desain, kode, hidup"
                    />
                    </div>
                </>
            )}

            <div className="pt-4 flex gap-4 relative z-30">
                <button
                    type="button"
                    onClick={(e) => handleSave(e, 'draft')}
                    disabled={isSaving}
                    aria-label="Simpan Draft"
                    className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 rounded-lg font-medium hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50 cursor-pointer active:scale-95 transform"
                >
                    {isSaving ? 'Menyimpan...' : 'Simpan Draft'}
                </button>
                <button
                    type="button"
                    onClick={(e) => handleSave(e, 'published')}
                    disabled={isSaving}
                    aria-label="Publikasikan"
                    className="flex-1 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 disabled:opacity-50 cursor-pointer active:scale-95 transform"
                >
                    {isSaving ? 'Memproses...' : (status === 'published' ? 'Perbarui' : 'Terbitkan')}
                </button>
            </div>
        </div>
        
        {/* Spacer for fixed bottom on mobile to ensure buttons are clickable */}
        <div className="h-28 md:h-0"></div>
      </section>
    </div>
  );
};

export default Admin;