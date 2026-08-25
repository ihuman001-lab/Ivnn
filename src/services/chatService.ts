import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  increment,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Conversation, Message, UserProfile } from '../types';
import { uploadImageToStorage } from '../lib/imageUtils';
import { createNotification } from './userService';

/**
 * Returns a deterministic conversation ID for two users
 */
export function getConversationId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}

/**
 * Get or create a 1-on-1 conversation
 */
export async function getOrCreateConversation(
  currentUser: UserProfile,
  otherUser: UserProfile
): Promise<Conversation> {
  const convId = getConversationId(currentUser.uid, otherUser.uid);
  const convRef = doc(db, 'conversations', convId);
  const snap = await getDoc(convRef);

  if (snap.exists()) {
    const data = snap.data() as Conversation;
    // Update participant details in case they changed username or avatar
    const updatedDetails = {
      ...data.participantDetails,
      [currentUser.uid]: {
        uid: currentUser.uid,
        displayName: currentUser.displayName,
        username: currentUser.username,
        photoURL: currentUser.photoURL,
      },
      [otherUser.uid]: {
        uid: otherUser.uid,
        displayName: otherUser.displayName,
        username: otherUser.username,
        photoURL: otherUser.photoURL,
      },
    };
    await updateDoc(convRef, { participantDetails: updatedDetails });
    return { ...data, participantDetails: updatedDetails };
  }

  const newConv: Conversation = {
    id: convId,
    participants: [currentUser.uid, otherUser.uid],
    participantDetails: {
      [currentUser.uid]: {
        uid: currentUser.uid,
        displayName: currentUser.displayName,
        username: currentUser.username,
        photoURL: currentUser.photoURL,
      },
      [otherUser.uid]: {
        uid: otherUser.uid,
        displayName: otherUser.displayName,
        username: otherUser.username,
        photoURL: otherUser.photoURL,
      },
    },
    unreadCounts: {
      [currentUser.uid]: 0,
      [otherUser.uid]: 0,
    },
    updatedAt: Date.now(),
    createdAt: Date.now(),
  };

  await setDoc(convRef, newConv);
  return newConv;
}

/**
 * Subscribe to all conversations for a user in real time
 */
export function subscribeToUserConversations(
  userId: string,
  callback: (conversations: Conversation[]) => void
): () => void {
  const convCol = collection(db, 'conversations');
  const q = query(
    convCol,
    where('participants', 'array-contains', userId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => d.data() as Conversation);
      // Sort in memory by updatedAt descending
      list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      callback(list);
    },
    (error) => {
      console.warn('Conversations subscription error:', error);
    }
  );
}

/**
 * Subscribe to messages in a conversation in real time
 */
export function subscribeToMessages(
  convId: string,
  callback: (messages: Message[]) => void
): () => void {
  const msgCol = collection(db, 'conversations', convId, 'messages');
  const q = query(msgCol, orderBy('createdAt', 'asc'), limit(200));

  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => d.data() as Message);
      callback(list);
    },
    (error) => {
      console.warn('Messages subscription error:', error);
    }
  );
}

/**
 * Send a message with text and/or photo
 */
export async function sendMessage(
  convId: string,
  sender: UserProfile,
  recipient: { uid: string; displayName: string; username: string; photoURL: string },
  text: string,
  imageBlob?: Blob | null,
  fallbackDataUrl?: string,
  aspectRatio?: number
): Promise<Message> {
  const msgCol = collection(db, 'conversations', convId, 'messages');
  const msgRef = doc(msgCol);
  const msgId = msgRef.id;

  let imageUrl = '';
  if (imageBlob) {
    const storagePath = `chats/${convId}/${msgId}_${Date.now()}.jpg`;
    imageUrl = await uploadImageToStorage(imageBlob, storagePath, fallbackDataUrl);
  }

  const message: Message = {
    id: msgId,
    convId,
    senderId: sender.uid,
    senderUsername: sender.username,
    senderDisplayName: sender.displayName,
    senderPhotoURL: sender.photoURL,
    text: text.trim(),
    imageUrl: imageUrl || undefined,
    imageAspectRatio: aspectRatio,
    readBy: [sender.uid],
    createdAt: Date.now(),
  };

  await setDoc(msgRef, message);

  // Update conversation doc
  const convRef = doc(db, 'conversations', convId);
  const previewText = imageUrl ? (text ? `📷 ${text}` : '📷 Photo') : text;

  await updateDoc(convRef, {
    lastMessage: {
      text: previewText,
      senderId: sender.uid,
      senderUsername: sender.username,
      hasImage: !!imageUrl,
      createdAt: Date.now(),
    },
    updatedAt: Date.now(),
    [`unreadCounts.${recipient.uid}`]: increment(1),
  });

  // Create notification for recipient
  await createNotification({
    recipientId: recipient.uid,
    senderId: sender.uid,
    senderUsername: sender.username,
    senderDisplayName: sender.displayName,
    senderPhotoURL: sender.photoURL,
    type: 'message',
    messageText: previewText.length > 50 ? previewText.slice(0, 50) + '...' : previewText,
    read: false,
    createdAt: Date.now(),
  });

  return message;
}

/**
 * Mark all messages in a conversation as read by the user
 */
export async function markConversationAsRead(convId: string, userId: string): Promise<void> {
  try {
    const convRef = doc(db, 'conversations', convId);
    await updateDoc(convRef, {
      [`unreadCounts.${userId}`]: 0,
    });
  } catch (error) {
    console.warn('Error marking conversation read:', error);
  }
}

/**
 * Delete a message
 */
export async function deleteMessage(convId: string, messageId: string): Promise<boolean> {
  try {
    const msgRef = doc(db, 'conversations', convId, 'messages', messageId);
    await deleteDoc(msgRef);
    return true;
  } catch (error) {
    console.error('Error deleting message:', error);
    return false;
  }
}
