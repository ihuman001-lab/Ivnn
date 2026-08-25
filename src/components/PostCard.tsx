import { useState, FormEvent } from 'react';
import {
  Heart,
  MessageCircle,
  Send,
  MoreHorizontal,
  Trash2,
  Share2,
  Check,
  Sparkles,
} from 'lucide-react';
import { Post, Comment, UserProfile } from '../types';
import { useAuth } from '../context/AuthContext';
import { toggleLikePost, addComment, deletePost, subscribeToComments } from '../services/postService';
import { formatTimeAgo } from '../lib/timeUtils';
import { PHOTO_FILTERS } from '../lib/imageUtils';

interface PostCardProps {
  key?: string;
  post: Post;
  onOpenAuth: () => void;
  onSelectUser: (username: string) => void;
  onOpenPostDetail?: (post: Post) => void;
  onOpenDirectMessageWithAuthor?: (authorUsername: string) => void;
}

export function PostCard({
  post,
  onOpenAuth,
  onSelectUser,
  onOpenPostDetail,
  onOpenDirectMessageWithAuthor,
}: PostCardProps) {
  const { currentUser, userProfile } = useAuth();

  const [isLiked, setIsLiked] = useState<boolean>(
    currentUser ? post.likes?.includes(currentUser.uid) : false
  );
  const [likesCount, setLikesCount] = useState<number>(post.likesCount || post.likes?.length || 0);
  const [showHeartBurst, setShowHeartBurst] = useState<boolean>(false);
  const [commentText, setCommentText] = useState<string>('');
  const [isSubmittingComment, setIsSubmittingComment] = useState<boolean>(false);
  const [commentsCount, setCommentsCount] = useState<number>(post.commentsCount || 0);
  const [showComments, setShowComments] = useState<boolean>(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState<boolean>(false);
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isDeleted, setIsDeleted] = useState<boolean>(false);
  const [isCaptionExpanded, setIsCaptionExpanded] = useState<boolean>(false);

  const isAuthor = currentUser?.uid === post.authorId;

  // Handle Like
  const handleLike = async () => {
    if (!currentUser || !userProfile) {
      onOpenAuth();
      return;
    }

    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    setLikesCount((prev) => (nextLiked ? prev + 1 : Math.max(0, prev - 1)));

    try {
      await toggleLikePost(post.id, userProfile, post.authorId, post.imageUrl);
    } catch (err) {
      // Revert on error
      setIsLiked(!nextLiked);
      setLikesCount((prev) => (nextLiked ? Math.max(0, prev - 1) : prev + 1));
    }
  };

  // Double tap to like
  const handleDoubleTap = () => {
    if (!isLiked) {
      handleLike();
    }
    setShowHeartBurst(true);
    setTimeout(() => setShowHeartBurst(false), 900);
  };

  // Load comments
  const handleToggleComments = () => {
    const nextState = !showComments;
    setShowComments(nextState);

    if (nextState && !commentsLoaded) {
      setCommentsLoaded(true);
      subscribeToComments(post.id, (list) => {
        setComments(list);
        setCommentsCount(list.length);
      });
    }
  };

  // Submit Comment
  const handleCommentSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !currentUser || !userProfile || isSubmittingComment) return;

    try {
      setIsSubmittingComment(true);
      await addComment(post.id, post.authorId, userProfile, commentText.trim(), post.imageUrl);
      setCommentText('');
      setCommentsCount((prev) => prev + 1);
      if (!showComments) {
        handleToggleComments();
      }
    } catch (err) {
      console.error('Error adding comment:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Delete Post
  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    try {
      await deletePost(post.id, post.authorId);
      setIsDeleted(true);
    } catch (err) {
      alert('Failed to delete post');
    }
  };

  // Copy Link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.origin + `?post=${post.id}`);
    setCopiedLink(true);
    setTimeout(() => {
      setCopiedLink(false);
      setShowMenu(false);
    }, 1500);
  };

  if (isDeleted) return null;

  const filterCss = PHOTO_FILTERS.find((f) => f.id === post.filter)?.css || 'none';

  return (
    <article
      id={`post-${post.id}`}
      className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/90 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow mb-6"
    >
      {/* Post Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-100 dark:border-neutral-800/60">
        <div
          onClick={() => onSelectUser(post.authorUsername)}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <img
            src={post.authorPhotoURL || `https://api.dicebear.com/7.x/initials/svg?seed=IV`}
            alt={post.authorDisplayName || post.authorUsername}
            className="w-10 h-10 rounded-full object-cover ring-1 ring-neutral-200 dark:ring-neutral-700 group-hover:ring-violet-500 transition-all"
            referrerPolicy="no-referrer"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-neutral-900 dark:text-white group-hover:text-violet-500 transition-colors">
                {post.authorDisplayName || post.authorUsername}
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
              <span>@{post.authorUsername}</span>
              <span>•</span>
              <span>{formatTimeAgo(post.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Options dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-full transition-colors"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 mt-1 w-44 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xl z-40 p-1.5 text-xs text-neutral-800 dark:text-neutral-200 animate-in fade-in duration-100">
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-700/60 text-left transition-colors"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
                </button>

                {!isAuthor && onOpenDirectMessageWithAuthor && (
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onOpenDirectMessageWithAuthor(post.authorUsername);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-700/60 text-left transition-colors"
                  >
                    <Send className="w-3.5 h-3.5 text-violet-500" />
                    <span>Send Message</span>
                  </button>
                )}

                {isAuthor && (
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-left transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Post</span>
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Post Image Container */}
      <div
        onDoubleClick={handleDoubleTap}
        className="relative bg-neutral-950 flex items-center justify-center overflow-hidden cursor-pointer select-none"
        style={{ minHeight: '320px', maxHeight: '580px' }}
      >
        <img
          src={post.imageUrl}
          alt={post.caption || 'Post image'}
          style={{ filter: filterCss }}
          className="w-full max-h-[580px] object-cover sm:object-contain"
          loading="lazy"
        />

        {/* Double-tap Heart Burst Animation */}
        {showHeartBurst && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="animate-in zoom-in-50 fade-in duration-300 scale-125">
              <Heart className="w-24 h-24 fill-rose-500 text-rose-500 drop-shadow-2xl animate-pulse" />
            </div>
          </div>
        )}
      </div>

      {/* Post Action Buttons */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Like button */}
            <button
              id={`like-btn-${post.id}`}
              onClick={handleLike}
              className={`p-2 rounded-full transition-all active:scale-125 ${
                isLiked
                  ? 'text-rose-500 bg-rose-500/10'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <Heart className={`w-6 h-6 ${isLiked ? 'fill-rose-500' : ''}`} />
            </button>

            {/* Comment button */}
            <button
              id={`comment-btn-${post.id}`}
              onClick={handleToggleComments}
              className="p-2 rounded-full text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <MessageCircle className="w-6 h-6" />
            </button>

            {/* Direct message / share button */}
            <button
              onClick={() => {
                if (onOpenDirectMessageWithAuthor) {
                  onOpenDirectMessageWithAuthor(post.authorUsername);
                } else {
                  handleCopyLink();
                }
              }}
              className="p-2 rounded-full text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              title="Share or Message"
            >
              <Send className="w-5 h-5 -rotate-12" />
            </button>
          </div>

          <button
            onClick={handleCopyLink}
            className="p-2 rounded-full text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
          >
            {copiedLink ? <Check className="w-5 h-5 text-emerald-500" /> : <Share2 className="w-5 h-5" />}
          </button>
        </div>

        {/* Likes Count */}
        <div className="text-sm font-bold text-neutral-900 dark:text-white px-1">
          {likesCount === 0
            ? 'Be the first to like this'
            : `${likesCount.toLocaleString()} ${likesCount === 1 ? 'like' : 'likes'}`}
        </div>

        {/* Post Caption */}
        {post.caption && (
          <div className="text-sm text-neutral-800 dark:text-neutral-200 px-1 leading-relaxed">
            <span
              onClick={() => onSelectUser(post.authorUsername)}
              className="font-bold text-neutral-900 dark:text-white mr-2 cursor-pointer hover:underline"
            >
              @{post.authorUsername}
            </span>
            <span>
              {isCaptionExpanded || post.caption.length <= 120
                ? post.caption
                : `${post.caption.slice(0, 120)}...`}
            </span>
            {post.caption.length > 120 && (
              <button
                onClick={() => setIsCaptionExpanded(!isCaptionExpanded)}
                className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 ml-1 font-medium"
              >
                {isCaptionExpanded ? 'less' : 'more'}
              </button>
            )}
          </div>
        )}

        {/* Comments Section Toggle */}
        {commentsCount > 0 && (
          <button
            onClick={handleToggleComments}
            className="text-xs text-neutral-500 dark:text-neutral-400 px-1 hover:text-neutral-700 dark:hover:text-neutral-300 font-medium"
          >
            {showComments
              ? 'Hide comments'
              : `View all ${commentsCount} ${commentsCount === 1 ? 'comment' : 'comments'}`}
          </button>
        )}

        {/* Comments Drawer */}
        {showComments && (
          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800/80 space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {comments.length === 0 ? (
              <p className="text-xs text-neutral-400 py-2 text-center">No comments yet. Start the conversation!</p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="flex items-start gap-2.5 text-xs">
                  <img
                    src={c.authorPhotoURL || `https://api.dicebear.com/7.x/initials/svg?seed=IV`}
                    alt={c.authorUsername}
                    className="w-6 h-6 rounded-full object-cover flex-shrink-0 cursor-pointer"
                    onClick={() => onSelectUser(c.authorUsername)}
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1">
                    <div className="bg-neutral-100 dark:bg-neutral-800/70 rounded-2xl px-3 py-2">
                      <span
                        onClick={() => onSelectUser(c.authorUsername)}
                        className="font-bold text-neutral-900 dark:text-white cursor-pointer hover:underline mr-1.5"
                      >
                        @{c.authorUsername}
                      </span>
                      <span className="text-neutral-700 dark:text-neutral-300">{c.text}</span>
                    </div>
                    <span className="text-[10px] text-neutral-400 ml-2 mt-0.5 block">
                      {formatTimeAgo(c.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Quick Comment Input */}
        <form onSubmit={handleCommentSubmit} className="flex items-center gap-2 pt-2">
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder={currentUser ? 'Add a comment...' : 'Sign in to comment'}
            disabled={!currentUser}
            className="flex-1 px-4 py-2 rounded-2xl text-xs bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!commentText.trim() || !currentUser || isSubmittingComment}
            className="px-3 py-2 rounded-2xl text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-40 transition-all flex items-center justify-center"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </article>
  );
}
