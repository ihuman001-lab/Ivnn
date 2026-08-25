import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  onSnapshot,
  increment,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile, NotificationItem } from '../types';

/**
 * Fetch a user profile by UID
 */
export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const docRef = doc(db, 'users', uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

/**
 * Fetch a user profile by exact username
 */
export async function fetchUserProfileByUsername(username: string): Promise<UserProfile | null> {
  try {
    const cleanUsername = username.toLowerCase().trim().replace(/^@/, '');
    const q = query(
      collection(db, 'users'),
      where('username', '==', cleanUsername),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user by username:', error);
    return null;
  }
}

/**
 * Check if a username is available
 */
export async function checkUsernameAvailable(username: string, currentUid?: string): Promise<boolean> {
  const clean = username.toLowerCase().trim().replace(/^@/, '');
  if (!clean || clean.length < 3 || clean.length > 24) return false;
  if (!/^[a-zA-Z0-9._]+$/.test(clean)) return false;

  try {
    const usernameDocRef = doc(db, 'usernames', clean);
    const snap = await getDoc(usernameDocRef);
    if (!snap.exists()) return true;
    if (currentUid && snap.data()?.uid === currentUid) return true;
    return false;
  } catch (error) {
    console.error('Error checking username:', error);
    return true; // allow attempt if network ok
  }
}

/**
 * Register or initialize a user profile and reserve username
 */
export async function saveUserProfile(
  uid: string,
  profile: Partial<UserProfile>,
  oldUsername?: string
): Promise<void> {
  const batch = writeBatch(db);
  const cleanUsername = (profile.username || '').toLowerCase().trim().replace(/^@/, '');

  const userRef = doc(db, 'users', uid);
  const updateData: any = {
    ...profile,
    username: cleanUsername,
    updatedAt: Date.now(),
  };

  batch.set(userRef, updateData, { merge: true });

  // Reserve new username
  if (cleanUsername) {
    const newUsernameRef = doc(db, 'usernames', cleanUsername);
    batch.set(newUsernameRef, { uid, createdAt: Date.now() });

    // Release old username if changed
    if (oldUsername && oldUsername.toLowerCase() !== cleanUsername) {
      const oldUsernameRef = doc(db, 'usernames', oldUsername.toLowerCase());
      batch.delete(oldUsernameRef);
    }
  }

  await batch.commit();
}

/**
 * Live search users by username or displayName
 */
export async function searchUsers(searchTerm: string, maxResults: number = 25): Promise<UserProfile[]> {
  const clean = searchTerm.trim().toLowerCase().replace(/^@/, '');
  if (!clean) return [];

  try {
    // Search by username range
    const q1 = query(
      collection(db, 'users'),
      where('username', '>=', clean),
      where('username', '<=', clean + '\uf8ff'),
      limit(maxResults)
    );
    const snap1 = await getDocs(q1);
    const usersMap = new Map<string, UserProfile>();

    snap1.docs.forEach((d) => {
      const u = d.data() as UserProfile;
      usersMap.set(u.uid, u);
    });

    // Also search all recent users if small search
    if (usersMap.size < maxResults) {
      const qAll = query(collection(db, 'users'), limit(50));
      const snapAll = await getDocs(qAll);
      snapAll.docs.forEach((d) => {
        const u = d.data() as UserProfile;
        if (
          (u.displayName && u.displayName.toLowerCase().includes(clean)) ||
          (u.username && u.username.toLowerCase().includes(clean))
        ) {
          usersMap.set(u.uid, u);
        }
      });
    }

    return Array.from(usersMap.values());
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
}

/**
 * Fetch all registered users for discovery
 */
export async function fetchDiscoverUsers(max: number = 20): Promise<UserProfile[]> {
  try {
    const q = query(collection(db, 'users'), limit(max));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as UserProfile);
  } catch (error) {
    console.error('Error fetching discover users:', error);
    return [];
  }
}

/**
 * Check if current user is following target user
 */
export async function checkIsFollowing(currentUid: string, targetUid: string): Promise<boolean> {
  if (!currentUid || !targetUid || currentUid === targetUid) return false;
  try {
    const followRef = doc(db, 'users', currentUid, 'following', targetUid);
    const snap = await getDoc(followRef);
    return snap.exists();
  } catch (error) {
    return false;
  }
}

/**
 * Toggle follow / unfollow user
 */
export async function toggleFollowUser(
  currentUser: UserProfile,
  targetUser: UserProfile
): Promise<boolean> {
  if (currentUser.uid === targetUser.uid) return false;

  const followingRef = doc(db, 'users', currentUser.uid, 'following', targetUser.uid);
  const followerRef = doc(db, 'users', targetUser.uid, 'followers', currentUser.uid);
  const currentUserDoc = doc(db, 'users', currentUser.uid);
  const targetUserDoc = doc(db, 'users', targetUser.uid);

  const snap = await getDoc(followingRef);
  const isFollowing = snap.exists();

  const batch = writeBatch(db);

  if (isFollowing) {
    // Unfollow
    batch.delete(followingRef);
    batch.delete(followerRef);
    batch.update(currentUserDoc, { followingCount: increment(-1) });
    batch.update(targetUserDoc, { followersCount: increment(-1) });
    await batch.commit();
    return false;
  } else {
    // Follow
    batch.set(followingRef, {
      uid: targetUser.uid,
      displayName: targetUser.displayName,
      username: targetUser.username,
      photoURL: targetUser.photoURL,
      createdAt: Date.now(),
    });
    batch.set(followerRef, {
      uid: currentUser.uid,
      displayName: currentUser.displayName,
      username: currentUser.username,
      photoURL: currentUser.photoURL,
      createdAt: Date.now(),
    });
    batch.update(currentUserDoc, { followingCount: increment(1) });
    batch.update(targetUserDoc, { followersCount: increment(1) });
    await batch.commit();

    // Trigger notification
    await createNotification({
      recipientId: targetUser.uid,
      senderId: currentUser.uid,
      senderUsername: currentUser.username,
      senderDisplayName: currentUser.displayName,
      senderPhotoURL: currentUser.photoURL,
      type: 'follow',
      read: false,
      createdAt: Date.now(),
    });

    return true;
  }
}

/**
 * Fetch followers list for a user
 */
export async function fetchFollowersList(userId: string): Promise<any[]> {
  try {
    const q = query(collection(db, 'users', userId, 'followers'), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data());
  } catch (error) {
    console.error('Error fetching followers:', error);
    return [];
  }
}

/**
 * Fetch following list for a user
 */
export async function fetchFollowingList(userId: string): Promise<any[]> {
  try {
    const q = query(collection(db, 'users', userId, 'following'), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data());
  } catch (error) {
    console.error('Error fetching following:', error);
    return [];
  }
}

/**
 * Create a notification for a user
 */
export async function createNotification(
  notif: Omit<NotificationItem, 'id'>
): Promise<void> {
  // Don't notify self
  if (notif.senderId === notif.recipientId) return;

  try {
    const notifColl = collection(db, 'users', notif.recipientId, 'notifications');
    const docRef = doc(notifColl);
    await setDoc(docRef, {
      ...notif,
      id: docRef.id,
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

/**
 * Subscribe to notifications in real-time
 */
export function subscribeToNotifications(
  userId: string,
  callback: (notifications: NotificationItem[]) => void
): () => void {
  const notifColl = collection(db, 'users', userId, 'notifications');
  const q = query(notifColl, orderBy('createdAt', 'desc'), limit(40));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: NotificationItem[] = snapshot.docs.map((d) => d.data() as NotificationItem);
      callback(list);
    },
    (error) => {
      console.warn('Notifications snapshot error:', error);
    }
  );
}

/**
 * Mark all notifications as read
 */
export async function markNotificationsAsRead(userId: string): Promise<void> {
  try {
    const notifColl = collection(db, 'users', userId, 'notifications');
    const q = query(notifColl, where('read', '==', false), limit(50));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach((d) => {
      batch.update(d.ref, { read: true });
    });
    await batch.commit();
  } catch (error) {
    console.error('Error marking notifications as read:', error);
  }
}
