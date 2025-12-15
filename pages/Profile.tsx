import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getCurrentUser, updateProfile, isAuthenticated, deleteUser, getUsers } from '../services/authService';
import { getPostsByUsername, getUserStats, getPostById, downloadPostAsMarkdown, getUserInsights } from '../services/storageService';
import { User, Post } from '../types';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Data for View Mode
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState({ 
      totalPosts: 0, 
      totalWords: 0, 
      publishedCount: 0, 
      lastActive: null as string | null,
      productiveDay: '-',
      timeOfDay: '-'
  });
  const [featuredPosts, setFeaturedPosts] = useState<Post[]>([]);
  const [insightText, setInsightText] = useState('');

  // Form Data for Edit Mode
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    bio: '',
    penName: '',
    writingThemes: '',
    writingStyle: 'Deskriptif',
    isPublic: true,
    showBio: true,
    showStats: true,
    password: '',
    newPassword: '',
    profilePicture: ''
  });
  
  const [selectedFeaturedIds, setSelectedFeaturedIds] = useState<string[]>([]);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Delete Account State
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // --- INITIALIZATION ---
  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login');
      return;
    }
    loadUserData();
  }, [navigate]);

  const loadUserData = () => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      
      // Load Posts & Stats
      const myPosts = getPostsByUsername(currentUser.username, true); // Load drafts for internal list
      setUserPosts(myPosts);
      setStats(getUserStats(currentUser.username));
      setInsightText(getUserInsights(currentUser.username));

      // Load Featured Posts Objects
      const featIds = currentUser.featuredPostIds || [];
      const featPosts = featIds.map(id => getPostById(id)).filter((p): p is Post => !!p);
      setFeaturedPosts(featPosts);

      // Prepare Form Data
      setFormData({
        name: currentUser.name,
        email: currentUser.email || '',
        username: currentUser.username,
        bio: currentUser.bio || '',
        penName: currentUser.penName || '',
        writingThemes: currentUser.writingThemes?.join(', ') || '',
        writingStyle: currentUser.writingStyle || 'Deskriptif',
        isPublic: currentUser.isPublic ?? true,
        showBio: currentUser.showBio ?? true,
        showStats: currentUser.showStats ?? true,
        password: '',
        newPassword: '',
        profilePicture: currentUser.profilePicture || ''
      });
      setSelectedFeaturedIds(currentUser.featuredPostIds || []);
    }
  };

  // --- HANDLERS ---
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        const checked = (e.target as HTMLInputElement).checked;
        setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
    setMessage({ type: '', text: '' });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.size > 500000) { // Limit 500KB
              setMessage({ type: 'error', text: 'Ukuran gambar maksimal 500KB.' });
              return;
          }
          const reader = new FileReader();
          reader.onloadend = () => {
              setFormData(prev => ({ ...prev, profilePicture: reader.result as string }));
          };
          reader.readAsDataURL(file);
      }
  };

  const handleFeaturedToggle = (postId: string) => {
      setSelectedFeaturedIds(prev => {
          if (prev.includes(postId)) {
              return prev.filter(id => id !== postId);
          } else {
              if (prev.length >= 3) {
                  alert("Maksimal 3 karya unggulan.");
                  return prev;
              }
              return [...prev, postId];
          }
      });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Password validation
    let finalPassword = user.password;
    if (formData.newPassword) {
      if (formData.password !== user.password) {
        setMessage({ type: 'error', text: 'Kata sandi saat ini salah.' });
        return;
      }
      finalPassword = formData.newPassword;
    }

    const updatedUser: User = {
      ...user,
      name: formData.name,
      email: formData.email,
      bio: formData.bio,
      penName: formData.penName,
      writingThemes: formData.writingThemes.split(',').map(s => s.trim()).filter(Boolean),
      writingStyle: formData.writingStyle,
      featuredPostIds: selectedFeaturedIds,
      isPublic: formData.isPublic,
      showBio: formData.showBio,
      showStats: formData.showStats,
      password: finalPassword,
      profilePicture: formData.profilePicture
    };

    updateProfile(updatedUser);
    setUser(updatedUser); // Update local state immediately
    loadUserData(); // Reload derived data like featured posts list
    
    setFormData(prev => ({ ...prev, password: '', newPassword: '' }));
    setIsEditing(false); // Switch back to View Mode
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteAccount = () => {
      if (user) {
          if (deletePassword !== user.password) {
              setDeleteError("Kata sandi salah. Gagal menghapus akun.");
              return;
          }
          deleteUser(user.username);
          navigate('/login');
      }
  };

  const handleExport = (post: Post) => {
      downloadPostAsMarkdown(post);
      alert("Tulisan berhasil diunduh ke perangkat Anda.");
  };

  const handleExportAll = () => {
      if (!user) return;
      const allData = {
          user: user,
          posts: userPosts,
          exportedAt: new Date().toISOString()
      };
      
      const jsonString = JSON.stringify(allData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${user.username}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert("Seluruh data berhasil diamankan. Anda memegang kendali penuh atas karya Anda.");
  };

  if (!user) return null;

  // --- RENDER VIEW MODE ---
  if (!isEditing) {
    return (
      <div className="max-w-3xl mx-auto space-y-10 animate-fade-in">
        {/* Header View */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
          <div className="space-y-1">
              <h1 className="text-3xl font-serif font-bold text-zinc-900 dark:text-zinc-50">Profil Saya</h1>
              <p className="text-zinc-600 dark:text-zinc-400 text-sm">Tampilan profil Anda saat ini.</p>
          </div>
          <div className="flex gap-3">
            <Link 
                to={`/users/${user.username}`}
                target="_blank"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-sm font-medium"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                Lihat Publik
            </Link>
            <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center justify-center gap-2 px-6 py-2 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90 transition-all text-sm font-medium shadow-lg"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                Edit Profil
            </button>
          </div>
        </header>

        {/* Identity Card */}
        <section className="flex flex-col md:flex-row gap-8 items-center md:items-start bg-white/50 dark:bg-zinc-900/50 p-8 rounded-2xl border border-zinc-100 dark:border-zinc-800 backdrop-blur-sm">
             <div className="shrink-0 relative">
                 <div className="w-28 h-28 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden border-4 border-white dark:border-zinc-700 shadow-lg">
                    {user.profilePicture ? (
                        <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-zinc-400">{user.name.charAt(0)}</div>
                    )}
                 </div>
                 {!user.isPublic && (
                     <div className="absolute bottom-0 right-0 bg-zinc-600 text-white p-1.5 rounded-full border-2 border-white dark:border-zinc-900" title="Profil Privat">
                         <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                     </div>
                 )}
             </div>
             
             <div className="flex-1 text-center md:text-left space-y-4">
                 <div>
                    <h2 className="text-3xl font-serif font-bold text-zinc-900 dark:text-zinc-50">{user.name}</h2>
                    <div className="flex flex-col md:flex-row items-center gap-2 text-zinc-500 dark:text-zinc-400 text-sm mt-1">
                        <span>@{user.username}</span>
                        {user.penName && (
                            <>
                                <span className="hidden md:inline">•</span>
                                <span className="text-indigo-600 dark:text-indigo-400 font-medium">Pen: {user.penName}</span>
                            </>
                        )}
                        {user.email && (
                            <>
                                <span className="hidden md:inline">•</span>
                                <span>{user.email}</span>
                            </>
                        )}
                    </div>
                 </div>

                 {user.bio ? (
                     <p className="text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-lg mx-auto md:mx-0">{user.bio}</p>
                 ) : (
                     <p className="text-zinc-400 italic text-sm">Belum ada bio.</p>
                 )}

                 <div className="flex flex-wrap justify-center md:justify-start gap-2">
                     {user.writingThemes && user.writingThemes.map(theme => (
                         <span key={theme} className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs rounded-full font-medium">
                             {theme}
                         </span>
                     ))}
                     {user.writingStyle && (
                         <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 text-xs rounded-full font-medium border border-indigo-100 dark:border-indigo-900/30">
                             Gaya: {user.writingStyle}
                         </span>
                     )}
                 </div>
             </div>
        </section>

        {/* Stats Row & Insight */}
        <section className="space-y-4">
            {insightText && (
                 <div className="p-4 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 text-indigo-800 dark:text-indigo-300 text-sm text-center font-serif italic">
                     "{insightText}"
                 </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-sm text-center">
                    <span className="block text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.totalPosts}</span>
                    <span className="text-xs text-zinc-500 uppercase tracking-wide">Karya</span>
                </div>
                <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-sm text-center">
                    <span className="block text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.totalWords.toLocaleString()}</span>
                    <span className="text-xs text-zinc-500 uppercase tracking-wide">Kata</span>
                </div>
                <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-sm text-center">
                    <span className="block text-xl font-bold text-zinc-900 dark:text-zinc-100 truncate" title={stats.productiveDay}>{stats.productiveDay}</span>
                    <span className="text-xs text-zinc-500 uppercase tracking-wide">Hari Produktif</span>
                </div>
                <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-sm text-center">
                    <span className="block text-xl font-bold text-zinc-900 dark:text-zinc-100 truncate" title={stats.timeOfDay}>{stats.timeOfDay}</span>
                    <span className="text-xs text-zinc-500 uppercase tracking-wide">Jam Dominan</span>
                </div>
            </div>
        </section>

        {/* Featured Works */}
        <section>
             <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4 border-l-4 border-indigo-500 pl-3">Karya Unggulan</h3>
             {featuredPosts.length === 0 ? (
                 <div className="p-8 text-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-500">
                     <p className="mb-2 italic">"Taman depan masih kosong."</p>
                     <p className="text-xs mb-4">Pilih karya terbaikmu untuk menyapa pengunjung.</p>
                     <button onClick={() => setIsEditing(true)} className="text-indigo-600 hover:underline text-sm font-medium">Pilih di Edit Profil</button>
                 </div>
             ) : (
                 <div className="grid gap-4 md:grid-cols-3">
                     {featuredPosts.map(post => (
                         <div key={post.id} className="block p-5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 hover:shadow-lg hover:border-indigo-100 dark:hover:border-indigo-900/50 transition-all group relative">
                             <Link to={`/writing/${post.id}`}>
                                <h4 className="font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 mb-2 line-clamp-1">{post.title}</h4>
                                <p className="text-xs text-zinc-500 mb-3 line-clamp-2">{post.excerpt}</p>
                                <div className="flex items-center gap-2 text-xs text-zinc-400">
                                    <span>{new Date(post.date).toLocaleDateString()}</span>
                                    <span>•</span>
                                    <span>{post.readTime}</span>
                                </div>
                             </Link>
                             <button 
                                onClick={() => handleExport(post)}
                                className="absolute top-4 right-4 text-zinc-300 hover:text-indigo-600 transition-colors"
                                title="Amankan Data (Markdown)"
                             >
                                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                             </button>
                         </div>
                     ))}
                 </div>
             )}
        </section>
      </div>
    );
  }

  // --- RENDER EDIT MODE ---
  return (
    <div className="max-w-3xl mx-auto space-y-10 animate-fade-in">
      
      {/* 1. Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <div className="space-y-1">
            <h1 className="text-3xl font-serif font-bold text-zinc-900 dark:text-zinc-50">Edit Profil</h1>
            <p className="text-zinc-600 dark:text-zinc-400 text-sm">Sesuaikan informasi pribadi dan identitas penulis Anda.</p>
        </div>
        <button 
            onClick={() => {
                setIsEditing(false);
                setConfirmDelete(false);
                setDeletePassword('');
                setDeleteError('');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300"
        >
            Batal
        </button>
      </header>

      {message.text && (
            <div className={`p-4 rounded-xl text-center font-medium ${message.type === 'error' ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'}`}>
                {message.text}
            </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-12">
        
        {/* 2. Info Dasar */}
        <section className="space-y-6">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-700 pb-2">Info Dasar</h2>
            
            <div className="flex flex-col md:flex-row gap-8 items-start">
                {/* Avatar */}
                <div className="flex flex-col items-center gap-3 shrink-0 mx-auto md:mx-0">
                    <div className="w-28 h-28 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center overflow-hidden border-4 border-white dark:border-zinc-700 shadow-lg">
                        {formData.profilePicture ? (
                            <img src={formData.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-4xl font-bold text-zinc-400">{user.name.charAt(0)}</span>
                        )}
                    </div>
                    <label className="cursor-pointer text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
                        Ubah Foto
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </label>
                </div>

                {/* Fields */}
                <div className="flex-1 w-full grid md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Nama Lengkap</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full px-4 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Username</label>
                        <input type="text" value={formData.username} disabled className="w-full px-4 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-transparent cursor-not-allowed" />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Email</label>
                        <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="alamat@email.com" className="w-full px-4 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                        <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Bio Singkat</label>
                        <textarea name="bio" value={formData.bio} onChange={handleChange} rows={3} placeholder="Ceritakan sedikit tentang diri Anda..." className="w-full px-4 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-indigo-500 outline-none resize-none" />
                    </div>
                </div>
            </div>
        </section>

        {/* 3. Identitas Penulis */}
        <section className="space-y-6">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-700 pb-2">Identitas Penulis</h2>
            <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Nama Pena (Opsional)</label>
                    <input type="text" name="penName" value={formData.penName} onChange={handleChange} placeholder={formData.penName ? "" : "Cth: Sang Pemimpi (Disarankan)"} className="w-full px-4 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-indigo-500 outline-none" />
                    {!formData.penName && <p className="text-[10px] text-indigo-500">Memberi identitas unik pada suaramu.</p>}
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Tema Tulisan</label>
                    <input type="text" name="writingThemes" value={formData.writingThemes} onChange={handleChange} placeholder="Cth: Fiksi, Puisi, Esai" className="w-full px-4 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-indigo-500 outline-none" />
                    <p className="text-[10px] text-zinc-400">Pisahkan dengan koma</p>
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Gaya Menulis</label>
                    <select name="writingStyle" value={formData.writingStyle} onChange={handleChange} className="w-full px-4 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-indigo-500 outline-none">
                        <option value="Deskriptif">Deskriptif</option>
                        <option value="Naratif">Naratif</option>
                        <option value="Persuasif">Persuasif</option>
                        <option value="Ekspositori">Ekspositori</option>
                        <option value="Puitis">Puitis</option>
                        <option value="Jurnalistik">Jurnalistik</option>
                    </select>
                </div>
            </div>
        </section>

        {/* 4. Statistik (Info only in edit) */}
        <section className="space-y-6">
             <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-700 pb-2">Statistik</h2>
             <p className="text-sm text-zinc-500">Statistik akan dihitung secara otomatis berdasarkan aktivitas Anda.</p>
        </section>

        {/* 5. Karya Unggulan */}
        <section className="space-y-6">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-700 pb-2">Pilih Karya Unggulan</h2>
            <p className="text-sm text-zinc-500">Pilih hingga 3 karya untuk ditampilkan di profil publik Anda.</p>
            
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {userPosts.filter(p => p.status === 'published').length === 0 ? (
                    <p className="text-zinc-400 italic text-sm">Belum ada karya tulis yang diterbitkan.</p>
                ) : (
                    userPosts.filter(p => p.status === 'published').map(post => (
                        <label key={post.id} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${selectedFeaturedIds.includes(post.id) ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>
                            <div className="flex items-center gap-3">
                                <input 
                                    type="checkbox" 
                                    checked={selectedFeaturedIds.includes(post.id)} 
                                    onChange={() => handleFeaturedToggle(post.id)}
                                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                />
                                <div>
                                    <span className="block font-medium text-sm text-zinc-900 dark:text-zinc-100">{post.title}</span>
                                    <span className="text-xs text-zinc-500">{new Date(post.date).toLocaleDateString()}</span>
                                </div>
                            </div>
                            {selectedFeaturedIds.includes(post.id) && (
                                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/50 px-2 py-1 rounded">Terpilih</span>
                            )}
                        </label>
                    ))
                )}
            </div>
        </section>

        {/* 6. Privasi & Visibilitas */}
        <section className="space-y-6">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-700 pb-2">Privasi & Visibilitas</h2>
            
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <span className="block font-medium text-zinc-900 dark:text-zinc-100">Profil Publik</span>
                        <span className="text-xs text-zinc-500">Izinkan orang lain melihat profil Anda di pencarian.</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" name="isPublic" checked={formData.isPublic} onChange={handleChange} className="sr-only peer" />
                        <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                    </label>
                </div>
                
                <div className="flex items-center justify-between">
                    <div>
                        <span className="block font-medium text-zinc-900 dark:text-zinc-100">Tampilkan Bio</span>
                        <span className="text-xs text-zinc-500">Tampilkan bio singkat di profil publik.</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" name="showBio" checked={formData.showBio} onChange={handleChange} className="sr-only peer" />
                        <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                    </label>
                </div>

                <div className="flex items-center justify-between">
                    <div>
                        <span className="block font-medium text-zinc-900 dark:text-zinc-100">Tampilkan Statistik</span>
                        <span className="text-xs text-zinc-500">Perlihatkan jumlah karya dan kata kepada publik.</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" name="showStats" checked={formData.showStats} onChange={handleChange} className="sr-only peer" />
                        <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                    </label>
                </div>
            </div>
        </section>

        {/* 7. Data Backup */}
        <section className="space-y-6">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-700 pb-2">Hak Milik Data (Backup)</h2>
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <div>
                     <span className="block font-medium text-zinc-900 dark:text-zinc-100">Amankan Data Anda</span>
                     <span className="text-xs text-zinc-500">Unduh salinan lengkap JSON. Tulisan Anda adalah milik Anda sepenuhnya.</span>
                </div>
                <button
                    type="button"
                    onClick={handleExportAll}
                    className="px-4 py-2 text-xs font-bold bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                >
                    Backup Sekarang
                </button>
            </div>
        </section>

        {/* 8. Keamanan Akun */}
        <section className="space-y-6">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-700 pb-2">Keamanan Akun</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Kata Sandi Saat Ini</label>
                    <input type="password" name="password" value={formData.password} onChange={handleChange} className="w-full px-4 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Diperlukan untuk ubah password" />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Kata Sandi Baru</label>
                    <input type="password" name="newPassword" value={formData.newPassword} onChange={handleChange} className="w-full px-4 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Kosongkan jika tidak ingin ubah" />
                </div>
            </div>

            <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
                {!confirmDelete ? (
                    <button 
                        type="button" 
                        onClick={() => setConfirmDelete(true)}
                        className="text-sm font-medium text-rose-600 dark:text-rose-400 hover:underline"
                    >
                        Hapus Akun
                    </button>
                ) : (
                    <div className="p-4 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-lg space-y-4 animate-fade-in">
                        <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
                            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            <span className="font-bold text-sm">Hapus Akun Permanen?</span>
                        </div>
                        <p className="text-xs text-rose-600 dark:text-rose-300">
                            Tindakan ini tidak dapat dibatalkan. Semua tulisan, komentar, dan data Anda akan dihapus selamanya.
                        </p>
                        
                        <div className="space-y-2">
                             <input 
                                type="password" 
                                value={deletePassword}
                                onChange={(e) => {
                                    setDeletePassword(e.target.value);
                                    setDeleteError('');
                                }}
                                className="w-full px-3 py-2 rounded border border-rose-200 dark:border-rose-800 bg-white dark:bg-zinc-900 text-sm outline-none focus:ring-2 focus:ring-rose-500"
                                placeholder="Konfirmasi kata sandi Anda"
                             />
                             {deleteError && <p className="text-xs text-rose-600 font-bold">{deleteError}</p>}
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button 
                                type="button" 
                                onClick={() => {
                                    setConfirmDelete(false);
                                    setDeletePassword('');
                                    setDeleteError('');
                                }} 
                                className="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:underline"
                            >
                                Batal
                            </button>
                            <button 
                                type="button" 
                                onClick={handleDeleteAccount} 
                                disabled={!deletePassword}
                                className="text-xs font-bold text-white bg-rose-600 px-4 py-2 rounded hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Ya, Hapus Selamanya
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </section>

        {/* Submit Button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-lg border-t border-zinc-200 dark:border-zinc-800 z-40 md:static md:bg-transparent md:border-0 md:p-0">
             <div className="max-w-3xl mx-auto">
                <button
                    type="submit"
                    className="w-full py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
                >
                    Simpan Perubahan
                </button>
             </div>
        </div>

      </form>
      <div className="h-16 md:h-0"></div> {/* Spacer for fixed bottom on mobile */}
    </div>
  );
};

export default Profile;