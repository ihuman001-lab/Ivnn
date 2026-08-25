import { useState, useEffect } from 'react';
import {
  Search,
  Users,
  Send,
  UserCheck,
  UserPlus,
  Loader2,
  Grid,
  Sparkles,
  Heart,
  MessageCircle,
} from 'lucide-react';
import { UserProfile, Post } from '../types';
import { searchUsers, fetchDiscoverUsers, toggleFollowUser, checkIsFollowing } from '../services/userService';
import { subscribeToFeed } from '../services/postService';
import { useAuth } from '../context/AuthContext';

interface SearchViewProps {
  onSelectUser: (username: string) => void;
  onOpenDirectMessage: (user: UserProfile) => void;
  onOpenAuth: () => void;
}

export function SearchView({
  onSelectUser,
  onOpenDirectMessage,
  onOpenAuth,
}: SearchViewProps) {
  const { currentUser, userProfile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [discoverUsers, setDiscoverUsers] = useState<UserProfile[]>([]);
  const [explorePosts, setExplorePosts] = useState<Post[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});

  // Initial load of explore community members & posts
  useEffect(() => {
    fetchDiscoverUsers(20).then((users) => {
      setDiscoverUsers(users);
      // Check follow states if user logged in
      if (currentUser) {
        users.forEach(async (u) => {
          if (u.uid !== currentUser.uid) {
            const isF = await checkIsFollowing(currentUser.uid, u.uid);
            setFollowingMap((prev) => ({ ...prev, [u.uid]: isF }));
          }
        });
      }
    });

    const unsubPosts = subscribeToFeed((posts) => {
      setExplorePosts(posts);
    }, 40);

    return () => unsubPosts();
  }, [currentUser]);

  // Debounced Search
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchUsers(searchTerm);
        setSearchResults(results);

        if (currentUser) {
          results.forEach(async (u) => {
            if (u.uid !== currentUser.uid) {
              const isF = await checkIsFollowing(currentUser.uid, u.uid);
              setFollowingMap((prev) => ({ ...prev, [u.uid]: isF }));
            }
          });
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, currentUser]);

  const handleFollowToggle = async (targetUser: UserProfile) => {
    if (!currentUser || !userProfile) {
      onOpenAuth();
      return;
    }

    const currentFollowingState = followingMap[targetUser.uid] || false;
    setFollowingMap((prev) => ({ ...prev, [targetUser.uid]: !currentFollowingState }));

    try {
      const isNowFollowing = await toggleFollowUser(userProfile, targetUser);
      setFollowingMap((prev) => ({ ...prev, [targetUser.uid]: isNowFollowing }));
    } catch (err) {
      // Revert on error
      setFollowingMap((prev) => ({ ...prev, [targetUser.uid]: currentFollowingState }));
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8 pb-24 md:pb-12">
      {/* Search Input */}
      <div className="relative max-w-xl mx-auto">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
        <input
          id="search-users-input"
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by @username or display name..."
          className="w-full pl-12 pr-10 py-3 rounded-2xl text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 shadow-sm"
        />
        {isSearching && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-violet-500" />
        )}
      </div>

      {/* Search Results */}
      {searchTerm.trim() ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-500" />
            <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
              Search Results ({searchResults.length})
            </h2>
          </div>

          {searchResults.length === 0 && !isSearching ? (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-8 text-center shadow-sm">
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                No users found for "{searchTerm}"
              </p>
              <p className="text-xs text-neutral-400 mt-1">Try searching another username or display name.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {searchResults.map((user) => {
                const isSelf = currentUser?.uid === user.uid;
                const isFollowing = followingMap[user.uid] || false;

                return (
                  <div
                    key={user.uid}
                    className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-sm hover:border-violet-500/30 transition-all"
                  >
                    <div
                      onClick={() => onSelectUser(user.username)}
                      className="flex items-center gap-3 cursor-pointer min-w-0 flex-1"
                    >
                      <img
                        src={user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.displayName)}`}
                        alt={user.displayName}
                        className="w-12 h-12 rounded-full object-cover ring-1 ring-neutral-200 dark:ring-neutral-700 flex-shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                          {user.displayName}
                        </h3>
                        <p className="text-xs text-violet-600 dark:text-violet-400 truncate">
                          @{user.username}
                        </p>
                        {user.bio && (
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                            {user.bio}
                          </p>
                        )}
                      </div>
                    </div>

                    {!isSelf && (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleFollowToggle(user)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 ${
                            isFollowing
                              ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-rose-500/10 hover:text-rose-500'
                              : 'bg-violet-600 hover:bg-violet-500 text-white shadow-sm'
                          }`}
                        >
                          {isFollowing ? (
                            <>
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Following</span>
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>Follow</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => {
                            if (!currentUser) onOpenAuth();
                            else onOpenDirectMessage(user);
                          }}
                          className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-violet-500/10 hover:text-violet-500 text-neutral-600 dark:text-neutral-300 transition-colors"
                          title={`Message @${user.username}`}
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Discover Community Creators Strip */
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-500" />
                <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                  Discover Real Creators
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {discoverUsers
                .filter((u) => u.uid !== currentUser?.uid)
                .slice(0, 6)
                .map((user) => {
                  const isFollowing = followingMap[user.uid] || false;
                  return (
                    <div
                      key={user.uid}
                      className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-sm hover:border-violet-500/30 transition-all"
                    >
                      <div
                        onClick={() => onSelectUser(user.username)}
                        className="flex items-center gap-3 cursor-pointer"
                      >
                        <img
                          src={user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.displayName)}`}
                          alt={user.displayName}
                          className="w-11 h-11 rounded-full object-cover ring-1 ring-neutral-200 dark:ring-neutral-700"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-neutral-900 dark:text-white truncate">
                            {user.displayName}
                          </h4>
                          <p className="text-xs text-neutral-500 truncate">@{user.username}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleFollowToggle(user)}
                          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
                            isFollowing
                              ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                              : 'bg-violet-600 hover:bg-violet-500 text-white shadow-sm'
                          }`}
                        >
                          {isFollowing ? 'Following' : 'Follow'}
                        </button>
                        <button
                          onClick={() => {
                            if (!currentUser) onOpenAuth();
                            else onOpenDirectMessage(user);
                          }}
                          className="p-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-violet-500/10 hover:text-violet-500 text-neutral-600 dark:text-neutral-300 transition-colors"
                          title="Message"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Explore Community Photo Grid */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Grid className="w-4 h-4 text-violet-500" />
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">Explore Moments</h2>
            </div>

            {explorePosts.length === 0 ? (
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-8 text-center text-xs text-neutral-400">
                No moments shared yet. Be the first to share one!
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                {explorePosts.map((post) => (
                  <div
                    key={post.id}
                    onClick={() => onSelectUser(post.authorUsername)}
                    className="group relative aspect-square rounded-2xl overflow-hidden bg-neutral-900 cursor-pointer shadow-sm"
                  >
                    <img
                      src={post.imageUrl}
                      alt={post.caption || 'Explore post'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white font-semibold text-xs backdrop-blur-[2px]">
                      <div className="flex items-center gap-1">
                        <Heart className="w-4 h-4 fill-white" />
                        <span>{post.likesCount || post.likes?.length || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="w-4 h-4 fill-white" />
                        <span>{post.commentsCount || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
