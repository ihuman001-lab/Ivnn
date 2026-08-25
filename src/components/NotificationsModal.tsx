import { useState, useEffect } from 'react';
import {
  X,
  Heart,
  MessageCircle,
  UserPlus,
  Send,
  CheckCheck,
  Bell,
  Sparkles,
} from 'lucide-react';
import { NotificationItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { subscribeToNotifications, markNotificationsAsRead } from '../services/userService';
import { formatTimeAgo } from '../lib/timeUtils';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUser: (username: string) => void;
  onOpenDirectMessage: (username: string) => void;
}

export function NotificationsModal({
  isOpen,
  onClose,
  onSelectUser,
  onOpenDirectMessage,
}: NotificationsModalProps) {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    if (!currentUser || !isOpen) return;

    const unsub = subscribeToNotifications(currentUser.uid, (list) => {
      setNotifications(list);
    });

    return () => unsub();
  }, [currentUser, isOpen]);

  const handleMarkAllRead = async () => {
    if (currentUser) {
      await markNotificationsAsRead(currentUser.uid);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-violet-500" />
            <h3 className="text-base font-bold text-neutral-900 dark:text-white">Activity</h3>
          </div>
          <div className="flex items-center gap-2">
            {notifications.some((n) => !n.read) && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-violet-600 dark:text-violet-400 font-semibold hover:underline flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Mark all read</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifications list */}
        <div className="flex-1 overflow-y-auto space-y-2.5 divide-y divide-neutral-100 dark:divide-neutral-800/60 pr-1">
          {notifications.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Bell className="w-10 h-10 text-neutral-300 dark:text-neutral-700 mx-auto" />
              <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                No activity yet
              </p>
              <p className="text-[11px] text-neutral-400">
                When someone likes your post, comments, follows, or messages you, it will appear here.
              </p>
            </div>
          ) : (
            notifications.map((notif) => {
              const getIcon = () => {
                switch (notif.type) {
                  case 'like':
                    return <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />;
                  case 'comment':
                    return <MessageCircle className="w-3.5 h-3.5 text-cyan-500" />;
                  case 'follow':
                    return <UserPlus className="w-3.5 h-3.5 text-indigo-500" />;
                  case 'message':
                    return <Send className="w-3.5 h-3.5 text-violet-500" />;
                  default:
                    return <Sparkles className="w-3.5 h-3.5 text-amber-500" />;
                }
              };

              const getText = () => {
                switch (notif.type) {
                  case 'like':
                    return 'liked your photo';
                  case 'comment':
                    return notif.messageText ? `commented: "${notif.messageText}"` : 'commented on your photo';
                  case 'follow':
                    return 'started following you';
                  case 'message':
                    return notif.messageText ? `sent a message: "${notif.messageText}"` : 'sent you a message';
                  default:
                    return 'interacted with your profile';
                }
              };

              return (
                <div
                  key={notif.id}
                  onClick={() => {
                    onClose();
                    if (notif.type === 'message') {
                      onOpenDirectMessage(notif.senderUsername);
                    } else {
                      onSelectUser(notif.senderUsername);
                    }
                  }}
                  className={`pt-2.5 flex items-center justify-between gap-3 p-2.5 rounded-2xl cursor-pointer transition-colors ${
                    !notif.read
                      ? 'bg-violet-500/10 dark:bg-violet-500/15 border-l-2 border-violet-500'
                      : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative flex-shrink-0">
                      <img
                        src={notif.senderPhotoURL || `https://api.dicebear.com/7.x/initials/svg?seed=IV`}
                        alt={notif.senderUsername}
                        className="w-10 h-10 rounded-full object-cover ring-1 ring-neutral-200 dark:ring-neutral-700"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute -bottom-1 -right-1 p-1 bg-white dark:bg-neutral-900 rounded-full shadow-sm">
                        {getIcon()}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-neutral-900 dark:text-white leading-snug">
                        <span className="font-bold mr-1">@{notif.senderUsername}</span>
                        <span className="text-neutral-600 dark:text-neutral-400">{getText()}</span>
                      </p>
                      <span className="text-[10px] text-neutral-400 mt-0.5 block">
                        {formatTimeAgo(notif.createdAt)}
                      </span>
                    </div>
                  </div>

                  {notif.postImageUrl && (
                    <img
                      src={notif.postImageUrl}
                      alt="Post thumbnail"
                      className="w-10 h-10 rounded-xl object-cover ring-1 ring-neutral-200 dark:ring-neutral-700 flex-shrink-0"
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
