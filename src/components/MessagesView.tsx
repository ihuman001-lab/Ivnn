import { useState, useEffect, useRef, ChangeEvent, FormEvent } from 'react';
import {
  Send,
  Image as ImageIcon,
  Search,
  MoreVertical,
  Trash2,
  ArrowLeft,
  Loader2,
  Check,
  CheckCheck,
  Sparkles,
  Camera,
  X,
  User,
  PlusCircle,
} from 'lucide-react';
import { Conversation, Message, UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  subscribeToUserConversations,
  subscribeToMessages,
  sendMessage,
  deleteMessage,
  markConversationAsRead,
  getOrCreateConversation,
} from '../services/chatService';
import { searchUsers, fetchDiscoverUsers } from '../services/userService';
import { formatTimeAgo, formatMessageTime } from '../lib/timeUtils';
import { processAndCompressImage } from '../lib/imageUtils';

interface MessagesViewProps {
  initialRecipientUser?: UserProfile | null;
  onSelectUserProfile: (username: string) => void;
  onOpenAuth: () => void;
}

export function MessagesView({
  initialRecipientUser,
  onSelectUserProfile,
  onOpenAuth,
}: MessagesViewProps) {
  const { currentUser, userProfile } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [attachedImage, setAttachedImage] = useState<{ blob: Blob; dataUrl: string; aspectRatio: number } | null>(null);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [searchConvQuery, setSearchConvQuery] = useState<string>('');

  // New Chat Modal state
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState<boolean>(false);
  const [userSearchTerm, setUserSearchTerm] = useState<string>('');
  const [foundUsers, setFoundUsers] = useState<UserProfile[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState<boolean>(false);

  // Fullscreen photo lightbox
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Subscribe to all conversations of current user
  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToUserConversations(currentUser.uid, (convList) => {
      setConversations(convList);

      // Keep active conversation updated
      if (activeConversation) {
        const updated = convList.find((c) => c.id === activeConversation.id);
        if (updated) setActiveConversation(updated);
      }
    });

    return () => unsub();
  }, [currentUser, activeConversation?.id]);

  // Handle initial recipient user passed from profile/search
  useEffect(() => {
    if (initialRecipientUser && userProfile && currentUser) {
      if (initialRecipientUser.uid !== currentUser.uid) {
        getOrCreateConversation(userProfile, initialRecipientUser).then((conv) => {
          setActiveConversation(conv);
        });
      }
    }
  }, [initialRecipientUser, userProfile, currentUser]);

  // Subscribe to messages for active conversation
  useEffect(() => {
    if (!activeConversation || !currentUser) {
      setMessages([]);
      return;
    }

    // Mark as read immediately
    markConversationAsRead(activeConversation.id, currentUser.uid);

    const unsub = subscribeToMessages(activeConversation.id, (msgList) => {
      setMessages(msgList);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return () => unsub();
  }, [activeConversation?.id, currentUser]);

  // Search users for new chat
  useEffect(() => {
    if (!userSearchTerm.trim()) {
      fetchDiscoverUsers(8).then((users) => {
        setFoundUsers(users.filter((u) => u.uid !== currentUser?.uid));
      });
      return;
    }

    setIsSearchingUsers(true);
    const timer = setTimeout(async () => {
      try {
        const res = await searchUsers(userSearchTerm);
        setFoundUsers(res.filter((u) => u.uid !== currentUser?.uid));
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearchingUsers(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [userSearchTerm, currentUser]);

  // Handle Select / Start Conversation with user
  const handleStartChatWithUser = async (targetUser: UserProfile) => {
    if (!currentUser || !userProfile) {
      onOpenAuth();
      return;
    }

    try {
      const conv = await getOrCreateConversation(userProfile, targetUser);
      setActiveConversation(conv);
      setIsNewChatModalOpen(false);
      setUserSearchTerm('');
    } catch (err) {
      console.error('Error starting conversation:', err);
    }
  };

  // Handle Image Attachment
  const handleImageSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const processed = await processAndCompressImage(file, 'normal', 1400, 1400, 0.85);
      setAttachedImage({
        blob: processed.blob,
        dataUrl: processed.dataUrl,
        aspectRatio: processed.aspectRatio,
      });
    } catch (err) {
      console.error('Error attaching image:', err);
    }
  };

  // Handle Send Message
  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !attachedImage) || !activeConversation || !userProfile || !currentUser || isSending) {
      return;
    }

    const otherUid = activeConversation.participants.find((uid) => uid !== currentUser.uid);
    if (!otherUid) return;

    const recipientDetails = activeConversation.participantDetails?.[otherUid] || {
      uid: otherUid,
      displayName: 'User',
      username: 'user',
      photoURL: '',
    };

    try {
      setIsSending(true);
      const text = inputText;
      const img = attachedImage;

      // Clear input immediately for responsive feel
      setInputText('');
      setAttachedImage(null);

      await sendMessage(
        activeConversation.id,
        userProfile,
        recipientDetails,
        text,
        img?.blob,
        img?.dataUrl,
        img?.aspectRatio
      );

      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  // Handle Delete Message
  const handleDeleteMessage = async (msgId: string) => {
    if (!activeConversation) return;
    if (confirm('Delete this message?')) {
      await deleteMessage(activeConversation.id, msgId);
    }
  };

  // Get recipient info from active conversation
  const otherParticipantId = activeConversation?.participants.find((uid) => uid !== currentUser?.uid);
  const activeRecipient = otherParticipantId
    ? activeConversation?.participantDetails?.[otherParticipantId]
    : null;

  // Filter conversations by search
  const filteredConversations = conversations.filter((c) => {
    if (!searchConvQuery.trim()) return true;
    const otherId = c.participants.find((uid) => uid !== currentUser?.uid);
    const details = otherId ? c.participantDetails?.[otherId] : null;
    return (
      details?.displayName.toLowerCase().includes(searchConvQuery.toLowerCase()) ||
      details?.username.toLowerCase().includes(searchConvQuery.toLowerCase())
    );
  });

  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-4 py-4 h-[calc(100vh-4.5rem)] pb-20 md:pb-6">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-xl h-full flex">
        {/* Left Side: Conversation List (hidden on mobile when chat is active) */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-neutral-200 dark:border-neutral-800 flex flex-col bg-neutral-50/50 dark:bg-neutral-950/40 ${
            activeConversation ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Header */}
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Messages</h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400">
                Live
              </span>
            </div>

            <button
              id="new-chat-btn"
              onClick={() => setIsNewChatModalOpen(true)}
              className="p-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white shadow-sm transition-all flex items-center gap-1.5 text-xs font-semibold"
              title="Start New Chat"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New</span>
            </button>
          </div>

          {/* Search Conversations Input */}
          <div className="p-3 border-b border-neutral-200 dark:border-neutral-800/50">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={searchConvQuery}
                onChange={(e) => setSearchConvQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800/40">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center mx-auto">
                  <Send className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                    No active chats
                  </p>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Start a conversation with any registered user.
                  </p>
                </div>
                <button
                  onClick={() => setIsNewChatModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-sm transition-all"
                >
                  Find Users
                </button>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const otherUid = conv.participants.find((uid) => uid !== currentUser?.uid);
                const recipient = otherUid ? conv.participantDetails?.[otherUid] : null;
                const unreadCount = (currentUser && conv.unreadCounts?.[currentUser.uid]) || 0;
                const isSelected = activeConversation?.id === conv.id;

                return (
                  <div
                    key={conv.id}
                    onClick={() => setActiveConversation(conv)}
                    className={`p-3.5 flex items-center gap-3 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-violet-500/10 dark:bg-violet-500/15 border-l-4 border-violet-600'
                        : 'hover:bg-neutral-100 dark:hover:bg-neutral-900/60'
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <img
                        src={recipient?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(recipient?.displayName || 'User')}`}
                        alt={recipient?.displayName}
                        className="w-11 h-11 rounded-full object-cover ring-1 ring-neutral-200 dark:ring-neutral-700"
                        referrerPolicy="no-referrer"
                      />
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-600 text-white ring-2 ring-white dark:ring-neutral-950">
                          {unreadCount}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <h4 className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                          {recipient?.displayName || 'User'}
                        </h4>
                        <span className="text-[10px] text-neutral-400 flex-shrink-0 ml-1">
                          {formatTimeAgo(conv.lastMessage?.createdAt || conv.updatedAt)}
                        </span>
                      </div>

                      <p
                        className={`text-xs truncate ${
                          unreadCount > 0
                            ? 'font-bold text-neutral-900 dark:text-white'
                            : 'text-neutral-500 dark:text-neutral-400'
                        }`}
                      >
                        {conv.lastMessage?.text || 'Started a conversation'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side: Active Chat Window */}
        <div
          className={`flex-1 flex flex-col h-full bg-white dark:bg-neutral-900 ${
            !activeConversation ? 'hidden md:flex' : 'flex'
          }`}
        >
          {activeConversation && activeRecipient ? (
            <>
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setActiveConversation(null)}
                    className="md:hidden p-1.5 -ml-1 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div
                    onClick={() => onSelectUserProfile(activeRecipient.username)}
                    className="flex items-center gap-2.5 cursor-pointer group"
                  >
                    <img
                      src={activeRecipient.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=IV`}
                      alt={activeRecipient.displayName}
                      className="w-10 h-10 rounded-full object-cover ring-1 ring-neutral-200 dark:ring-neutral-700 group-hover:ring-violet-500 transition-all"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h3 className="text-sm font-bold text-neutral-900 dark:text-white group-hover:text-violet-500 transition-colors truncate">
                        {activeRecipient.displayName}
                      </h3>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                        @{activeRecipient.username}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSelectUserProfile(activeRecipient.username)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors flex items-center gap-1"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Profile</span>
                  </button>
                </div>
              </div>

              {/* Messages Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                    <img
                      src={activeRecipient.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=IV`}
                      alt={activeRecipient.displayName}
                      className="w-16 h-16 rounded-full object-cover ring-2 ring-violet-500/40 mb-2"
                      referrerPolicy="no-referrer"
                    />
                    <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                      {activeRecipient.displayName}
                    </h4>
                    <p className="text-xs text-neutral-400 max-w-xs">
                      This is the beginning of your direct message history with @{activeRecipient.username}.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.senderId === currentUser?.uid;

                    return (
                      <div
                        key={msg.id}
                        className={`flex items-end gap-2 group ${isMine ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isMine && (
                          <img
                            src={msg.senderPhotoURL || `https://api.dicebear.com/7.x/initials/svg?seed=IV`}
                            alt={msg.senderDisplayName}
                            className="w-7 h-7 rounded-full object-cover mb-1 flex-shrink-0"
                            referrerPolicy="no-referrer"
                          />
                        )}

                        <div className={`max-w-[75%] sm:max-w-md space-y-1 ${isMine ? 'items-end' : 'items-start'}`}>
                          {/* Image in message */}
                          {msg.imageUrl && (
                            <div
                              onClick={() => setLightboxImage(msg.imageUrl || null)}
                              className="rounded-2xl overflow-hidden cursor-pointer bg-neutral-950 shadow-md hover:opacity-95 transition-opacity max-h-72 max-w-xs"
                            >
                              <img
                                src={msg.imageUrl}
                                alt="Message attachment"
                                className="w-full h-auto object-cover"
                                loading="lazy"
                              />
                            </div>
                          )}

                          {/* Text Bubble */}
                          {msg.text && (
                            <div
                              className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed break-words shadow-sm ${
                                isMine
                                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-br-none'
                                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-bl-none'
                              }`}
                            >
                              {msg.text}
                            </div>
                          )}

                          {/* Time and Delete Option */}
                          <div className={`flex items-center gap-1 px-1 text-[10px] text-neutral-400 ${isMine ? 'justify-end' : 'justify-start'}`}>
                            <span>{formatMessageTime(msg.createdAt)}</span>
                            {isMine && (
                              <button
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-rose-500 transition-all"
                                title="Delete message"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Image Preview before send */}
              {attachedImage && (
                <div className="p-3 bg-neutral-50 dark:bg-neutral-800/80 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={attachedImage.dataUrl}
                      alt="Attachment"
                      className="w-12 h-12 rounded-xl object-cover ring-1 ring-neutral-300 dark:ring-neutral-600"
                    />
                    <span className="text-xs text-neutral-600 dark:text-neutral-300 font-medium">
                      Photo attached
                    </span>
                  </div>
                  <button
                    onClick={() => setAttachedImage(null)}
                    className="p-1.5 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Message Input Box */}
              <form
                onSubmit={handleSendMessage}
                className="p-3 sm:p-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-center gap-2"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 rounded-2xl text-neutral-500 hover:text-violet-600 hover:bg-violet-500/10 dark:hover:bg-violet-500/20 transition-colors"
                  title="Attach Photo"
                >
                  <Camera className="w-5 h-5" />
                </button>

                <input
                  id="chat-message-input"
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Message @${activeRecipient.username}...`}
                  className="flex-1 px-4 py-2.5 rounded-2xl text-xs sm:text-sm bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700/60 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                />

                <button
                  id="chat-send-btn"
                  type="submit"
                  disabled={(!inputText.trim() && !attachedImage) || isSending}
                  className="p-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-md shadow-violet-600/25 active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center"
                >
                  {isSending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5 -rotate-12" />
                  )}
                </button>
              </form>
            </>
          ) : (
            /* No conversation selected state (Desktop) */
            <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-violet-600/20 to-indigo-600/20 text-violet-600 dark:text-violet-400 flex items-center justify-center shadow-inner">
                <Send className="w-8 h-8 -rotate-12" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">Your Direct Messages</h3>
                <p className="text-xs text-neutral-400 max-w-sm mt-1">
                  Send private messages and real-time photos to any registered member on IVNN.
                </p>
              </div>
              <button
                onClick={() => setIsNewChatModalOpen(true)}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-600/25 transition-all flex items-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Start New Conversation</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* New Chat User Picker Modal */}
      {isNewChatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-neutral-900 dark:text-white">New Message</h3>
              <button
                onClick={() => setIsNewChatModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                placeholder="Type @username or name..."
                className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              />
              {isSearchingUsers && (
                <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-violet-500" />
              )}
            </div>

            {/* Suggested / Found Users */}
            <div className="max-h-60 overflow-y-auto space-y-2 divide-y divide-neutral-100 dark:divide-neutral-800/50 pr-1">
              {foundUsers.length === 0 ? (
                <p className="text-xs text-neutral-400 text-center py-6">No users found</p>
              ) : (
                foundUsers.map((user) => (
                  <div
                    key={user.uid}
                    onClick={() => handleStartChatWithUser(user)}
                    className="pt-2 flex items-center justify-between gap-3 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/60 p-2 rounded-2xl transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.displayName)}`}
                        alt={user.displayName}
                        className="w-10 h-10 rounded-full object-cover ring-1 ring-neutral-200 dark:ring-neutral-700"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                          {user.displayName}
                        </h4>
                        <p className="text-[11px] text-neutral-400 truncate">@{user.username}</p>
                      </div>
                    </div>

                    <button className="px-3 py-1 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-sm flex items-center gap-1">
                      <span>Chat</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Photo Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-neutral-800/80 text-white hover:bg-neutral-700"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxImage}
            alt="Fullscreen"
            className="max-h-[90vh] max-w-[95vw] object-contain rounded-2xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
