import { useEffect, useState } from 'react';
import { Sparkles, Image as ImageIcon, Users, RefreshCw, Compass, PlusSquare } from 'lucide-react';
import { Post, UserProfile } from '../types';
import { subscribeToFeed } from '../services/postService';
import { fetchDiscoverUsers } from '../services/userService';
import { PostCard } from './PostCard';
import { useAuth } from '../context/AuthContext';

interface FeedViewProps {
  onOpenCreate: () => void;
  onOpenAuth: () => void;
  onSelectUser: (username: string) => void;
  onOpenDirectMessageWithAuthor: (username: string) => void;
  onGoToExplore: () => void;
}

export function FeedView({
  onOpenCreate,
  onOpenAuth,
  onSelectUser,
  onOpenDirectMessageWithAuthor,
  onGoToExplore,
}: FeedViewProps) {
  const { currentUser, userProfile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [activeUsers, setActiveUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Subscribe to real-time feed
  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToFeed((feedPosts) => {
      setPosts(feedPosts);
      setLoading(false);
    });

    // Fetch active users for top strip
    fetchDiscoverUsers(12).then((users) => {
      setActiveUsers(users);
    });

    return () => unsub();
  }, []);

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-6 pb-24 md:pb-12">
      {/* Top Active Users / Creators Bar */}
      {activeUsers.length > 0 && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/80 rounded-3xl p-3.5 shadow-sm">
          <div className="flex items-center gap-4 overflow-x-auto pb-1 scrollbar-none">
            {/* Create Story / Post Pill */}
            {currentUser && (
              <div
                onClick={onOpenCreate}
                className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
              >
                <div className="relative">
                  <img
                    src={userProfile?.photoURL || currentUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=IV`}
                    alt="My Story"
                    className="w-14 h-14 rounded-full object-cover p-0.5 border-2 border-neutral-300 dark:border-neutral-700"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-violet-600 text-white flex items-center justify-center text-xs font-bold ring-2 ring-white dark:ring-neutral-900">
                    +
                  </div>
                </div>
                <span className="text-[11px] font-medium text-neutral-600 dark:text-neutral-400 group-hover:text-violet-500">
                  New Post
                </span>
              </div>
            )}

            {/* Other active users */}
            {activeUsers
              .filter((u) => u.uid !== currentUser?.uid)
              .map((user) => (
                <div
                  key={user.uid}
                  onClick={() => onSelectUser(user.username)}
                  className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group select-none"
                >
                  <div className="p-0.5 rounded-full bg-gradient-to-tr from-violet-600 via-indigo-500 to-cyan-400 group-hover:scale-105 transition-transform duration-200 shadow-sm">
                    <div className="p-0.5 bg-white dark:bg-neutral-950 rounded-full">
                      <img
                        src={user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.displayName)}`}
                        alt={user.displayName}
                        className="w-13 h-13 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300 truncate max-w-[64px] group-hover:text-violet-500">
                    {user.username}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Feed Stream */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-4 space-y-4 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-800" />
                <div className="space-y-1.5 flex-1">
                  <div className="w-28 h-3.5 bg-neutral-200 dark:bg-neutral-800 rounded" />
                  <div className="w-16 h-2.5 bg-neutral-200 dark:bg-neutral-800 rounded" />
                </div>
              </div>
              <div className="w-full h-72 bg-neutral-200 dark:bg-neutral-800 rounded-2xl" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        /* Empty State */
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-8 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center mx-auto">
            <ImageIcon className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Your Feed is Ready</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
              Share the first photo or discover creators across the community.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={currentUser ? onOpenCreate : onOpenAuth}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-600/25 transition-all flex items-center gap-2"
            >
              <PlusSquare className="w-4 h-4" />
              <span>Share Photo</span>
            </button>
            <button
              onClick={onGoToExplore}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white transition-all flex items-center gap-2"
            >
              <Compass className="w-4 h-4" />
              <span>Explore Community</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onOpenAuth={onOpenAuth}
              onSelectUser={onSelectUser}
              onOpenDirectMessageWithAuthor={onOpenDirectMessageWithAuthor}
            />
          ))}
        </div>
      )}
    </div>
  );
}
