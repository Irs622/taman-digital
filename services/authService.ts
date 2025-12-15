import { User } from '../types';
import { getPosts, deletePost } from './storageService';

const USERS_KEY = 'lumina_users';
const SESSION_KEY = 'lumina_current_user_username';

// Helper to get all users
export const getUsers = (): User[] => {
  const stored = localStorage.getItem(USERS_KEY);
  const users = stored ? JSON.parse(stored) : [];
  // Migration helper for existing users
  return users.map((u: any) => ({
      ...u,
      followers: u.followers || [],
      following: u.following || [],
      profilePicture: u.profilePicture || undefined,
      writingThemes: u.writingThemes || [],
      featuredPostIds: u.featuredPostIds || [],
      isPublic: u.isPublic !== undefined ? u.isPublic : true,
      showBio: u.showBio !== undefined ? u.showBio : true,
      showStats: u.showStats !== undefined ? u.showStats : true,
      email: u.email || '', // Ensure email exists
  }));
};

const saveUsers = (users: User[]) => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const getUserByUsername = (username: string): User | undefined => {
    return getUsers().find(u => u.username === username);
};

export const searchUsers = (query: string): User[] => {
  const users = getUsers();
  if (!query) return users;
  const lowerQuery = query.toLowerCase();
  return users.filter(u => 
    u.name.toLowerCase().includes(lowerQuery) || 
    u.username.toLowerCase().includes(lowerQuery) ||
    (u.penName && u.penName.toLowerCase().includes(lowerQuery))
  );
};

export const toggleFollow = (targetUsername: string): boolean => {
    const currentUserUsername = localStorage.getItem(SESSION_KEY);
    if (!currentUserUsername || currentUserUsername === targetUsername) return false;

    const users = getUsers();
    const currentUserIndex = users.findIndex(u => u.username === currentUserUsername);
    const targetUserIndex = users.findIndex(u => u.username === targetUsername);

    if (currentUserIndex === -1 || targetUserIndex === -1) return false;

    const currentUser = users[currentUserIndex];
    const targetUser = users[targetUserIndex];

    const isFollowing = currentUser.following.includes(targetUsername);

    if (isFollowing) {
        // Unfollow
        currentUser.following = currentUser.following.filter(u => u !== targetUsername);
        targetUser.followers = targetUser.followers.filter(u => u !== currentUserUsername);
    } else {
        // Follow
        currentUser.following.push(targetUsername);
        targetUser.followers.push(currentUserUsername);
    }

    users[currentUserIndex] = currentUser;
    users[targetUserIndex] = targetUser;
    
    saveUsers(users);
    return !isFollowing; // Returns true if now following, false if unfollowed
};

export const register = (user: Omit<User, 'followers' | 'following'>): { success: boolean; message: string } => {
  const users = getUsers();
  
  if (users.find(u => u.username === user.username)) {
    return { success: false, message: 'Username sudah digunakan.' };
  }

  if (user.email && users.find(u => u.email === user.email)) {
      return { success: false, message: 'Email sudah terdaftar.' };
  }

  // Simple validation
  if (!user.username || !user.password || !user.name) {
    return { success: false, message: 'Mohon lengkapi semua data wajib.' };
  }

  // Initialize empty social arrays
  const newUser: User = {
      ...user,
      followers: [],
      following: [],
      isPublic: true,
      showBio: true,
      showStats: true,
      writingThemes: [],
      featuredPostIds: []
  };

  users.push(newUser);
  saveUsers(users);
  return { success: true, message: 'Pendaftaran berhasil.' };
};

// Updated Login: Accepts Username OR Email
export const login = (identifier: string, password: string): boolean => {
  const users = getUsers();
  // Check if identifier matches username OR email
  const user = users.find(u => 
    (u.username === identifier || u.email === identifier) && 
    u.password === password
  );
  
  if (user) {
    localStorage.setItem(SESSION_KEY, user.username);
    return true;
  }
  return false;
};

// Google Auth Simulation
export const loginWithGoogle = (googleData: { email: string; name: string; picture: string }): { success: boolean; message?: string } => {
    const users = getUsers();
    const existingUser = users.find(u => u.email === googleData.email);

    if (existingUser) {
        // Login existing user
        localStorage.setItem(SESSION_KEY, existingUser.username);
        return { success: true };
    } else {
        // Auto-register new user from Google
        // Generate a username from name + random digits
        let baseUsername = googleData.name.toLowerCase().replace(/\s+/g, '');
        let newUsername = baseUsername;
        let counter = 1;
        
        while (users.find(u => u.username === newUsername)) {
            newUsername = `${baseUsername}${Math.floor(Math.random() * 1000)}`;
            counter++;
            if(counter > 10) break; // Safety break
        }

        const newUser: User = {
            username: newUsername,
            name: googleData.name,
            email: googleData.email,
            password: 'google_auth_linked', // Dummy password for oauth users
            profilePicture: googleData.picture,
            bio: '',
            followers: [],
            following: [],
            isPublic: true,
            showBio: true,
            showStats: true,
            writingThemes: [],
            featuredPostIds: []
        };

        users.push(newUser);
        saveUsers(users);
        localStorage.setItem(SESSION_KEY, newUser.username);
        return { success: true };
    }
};

export const logout = (): void => {
  localStorage.removeItem(SESSION_KEY);
};

export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem(SESSION_KEY);
};

export const getCurrentUser = (): User | null => {
  const username = localStorage.getItem(SESSION_KEY);
  if (!username) return null;
  
  const users = getUsers();
  return users.find(u => u.username === username) || null;
};

export const updateProfile = (updatedUser: User): void => {
  const users = getUsers();
  const index = users.findIndex(u => u.username === updatedUser.username);
  
  if (index !== -1) {
    // Preserve data that shouldn't be overwritten blindly if not passed
    users[index] = {
        ...users[index], // Start with existing
        ...updatedUser, // Overwrite with new fields
        // Ensure critical fields are preserved if they happen to be missing in updatedUser
        followers: updatedUser.followers || users[index].followers,
        following: updatedUser.following || users[index].following,
    };
    saveUsers(users);
  }
};

export const deleteUser = (username: string): void => {
    let users = getUsers();
    users = users.filter(u => u.username !== username);
    saveUsers(users);
    
    // Also delete user's posts
    const posts = getPosts();
    posts.forEach(p => {
        if (p.authorUsername === username) {
            deletePost(p.id);
        }
    });
    
    logout();
};