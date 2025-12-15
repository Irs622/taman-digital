import { Post, Comment, Message } from '../types';

const STORAGE_KEY = 'lumina_posts';
const MESSAGES_KEY = 'lumina_messages';
const SNAPSHOT_KEY_PREFIX = 'lumina_snapshot_';
const CURRENT_SCHEMA_VERSION = 1;

// Default mock author
const DEFAULT_AUTHOR = 'irsal'; 

const MOCK_POSTS: Post[] = [
  {
    id: '1',
    title: 'Seni Desain Minimalis',
    excerpt: 'Menjelajahi mengapa "kurang" seringkali berarti "lebih" dalam antarmuka digital dan beban kognitif.',
    content: `Minimalisme bukan hanya tentang menghilangkan elemen; ini tentang memperkuat apa yang penting. Di dunia yang jenuh dengan informasi, kejelasan adalah kemewahan tertinggi.

Ketika kita mendesain dengan pengendalian diri, kita memaksa diri kita untuk membuat keputusan yang lebih sulit. Apa yang esensial? Apa yang hanya hiasan? Setiap piksel yang ditambahkan mengurangi penonjolan dari segala hal lainnya.

### Biaya kognitif dari kekacauan

Pengguna datang ke aplikasi kita dengan cadangan perhatian yang terbatas. Antarmuka yang kompleks membebani cadangan ini dengan segera. Dengan mengurangi gangguan visual—menggunakan ruang kosong, tipografi yang halus, dan jarak yang konsisten—kita menghormati energi mental pengguna.

> "Kesempurnaan dicapai, bukan ketika tidak ada lagi yang bisa ditambahkan, tetapi ketika tidak ada lagi yang bisa diambil." - Antoine de Saint-Exupéry

Filosofi ini meluas lebih dari sekadar piksel. Ini memengaruhi cara kita menulis kode, cara kita mengatur hari-hari kita, dan cara kita berkomunikasi. Kesederhanaan adalah sebuah disiplin.`,
    date: new Date(Date.now() - 86400000 * 2).toISOString(),
    readTime: '3 min baca',
    tags: ['Desain', 'Filosofi'],
    likes: 42,
    shares: 12,
    authorUsername: DEFAULT_AUTHOR,
    comments: [
        { id: 'c1', authorUsername: 'pengunjung', content: 'Tulisan yang sangat membuka wawasan!', date: new Date(Date.now() - 80000000).toISOString() }
    ],
    status: 'published',
    isDeleted: false,
    schemaVersion: 1
  },
  {
    id: '2',
    title: 'Refleksi tentang Glassmorphism',
    excerpt: 'Bagaimana transluensi dan blur menciptakan kedalaman dan hierarki dalam aplikasi web modern.',
    content: `Glassmorphism telah kembali, berevolusi dari estetika kaca buram antarmuka OS awal menjadi alat yang canggih untuk membangun hierarki.

Dengan melapisi permukaan yang tembus cahaya, kita dapat menciptakan rasa kedalaman tanpa bergantung pada bayangan jatuh yang berat atau batas yang kaku. Ini meniru dunia fisik—melihat melalui jendela, melihat latar belakang yang kabur. Koneksi ke realitas ini membumikan antarmuka pengguna.

Ini sangat cocok dengan mode gelap, di mana sumber cahaya dapat menciptakan sorotan spekular halus pada tepi "kaca", membuat UI terasa premium dan taktil.`,
    date: new Date(Date.now() - 86400000 * 5).toISOString(),
    readTime: '2 min baca',
    tags: ['UI', 'Tren'],
    likes: 28,
    shares: 5,
    authorUsername: DEFAULT_AUTHOR,
    comments: [],
    status: 'published',
    isDeleted: false,
    schemaVersion: 1
  },
  {
    id: '3',
    title: 'Keheningan dalam Kode',
    excerpt: 'Mengapa komentar harus menjelaskan "mengapa", bukan "bagaimana", dan keindahan logika yang mendokumentasikan dirinya sendiri.',
    content: `Kita sering berbicara tentang kode yang bersih, tetapi seperti apa suaranya? Suaranya seperti keheningan. Itu adalah ketiadaan gesekan saat membaca sebuah fungsi.

Jika Anda harus berhenti untuk memecahkan kode nama variabel, itu adalah kebisingan. Jika Anda harus melompat ke tiga file berbeda untuk memahami perubahan status, itu adalah statis.

Menulis kode adalah bentuk komunikasi dengan diri masa depan Anda dan tim Anda. Perlakukan itu dengan perhatian yang sama seperti Anda menulis surat.`,
    date: new Date(Date.now() - 86400000 * 10).toISOString(),
    readTime: '4 min baca',
    tags: ['Teknik', 'Koding'],
    likes: 35,
    shares: 8,
    authorUsername: DEFAULT_AUTHOR,
    comments: [],
    status: 'published',
    isDeleted: false,
    schemaVersion: 1
  }
];

// --- MIGRATION & DATA INTEGRITY ---
const migrateData = (posts: any[]): Post[] => {
    return posts.map(p => ({
        ...p,
        likes: p.likes || 0,
        shares: p.shares || 0,
        authorUsername: p.authorUsername || DEFAULT_AUTHOR,
        comments: p.comments || [],
        status: p.status || 'published',
        lastEdited: p.lastEdited || p.date,
        isDeleted: p.isDeleted || false, // Default not deleted
        deletedAt: p.deletedAt || undefined,
        schemaVersion: CURRENT_SCHEMA_VERSION
    }));
};

export const getPosts = (): Post[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_POSTS));
    return MOCK_POSTS;
  }
  try {
    const rawPosts = JSON.parse(stored);
    // Auto-migrate on read
    return migrateData(rawPosts);
  } catch (e) {
    console.error("Data corruption detected, returning empty.", e);
    return [];
  }
};

// --- TRASH & CLEANUP SYSTEM ---

// Permanently delete posts in trash older than 30 days
const cleanupTrash = (posts: Post[]): Post[] => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return posts.filter(p => {
        if (p.isDeleted && p.deletedAt) {
            return new Date(p.deletedAt) > thirtyDaysAgo;
        }
        return true;
    });
};

export const getTrendingPosts = (): Post[] => {
    const posts = getPosts().filter(p => p.status === 'published' && !p.isDeleted);
    return posts.sort((a, b) => {
        const scoreA = (a.likes || 0) + (a.comments?.length || 0) + (a.shares || 0);
        const scoreB = (b.likes || 0) + (b.comments?.length || 0) + (b.shares || 0);
        return scoreB - scoreA;
    }).slice(0, 3);
};

export const getPostsByUsername = (username: string, includeDrafts = false): Post[] => {
    let posts = getPosts().filter(p => p.authorUsername === username && !p.isDeleted);
    if (!includeDrafts) {
        posts = posts.filter(p => p.status === 'published');
    }
    // Sort by last edited if available, otherwise date
    return posts.sort((a, b) => {
        const dateA = new Date(a.lastEdited || a.date).getTime();
        const dateB = new Date(b.lastEdited || b.date).getTime();
        return dateB - dateA;
    });
};

export const getUserStats = (username: string) => {
    const posts = getPosts().filter(p => p.authorUsername === username && !p.isDeleted); // Only active posts
    const publishedPosts = posts.filter(p => p.status === 'published');
    
    const totalPosts = publishedPosts.length;
    
    const totalWords = publishedPosts.reduce((acc, post) => {
        return acc + (post.content ? post.content.split(/\s+/).filter(Boolean).length : 0);
    }, 0);

    const publishedCount = totalPosts; 
    
    const lastActive = posts.length > 0 
        ? posts.reduce((a, b) => new Date(a.date) > new Date(b.date) ? a : b).date 
        : null;

    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const dayCounts = new Array(7).fill(0);
    const hourCounts = new Array(24).fill(0);

    posts.forEach(p => {
        const d = new Date(p.date);
        dayCounts[d.getDay()]++;
        hourCounts[d.getHours()]++;
    });

    const maxDayIndex = dayCounts.indexOf(Math.max(...dayCounts));
    const productiveDay = totalPosts > 0 ? days[maxDayIndex] : '-';

    const maxHourIndex = hourCounts.indexOf(Math.max(...hourCounts));
    let timeOfDay = '-';
    if (totalPosts > 0) {
        if (maxHourIndex >= 5 && maxHourIndex < 12) timeOfDay = 'Pagi';
        else if (maxHourIndex >= 12 && maxHourIndex < 17) timeOfDay = 'Siang';
        else if (maxHourIndex >= 17 && maxHourIndex < 21) timeOfDay = 'Sore';
        else timeOfDay = 'Malam';
    }

    return { totalPosts, totalWords, publishedCount, lastActive, productiveDay, timeOfDay };
};

export const getUserInsights = (username: string): string => {
    const stats = getUserStats(username);
    if (stats.totalPosts === 0) return "Mulailah menulis untuk melihat polamu.";
    
    let insight = `Kamu paling produktif di ${stats.timeOfDay.toLowerCase()} hari. `;
    
    if (stats.totalWords > 5000) {
        insight += "Kata-katamu mulai mengalir deras.";
    } else if (stats.totalWords > 1000) {
        insight += "Konsistensi mulai terbentuk.";
    } else {
        insight += "Setiap kata adalah langkah awal.";
    }
    
    return insight;
};

export const searchPosts = (query: string): Post[] => {
    const posts = getPosts().filter(p => p.status === 'published' && !p.isDeleted);
    if (!query) return posts;
    const lowerQuery = query.toLowerCase();
    return posts.filter(p => 
        p.title.toLowerCase().includes(lowerQuery) || 
        p.content.toLowerCase().includes(lowerQuery) ||
        p.tags.some(t => t.toLowerCase().includes(lowerQuery))
    );
};

export const getPostById = (id: string): Post | undefined => {
  const posts = getPosts();
  // Allow getting deleted posts for restoration logic if needed, but normally handled in Admin
  return posts.find((p) => p.id === id);
};

export const savePost = (post: Post): void => {
  let posts = getPosts();
  
  // Cleanup old trash whenever a save happens
  posts = cleanupTrash(posts);

  const index = posts.findIndex((p) => p.id === post.id);
  const postToSave = { 
      ...post, 
      lastEdited: new Date().toISOString(),
      schemaVersion: CURRENT_SCHEMA_VERSION 
  };

  if (index >= 0) {
    const existing = posts[index];
    posts[index] = { 
        ...postToSave, 
        comments: existing.comments || [], 
        shares: existing.shares || 0,
        likes: existing.likes || 0
    };
  } else {
    posts.unshift({ 
        ...postToSave, 
        comments: [], 
        shares: 0,
        likes: 0
    });
  }
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  // Clear snapshot after successful save
  clearSnapshot(post.id);
};

// Soft Delete
export const deletePost = (id: string): void => {
  let posts = getPosts();
  const index = posts.findIndex(p => p.id === id);
  if (index >= 0) {
      posts[index].isDeleted = true;
      posts[index].deletedAt = new Date().toISOString();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
  }
};

// Restore from Trash
export const restorePost = (id: string): void => {
    let posts = getPosts();
    const index = posts.findIndex(p => p.id === id);
    if (index >= 0) {
        posts[index].isDeleted = false;
        posts[index].deletedAt = undefined;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
    }
};

// Permanent Delete
export const permanentDeletePost = (id: string): void => {
    const posts = getPosts().filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
    clearSnapshot(id);
};

// --- SNAPSHOT & RECOVERY SYSTEM ---

export const saveSnapshot = (post: Partial<Post> & { id: string }) => {
    const key = `${SNAPSHOT_KEY_PREFIX}${post.id}`;
    const existingStr = sessionStorage.getItem(key);
    let snapshots = existingStr ? JSON.parse(existingStr) : [];
    
    // Support versioning (max 3)
    if (!Array.isArray(snapshots)) snapshots = [snapshots];
    
    const newSnapshot = {
        ...post,
        timestamp: Date.now()
    };
    
    snapshots.unshift(newSnapshot);
    if (snapshots.length > 3) snapshots.pop();
    
    sessionStorage.setItem(key, JSON.stringify(snapshots));
};

export const getSnapshot = (id: string) => {
    const key = `${SNAPSHOT_KEY_PREFIX}${id}`;
    const stored = sessionStorage.getItem(key);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    // Return latest
    return Array.isArray(parsed) ? parsed[0] : parsed;
};

export const clearSnapshot = (id: string) => {
    sessionStorage.removeItem(`${SNAPSHOT_KEY_PREFIX}${id}`);
};

// --- INTERACTION ---

export const likePost = (id: string): number => {
  const posts = getPosts();
  const index = posts.findIndex((p) => p.id === id);
  
  if (index >= 0) {
    const newLikes = (posts[index].likes || 0) + 1;
    posts[index].likes = newLikes;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
    return newLikes;
  }
  return 0;
};

export const sharePost = (id: string): number => {
  const posts = getPosts();
  const index = posts.findIndex((p) => p.id === id);
  
  if (index >= 0) {
    const newShares = (posts[index].shares || 0) + 1;
    posts[index].shares = newShares;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
    return newShares;
  }
  return 0;
};

export const addComment = (postId: string, content: string, authorUsername: string): Comment | null => {
    const posts = getPosts();
    const index = posts.findIndex((p) => p.id === postId);

    if (index >= 0) {
        const newComment: Comment = {
            id: Date.now().toString(),
            content,
            authorUsername,
            date: new Date().toISOString()
        };
        
        if (!posts[index].comments) posts[index].comments = [];
        posts[index].comments.push(newComment);
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
        return newComment;
    }
    return null;
};

// --- EXPORT LOGIC ---
export const downloadPostAsMarkdown = (post: Post) => {
    const content = `# ${post.title}\n\n*Ditulis oleh ${post.authorUsername} pada ${new Date(post.date).toLocaleDateString()}*\n\n${post.excerpt ? `> ${post.excerpt}\n\n` : ''}${post.content}`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${post.title.replace(/\s+/g, '_').toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

/* --- MESSAGING SERVICE --- */

const getAllMessages = (): Message[] => {
    const stored = localStorage.getItem(MESSAGES_KEY);
    return stored ? JSON.parse(stored) : [];
};

export const getMessagesBetween = (user1: string, user2: string): Message[] => {
    const messages = getAllMessages();
    return messages.filter(m => 
        (m.senderUsername === user1 && m.receiverUsername === user2) ||
        (m.senderUsername === user2 && m.receiverUsername === user1)
    ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};

export const sendMessage = (sender: string, receiver: string, content: string): Message => {
    const messages = getAllMessages();
    const newMessage: Message = {
        id: Date.now().toString(),
        senderUsername: sender,
        receiverUsername: receiver,
        content,
        timestamp: new Date().toISOString(),
        isRead: false
    };
    messages.push(newMessage);
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
    return newMessage;
};

export const getConversations = (currentUser: string): string[] => {
    const messages = getAllMessages();
    const interlocutors = new Set<string>();
    
    messages.forEach(m => {
        if (m.senderUsername === currentUser) interlocutors.add(m.receiverUsername);
        if (m.receiverUsername === currentUser) interlocutors.add(m.senderUsername);
    });
    
    return Array.from(interlocutors);
};