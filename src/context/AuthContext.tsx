import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../lib/firebase';
import { UserProfile } from '../types';
import {
  fetchUserProfile,
  saveUserProfile,
  subscribeToNotifications,
} from '../services/userService';
import { subscribeToUserConversations } from '../services/chatService';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  needsProfileSetup: boolean;
  unreadMessagesCount: number;
  unreadNotificationsCount: number;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  completeProfileSetup: (data: {
    displayName: string;
    username: string;
    photoURL?: string;
    bio?: string;
  }) => Promise<void>;
  updateProfileData: (data: Partial<UserProfile>) => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [needsProfileSetup, setNeedsProfileSetup] = useState<boolean>(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState<number>(0);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(0);

  // Sync Firebase Auth state
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setCurrentUser(firebaseUser);

      if (firebaseUser) {
        // Fetch or create profile
        const profile = await fetchUserProfile(firebaseUser.uid);
        if (profile) {
          setUserProfile(profile);
          if (!profile.username || profile.username.startsWith('temp_')) {
            setNeedsProfileSetup(true);
          } else {
            setNeedsProfileSetup(false);
          }
        } else {
          // New user initial baseline
          setNeedsProfileSetup(true);
        }
      } else {
        setUserProfile(null);
        setNeedsProfileSetup(false);
        setUnreadMessagesCount(0);
        setUnreadNotificationsCount(0);
      }
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  // Listen to Firestore profile updates in real-time
  useEffect(() => {
    if (!currentUser) return;
    const userDocRef = doc(db, 'users', currentUser.uid);
    const unsub = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const profile = docSnap.data() as UserProfile;
          setUserProfile(profile);
          if (profile.username && !profile.username.startsWith('temp_')) {
            setNeedsProfileSetup(false);
          }
        }
      },
      (err) => {
        console.warn('User profile realtime sync warning:', err);
      }
    );
    return () => unsub();
  }, [currentUser]);

  // Listen to conversations for unread messages count
  useEffect(() => {
    if (!currentUser) return;
    const unsubConv = subscribeToUserConversations(currentUser.uid, (conversations) => {
      let totalUnread = 0;
      conversations.forEach((c) => {
        const count = c.unreadCounts?.[currentUser.uid] || 0;
        totalUnread += count;
      });
      setUnreadMessagesCount(totalUnread);
    });

    return () => unsubConv();
  }, [currentUser]);

  // Listen to notifications for unread notification count
  useEffect(() => {
    if (!currentUser) return;
    const unsubNotif = subscribeToNotifications(currentUser.uid, (notifications) => {
      const unread = notifications.filter((n) => !n.read).length;
      setUnreadNotificationsCount(unread);
    });

    return () => unsubNotif();
  }, [currentUser]);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Check if profile exists
      const existing = await fetchUserProfile(user.uid);
      if (!existing) {
        // Prepare initial placeholder username from email
        const base = (user.email ? user.email.split('@')[0] : 'user')
          .toLowerCase()
          .replace(/[^a-z0-9_.]/g, '')
          .slice(0, 16);
        const candidate = base.length >= 3 ? base : `user_${Math.floor(1000 + Math.random() * 9000)}`;

        const initialProfile: UserProfile = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || candidate,
          username: candidate,
          photoURL: user.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.displayName || 'IV')}`,
          bio: '',
          followersCount: 0,
          followingCount: 0,
          postsCount: 0,
          createdAt: Date.now(),
        };

        await saveUserProfile(user.uid, initialProfile);
        setUserProfile(initialProfile);
        setNeedsProfileSetup(true);
      } else if (!existing.username) {
        setNeedsProfileSetup(true);
      }
    } catch (error: any) {
      console.error('Google Sign In Error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const completeProfileSetup = async (data: {
    displayName: string;
    username: string;
    photoURL?: string;
    bio?: string;
  }) => {
    if (!currentUser) throw new Error('User not logged in');

    const cleanUsername = data.username.toLowerCase().trim().replace(/^@/, '');
    const oldUsername = userProfile?.username;

    const updatedData: Partial<UserProfile> = {
      uid: currentUser.uid,
      email: currentUser.email || '',
      displayName: data.displayName.trim() || 'User',
      username: cleanUsername,
      photoURL: data.photoURL || userProfile?.photoURL || currentUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.displayName || 'IV')}`,
      bio: data.bio?.trim() || '',
      followersCount: userProfile?.followersCount || 0,
      followingCount: userProfile?.followingCount || 0,
      postsCount: userProfile?.postsCount || 0,
      createdAt: userProfile?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    await saveUserProfile(currentUser.uid, updatedData, oldUsername);
    setUserProfile(updatedData as UserProfile);
    setNeedsProfileSetup(false);
  };

  const updateProfileData = async (data: Partial<UserProfile>) => {
    if (!currentUser || !userProfile) throw new Error('Not authenticated');
    const oldUsername = userProfile.username;
    await saveUserProfile(currentUser.uid, { ...userProfile, ...data }, oldUsername);
  };

  const refreshUserProfile = async () => {
    if (currentUser) {
      const p = await fetchUserProfile(currentUser.uid);
      if (p) setUserProfile(p);
    }
  };

  const signOutUser = async () => {
    await signOut(auth);
    setUserProfile(null);
    setNeedsProfileSetup(false);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        needsProfileSetup,
        unreadMessagesCount,
        unreadNotificationsCount,
        signInWithGoogle,
        signOutUser,
        completeProfileSetup,
        updateProfileData,
        refreshUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
