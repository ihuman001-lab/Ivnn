export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  username: string; // Unique lowercase username
  usernameRaw?: string; // Display casing
  photoURL: string;
  bio?: string;
  website?: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  createdAt: number; // timestamp in ms
  updatedAt?: number;
}

export interface Post {
  id: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorPhotoURL: string;
  caption: string;
  imageUrl: string;
  imageAspectRatio?: number; // width / height
  filter?: string;
  likes: string[]; // array of user UIDs
  likesCount: number;
  commentsCount: number;
  createdAt: number; // timestamp in ms
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorPhotoURL: string;
  text: string;
  createdAt: number;
}

export interface ConversationParticipant {
  uid: string;
  displayName: string;
  username: string;
  photoURL: string;
}

export interface Conversation {
  id: string;
  participants: string[]; // [uid1, uid2]
  participantDetails: Record<string, ConversationParticipant>;
  lastMessage?: {
    text: string;
    senderId: string;
    senderUsername: string;
    hasImage?: boolean;
    createdAt: number;
  };
  unreadCounts: Record<string, number>;
  updatedAt: number;
  createdAt: number;
}

export interface Message {
  id: string;
  convId: string;
  senderId: string;
  senderUsername: string;
  senderDisplayName: string;
  senderPhotoURL: string;
  text: string;
  imageUrl?: string;
  imageAspectRatio?: number;
  readBy?: string[];
  createdAt: number;
}

export type NotificationType = 'like' | 'comment' | 'follow' | 'message';

export interface NotificationItem {
  id: string;
  recipientId: string;
  senderId: string;
  senderUsername: string;
  senderDisplayName: string;
  senderPhotoURL: string;
  type: NotificationType;
  targetPostId?: string;
  postImageUrl?: string;
  messageText?: string;
  read: boolean;
  createdAt: number;
}

export type ActiveTab = 'feed' | 'search' | 'create' | 'messages' | 'profile' | 'notifications';
