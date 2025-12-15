import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, Message } from '../types';
import { getCurrentUser, getUserByUsername } from '../services/authService';
import { getConversations, getMessagesBetween, sendMessage } from '../services/storageService';

const Chat: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [conversations, setConversations] = useState<string[]>([]);
  const [activeChatUser, setActiveChatUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize
  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
      setConversations(getConversations(user.username));
    }
  }, []);

  // Load active chat
  useEffect(() => {
    if (username && currentUser) {
      const otherUser = getUserByUsername(username);
      if (otherUser) {
        setActiveChatUser(otherUser);
        setMessages(getMessagesBetween(currentUser.username, username));
        
        // Add to conversations list if not present
        if (!conversations.includes(username)) {
            setConversations(prev => [username, ...prev]);
        }
      }
    } else {
        setActiveChatUser(null);
    }
  }, [username, currentUser]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !activeChatUser || !newMessage.trim()) return;

    const msg = sendMessage(currentUser.username, activeChatUser.username, newMessage.trim());
    setMessages(prev => [...prev, msg]);
    setNewMessage('');
  };

  // Helper component for conversation item
  const ConversationItem = ({ otherUsername }: { otherUsername: string }) => {
      const otherUser = getUserByUsername(otherUsername);
      if (!otherUser) return null;
      
      const isActive = otherUsername === username;
      
      return (
          <Link 
            to={`/chat/${otherUsername}`}
            className={`flex items-center gap-3 p-4 rounded-xl transition-colors ${isActive ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 border' : 'hover:bg-zinc-50 dark:hover:bg-zinc-900'}`}
          >
              <div className="shrink-0">
                  {otherUser.profilePicture ? (
                      <img src={otherUser.profilePicture} alt={otherUser.name} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                      <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold">
                          {otherUser.name.charAt(0)}
                      </div>
                  )}
              </div>
              <div className="overflow-hidden">
                  <h4 className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{otherUser.name}</h4>
                  <p className="text-xs text-zinc-500 truncate">@{otherUser.username}</p>
              </div>
          </Link>
      );
  };

  if (!currentUser) return null;

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-140px)] md:h-[calc(100vh-180px)] animate-fade-in flex bg-white/50 dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden backdrop-blur-sm shadow-sm">
      
      {/* Sidebar List */}
      <div className={`w-full md:w-80 flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-950/60 ${activeChatUser ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
            <h2 className="font-serif font-bold text-xl text-zinc-900 dark:text-zinc-100">Pesan</h2>
            <Link to="/users" className="p-2 text-zinc-500 hover:text-indigo-600 transition-colors" title="Mulai pesan baru">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </Link>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {conversations.length === 0 ? (
                <div className="text-center py-10 px-4 text-zinc-500 text-sm">
                    <p>Belum ada percakapan.</p>
                    <Link to="/users" className="text-indigo-600 hover:underline mt-2 block">Cari teman diskusi</Link>
                </div>
            ) : (
                conversations.map(u => <ConversationItem key={u} otherUsername={u} />)
            )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col ${!activeChatUser ? 'hidden md:flex' : 'flex'}`}>
        {activeChatUser ? (
            <>
                {/* Chat Header */}
                <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md flex items-center gap-3">
                    <Link to="/chat" className="md:hidden text-zinc-500">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </Link>
                    <Link to={`/users/${activeChatUser.username}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        {activeChatUser.profilePicture ? (
                            <img src={activeChatUser.profilePicture} alt={activeChatUser.name} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold">
                                {activeChatUser.name.charAt(0)}
                            </div>
                        )}
                        <div>
                            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 leading-none">{activeChatUser.name}</h3>
                            <span className="text-xs text-zinc-500">@{activeChatUser.username}</span>
                        </div>
                    </Link>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50/50 dark:bg-zinc-950/30">
                    {messages.length === 0 && (
                        <p className="text-center text-zinc-400 text-sm py-10">Mulai percakapan dengan {activeChatUser.name}...</p>
                    )}
                    {messages.map(msg => {
                        const isMe = msg.senderUsername === currentUser.username;
                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                                    isMe 
                                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                                    : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-tl-none'
                                } shadow-sm`}>
                                    <p className="text-sm md:text-base whitespace-pre-wrap">{msg.content}</p>
                                    <span className={`text-[10px] block mt-1 opacity-70 ${isMe ? 'text-indigo-200' : 'text-zinc-400'}`}>
                                        {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleSend} className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Tulis pesan..."
                            className="flex-1 px-4 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-transparent focus:bg-white dark:focus:bg-zinc-900 focus:border-indigo-500 outline-none transition-all"
                        />
                        <button 
                            type="submit"
                            disabled={!newMessage.trim()}
                            className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                        </button>
                    </div>
                </form>
            </>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 p-8 text-center">
                <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-zinc-600 dark:text-zinc-300">Ruang Diskusi Pribadi</h3>
                <p className="max-w-xs mt-2">Pilih percakapan dari daftar atau mulai diskusi baru dengan penulis lain.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default Chat;