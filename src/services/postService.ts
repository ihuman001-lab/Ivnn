import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  increment,
  where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Post, Comment, UserProfile } from '../types';
import { uploadImageToStorage } from '../lib/imageUtils';
import { createNotification } from './userService';

/**
 * Create a new photo post
 */
export async function createPost(
  author: UserProfile,
  imageBlob: Blob,
  fallbackDataUrl: string,
  caption: string,
  filterId: string = 'normal',
  aspectRatio: number = 1
): Promise<Post> {
  const postsCollection = collection(db, 'posts');
  const postRef = doc(postsCollection);
  const postId = postRef.id;

  // Upload image to storage
  const storagePath = `posts/${author.uid}/${postId}_${Date.now()}.jpg`;
  const imageUrl = await uploadImageToStorage(imageBlob, storagePath, fallbackDataUrl);

  const newPost: Post = {
    id: postId,
    authorId: author.uid,
    authorUsername: author.username,
    authorDisplayName: author.displayName,
    authorPhotoURL: author.photoURL,
    caption: caption.trim(),
    imageUrl,
    imageAspectRatio: aspectRatio,
    filter: filterId,
    likes: [],
    likesCount: 0,
    commentsCount: 0,
    createdAt: Date.now(),
  };

  await setDoc(postRef, newPost);

  // Increment author's post count
  try {
    const userRef = doc(db, 'users', author.uid);
    await updateDoc(userRef, { postsCount: increment(1) });
  } catch (err) {
    console.error('Error updating user post count:', err);
  }

  return newPost;
}

/**
 * Subscribe to the real-time home feed
 */
export function subscribeToFeed(
  callback: (posts: Post[]) => void,
  maxPosts: number = 50
): () => void {
  const postsCollection = collection(db, 'posts');
  const q = query(postsCollection, orderBy('createdAt', 'desc'), limit(maxPosts));

  return onSnapshot(
    q,
    (snapshot) => {
      const posts: Post[] = snapshot.docs.map((d) => d.data() as Post);
      callback(posts);
    },
    (error) => {
      console.warn('Feed subscription error:', error);
    }
  );
}

/**
 * Fetch all posts by a specific user
 */
export async function getUserPosts(userId: string): Promise<Post[]> {
  try {
    const postsCollection = collection(db, 'posts');
    const q = query(
      postsCollection,
      where('authorId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(60)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Post);
  } catch (error) {
    // Fallback if composite index not yet generated
    try {
      const qFallback = query(
        collection(db, 'posts'),
        where('authorId', '==', userId)
      );
      const snap = await getDocs(qFallback);
      const posts = snap.docs.map((d) => d.data() as Post);
      return posts.sort((a, b) => b.createdAt - a.createdAt);
    } catch (err) {
      console.error('Error fetching user posts:', err);
      return [];
    }
  }
}

/**
 * Fetch a single post by ID
 */
export async function getPostById(postId: string): Promise<Post | null> {
  try {
    const postRef = doc(db, 'posts', postId);
    const snap = await getDoc(postRef);
    if (snap.exists()) {
      return snap.data() as Post;
    }
    return null;
  } catch (error) {
    console.error('Error fetching post:', error);
    return null;
  }
}

/**
 * Toggle like/unlike on a post
 */
export async function toggleLikePost(
  postId: string,
  user: UserProfile,
  authorId: string,
  postImageUrl?: string
): Promise<boolean> {
  const postRef = doc(db, 'posts', postId);
  const snap = await getDoc(postRef);
  if (!snap.exists()) return false;

  const data = snap.data() as Post;
  const currentLikes = data.likes || [];
  const isLiked = currentLikes.includes(user.uid);

  if (isLiked) {
    await updateDoc(postRef, {
      likes: arrayRemove(user.uid),
      likesCount: increment(-1),
    });
    return false;
  } else {
    await updateDoc(postRef, {
      likes: arrayUnion(user.uid),
      likesCount: increment(1),
    });

    // Notify post author if not liking own post
    if (authorId !== user.uid) {
      await createNotification({
        recipientId: authorId,
        senderId: user.uid,
        senderUsername: user.username,
        senderDisplayName: user.displayName,
        senderPhotoURL: user.photoURL,
        type: 'like',
        targetPostId: postId,
        postImageUrl: postImageUrl || data.imageUrl,
        read: false,
        createdAt: Date.now(),
      });
    }
    return true;
  }
}

/**
 * Add a comment to a post
 */
export async function addComment(
  postId: string,
  postAuthorId: string,
  user: UserProfile,
  text: string,
  postImageUrl?: string
): Promise<Comment | null> {
  const cleanText = text.trim();
  if (!cleanText) return null;

  const commentsCol = collection(db, 'posts', postId, 'comments');
  const commentRef = doc(commentsCol);
  const commentId = commentRef.id;

  const comment: Comment = {
    id: commentId,
    postId,
    authorId: user.uid,
    authorUsername: user.username,
    authorDisplayName: user.displayName,
    authorPhotoURL: user.photoURL,
    text: cleanText,
    createdAt: Date.now(),
  };

  await setDoc(commentRef, comment);

  // Update comment count on post
  try {
    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, {
      commentsCount: increment(1),
    });
  } catch (err) {
    console.error('Error updating comment count:', err);
  }

  // Send notification to author
  if (postAuthorId !== user.uid) {
    await createNotification({
      recipientId: postAuthorId,
      senderId: user.uid,
      senderUsername: user.username,
      senderDisplayName: user.displayName,
      senderPhotoURL: user.photoURL,
      type: 'comment',
      targetPostId: postId,
      postImageUrl,
      messageText: cleanText.length > 60 ? cleanText.slice(0, 60) + '...' : cleanText,
      read: false,
      createdAt: Date.now(),
    });
  }

  return comment;
}

/**
 * Real-time subscription to post comments
 */
export function subscribeToComments(
  postId: string,
  callback: (comments: Comment[]) => void
): () => void {
  const commentsCol = collection(db, 'posts', postId, 'comments');
  const q = query(commentsCol, orderBy('createdAt', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const comments: Comment[] = snapshot.docs.map((d) => d.data() as Comment);
      callback(comments);
    },
    (error) => {
      console.warn('Comments subscription error:', error);
    }
  );
}

/**
 * Delete a post (only allowed by author)
 */
export async function deletePost(postId: string, authorId: string): Promise<boolean> {
  try {
    const postRef = doc(db, 'posts', postId);
    await deleteDoc(postRef);

    // Decrement author post count
    const userRef = doc(db, 'users', authorId);
    await updateDoc(userRef, { postsCount: increment(-1) });

    return true;
  } catch (error) {
    console.error('Error deleting post:', error);
    return false;
  }
}
