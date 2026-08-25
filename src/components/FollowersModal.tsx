import { useState, useEffect } from 'react';
import { X, UserPlus, UserCheck, Send, Loader2 } from 'lucide-react';
import { UserProfile } from '../types';
import { fetchFollowersList, fetchFollowingList, toggleFollowUser, checkIsFollowing } from '../services/userService';
import { useAuth } from '../context/AuthContext';

interface FollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  type: 'followers' | 'following';
  onSelectUser: (username: string) => void;
  onOpenDirectMessage: (user: any) => void;
}

export function FollowersModal({
  isOpen,
  onClose,
  userId,
  type,
  onSelectUser,
  onOpenDirectMessage,
}: FollowersModalProps) {
  const { currentUser, userProfile } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [followingMap, setFollowingMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOpen || !userId) return;

    setLoading(true);
    const fetchList = type === 'followers' ? fetchFollowersList(userId) : fetchFollowingList(userId);
    fetchList.then(async (list) => {
      setUsers(list);
      setLoading(false);

      if (currentUser) {
        list.forEach(async (u) => {
          if (u.uid !== currentUser.uid) {
            const isF = await checkIsFollowing(currentUser.uid, u.uid);
            setFollowingMap((prev) => ({ ...prev, [u.uid]: isF }));
          }
        });
      }
    });
  }, [isOpen, userId, type, currentUser]);

  const handleFollowToggle = async (targetUser: any) => {
    if (!currentUser || !userProfile) return;

    const currentF = followingMap[targetUser.uid] || false;
    setFollowingMap((prev) => ({ ...prev, [targetUser.uid]: !currentF }));

    try {
      const isNowF = await toggleFollowUser(userProfile, targetUser as UserProfile);
      setFollowingMap((prev) => ({ ...prev, [targetUser.uid]: isNowF }));
    } catch (err) {
      setFollowingMap((prev) => ({ ...prev, [targetUser.uid]: currentF }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-neutral-900 dark:text-white capitalize">
            {type} ({users.length})
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-xs text-neutral-400 text-center py-8">
            No {type} yet.
          </p>
        ) : (
          <div className="max-h-80 overflow-y-auto space-y-2 divide-y divide-neutral-100 dark:divide-neutral-800/60 pr-1">
            {users.map((u) => {
              const isSelf = currentUser?.uid === u.uid;
              const isFollowing = followingMap[u.uid] || false;

              return (
                <div
                  key={u.uid}
                  className="pt-2 flex items-center justify-between gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 p-2 rounded-2xl transition-colors"
                >
                  <div
                    onClick={() => {
                      onClose();
                      onSelectUser(u.username);
                    }}
                    className="flex items-center gap-3 cursor-pointer min-w-0"
                  >
                    <img
                      src={u.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.displayName || 'IV')}`}
                      alt={u.displayName}
                      className="w-10 h-10 rounded-full object-cover ring-1 ring-neutral-200 dark:ring-neutral-700"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                        {u.displayName}
                      </h4>
                      <p className="text-[11px] text-neutral-400 truncate">@{u.username}</p>
                    </div>
                  </div>

                  {!isSelf && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleFollowToggle(u)}
                        className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 ${
                          isFollowing
                            ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
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
                          onClose();
                          onOpenDirectMessage(u);
                        }}
                        className="p-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-violet-500/10 hover:text-violet-500 text-neutral-600 dark:text-neutral-300 transition-colors"
                        title="Message"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
