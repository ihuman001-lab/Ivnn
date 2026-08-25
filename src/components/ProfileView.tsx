import { useState, useEffect } from 'react';
import {
  Settings,
  Grid,
  Heart,
  MessageCircle,
  Send,
  UserCheck,
  UserPlus,
  Edit3,
  Share2,
  Check,
  Loader2,
  ArrowLeft,
  Camera,
} from 'lucide-react';
import { UserProfile, Post } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  fetchUserProfileByUsername,
  fetchUserProfile,
  checkIsFollowing,
  toggleFollowUser,
} from '../services/userService';
import { getUserPosts } from '../services/postService';
import { EditProfileModal } from './EditProfileModal';
import { FollowersModal } from './FollowersModal';

interface ProfileViewProps {
  targetUsername?: string | null;
  onOpenAuth: () => void;
  onOpenDirectMessage: (user: UserProfile) => void;
  onBackToFeed: () => void;
  onSelectUser: (username: string) => void;
}

export function ProfileView({
  targetUsername,
  onOpenAuth,
  onOpenDirectMessage,
  onBackToFeed,
  onSelectUser,
}: ProfileViewProps) {
  const { currentUser, userProfile: myProfile } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [followersModalType, setFollowersModalType] = useState<'followers' | 'following' | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const isSelf =
    !targetUsername ||
    targetUsername.toLowerCase() === myProfile?.username.toLowerCase() ||
    (profile && currentUser && profile.uid === currentUser.uid);

  // Fetch target profile and user posts
  useEffect(() => {
    setLoading(true);

    const loadData = async () => {
      let targetUser: UserProfile | null = null;

      if (!targetUsername || targetUsername === myProfile?.username) {
        targetUser = myProfile;
      } else {
        targetUser = await fetchUserProfileByUsername(targetUsername);
      }

      setProfile(targetUser);

      if (targetUser) {
        const userPosts = await getUserPosts(targetUser.uid);
        setPosts(userPosts);

        if (currentUser && targetUser.uid !== currentUser.uid) {
          const isF = await checkIsFollowing(currentUser.uid, targetUser.uid);
          setIsFollowing(isF);
        }
      }
      setLoading(false);
    };

    loadData();
  }, [targetUsername, myProfile, currentUser]);

  const handleFollowToggle = async () => {
    if (!currentUser || !myProfile || !profile) {
      onOpenAuth();
      return;
    }

    const currentF = isFollowing;
    setIsFollowing(!currentF);
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            followersCount: currentF
              ? Math.max(0, prev.followersCount - 1)
              : prev.followersCount + 1,
          }
        : null
    );

    try {
      const isNowF = await toggleFollowUser(myProfile, profile);
      setIsFollowing(isNowF);
    } catch (err) {
      setIsFollowing(currentF);
    }
  };

  const handleShareProfile = () => {
    if (!profile) return;
    navigator.clipboard.writeText(window.location.origin + `?u=${profile.username}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white">User not found</h2>
        <p className="text-xs text-neutral-400">The requested profile does not exist.</p>
        <button
          onClick={onBackToFeed}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-violet-600 text-white"
        >
          Back to Feed
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-8 pb-24 md:pb-12">
      {/* Back button if viewing another user */}
      {targetUsername && targetUsername !== myProfile?.username && (
        <button
          onClick={onBackToFeed}
          className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
      )}

      {/* Profile Header */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8">
          {/* Avatar */}
          <div className="relative group flex-shrink-0">
            <img
              src={profile.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile.displayName)}`}
              alt={profile.displayName}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover ring-2 ring-violet-500/40 p-1 bg-white dark:bg-neutral-950 shadow-md"
              referrerPolicy="no-referrer"
            />
            {isSelf && (
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                title="Change Photo"
              >
                <Camera className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* User Details & Stats */}
          <div className="flex-1 text-center sm:text-left space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">
                  {profile.displayName}
                </h1>
                <p className="text-sm font-semibold text-violet-600 dark:text-violet-400">
                  @{profile.username}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center sm:justify-end gap-2">
                {isSelf ? (
                  <>
                    <button
                      id="edit-profile-btn"
                      onClick={() => setIsEditModalOpen(true)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-900 dark:text-white transition-all flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Profile</span>
                    </button>
                    <button
                      onClick={handleShareProfile}
                      className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors"
                      title="Share Profile Link"
                    >
                      {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      id="profile-follow-btn"
                      onClick={handleFollowToggle}
                      className={`px-5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        isFollowing
                          ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-rose-500/10 hover:text-rose-500'
                          : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-sm'
                      }`}
                    >
                      {isFollowing ? (
                        <>
                          <UserCheck className="w-4 h-4" />
                          <span>Following</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4" />
                          <span>Follow</span>
                        </>
                      )}
                    </button>

                    <button
                      id="profile-message-btn"
                      onClick={() => {
                        if (!currentUser) onOpenAuth();
                        else onOpenDirectMessage(profile);
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 hover:bg-violet-500/10 hover:text-violet-500 text-neutral-900 dark:text-white transition-colors flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Message</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Bio */}
            {profile.bio && (
              <p className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-line">
                {profile.bio}
              </p>
            )}

            {/* Statistics */}
            <div className="flex items-center justify-around sm:justify-start sm:gap-8 pt-3 border-t border-neutral-100 dark:border-neutral-800/80">
              <div className="text-center sm:text-left">
                <span className="block text-base sm:text-lg font-black text-neutral-900 dark:text-white">
                  {posts.length}
                </span>
                <span className="text-xs text-neutral-400 font-medium">Posts</span>
              </div>

              <div
                onClick={() => setFollowersModalType('followers')}
                className="text-center sm:text-left cursor-pointer group"
              >
                <span className="block text-base sm:text-lg font-black text-neutral-900 dark:text-white group-hover:text-violet-500 transition-colors">
                  {profile.followersCount || 0}
                </span>
                <span className="text-xs text-neutral-400 font-medium group-hover:text-neutral-600 dark:group-hover:text-neutral-300">
                  Followers
                </span>
              </div>

              <div
                onClick={() => setFollowersModalType('following')}
                className="text-center sm:text-left cursor-pointer group"
              >
                <span className="block text-base sm:text-lg font-black text-neutral-900 dark:text-white group-hover:text-violet-500 transition-colors">
                  {profile.followingCount || 0}
                </span>
                <span className="text-xs text-neutral-400 font-medium group-hover:text-neutral-600 dark:group-hover:text-neutral-300">
                  Following
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* User's Posts Grid */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-3">
          <Grid className="w-4 h-4 text-violet-500" />
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Posts</h3>
        </div>

        {posts.length === 0 ? (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-12 text-center text-xs text-neutral-400">
            {isSelf ? 'You haven’t posted any photos yet.' : `@${profile.username} hasn’t shared any photos yet.`}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            {posts.map((post) => (
              <div
                key={post.id}
                className="group relative aspect-square rounded-2xl overflow-hidden bg-neutral-950 shadow-sm cursor-pointer"
              >
                <img
                  src={post.imageUrl}
                  alt={post.caption || 'Post'}
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

      {/* Edit Profile Modal */}
      {isSelf && (
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
        />
      )}

      {/* Followers / Following Modal */}
      {followersModalType && (
        <FollowersModal
          isOpen={!!followersModalType}
          onClose={() => setFollowersModalType(null)}
          userId={profile.uid}
          type={followersModalType}
          onSelectUser={onSelectUser}
          onOpenDirectMessage={(u) => onOpenDirectMessage(u as UserProfile)}
        />
      )}
    </div>
  );
}
