import { useState, useEffect } from 'react';
import { useAuth, AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar, BottomNav } from './components/Navbar';
import { FeedView } from './components/FeedView';
import { SearchView } from './components/SearchView';
import { MessagesView } from './components/MessagesView';
import { ProfileView } from './components/ProfileView';
import { CreatePostModal } from './components/CreatePostModal';
import { AuthModal } from './components/AuthModal';
import { UsernameSetupModal } from './components/UsernameSetupModal';
import { NotificationsModal } from './components/NotificationsModal';
import { ActiveTab, UserProfile } from './types';
import { fetchUserProfileByUsername } from './services/userService';

function MainApp() {
  const { currentUser, userProfile, needsProfileSetup, loading } = useAuth();

  const [activeTab, setActiveTab] = useState<ActiveTab>('feed');
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState<boolean>(false);

  // Deep-linking / user profile target
  const [targetUsername, setTargetUsername] = useState<string | null>(null);
  const [directMessageRecipient, setDirectMessageRecipient] = useState<UserProfile | null>(null);

  // Check URL query parameters for direct links (e.g. ?u=alex or ?tab=messages)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const userParam = params.get('u');
    if (userParam) {
      setTargetUsername(userParam);
      setActiveTab('profile');
    }
  }, []);

  const handleSelectUser = (username: string) => {
    setTargetUsername(username);
    setActiveTab('profile');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenDirectMessageWithProfile = (user: UserProfile) => {
    setDirectMessageRecipient(user);
    setActiveTab('messages');
  };

  const handleOpenDirectMessageWithUsername = async (username: string) => {
    const target = await fetchUserProfileByUsername(username);
    if (target) {
      setDirectMessageRecipient(target);
    }
    setActiveTab('messages');
  };

  const handleTabChange = (tab: ActiveTab) => {
    if (tab === 'profile') {
      // Reset target username to view own profile
      setTargetUsername(null);
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors selection:bg-violet-500 selection:text-white font-sans">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onOpenCreate={() => setIsCreateOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* Main Content Area */}
      <main className="w-full">
        {activeTab === 'feed' && (
          <FeedView
            onOpenCreate={() => (currentUser ? setIsCreateOpen(true) : setIsAuthOpen(true))}
            onOpenAuth={() => setIsAuthOpen(true)}
            onSelectUser={handleSelectUser}
            onOpenDirectMessageWithAuthor={handleOpenDirectMessageWithUsername}
            onGoToExplore={() => setActiveTab('search')}
          />
        )}

        {activeTab === 'search' && (
          <SearchView
            onSelectUser={handleSelectUser}
            onOpenDirectMessage={handleOpenDirectMessageWithProfile}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        )}

        {activeTab === 'messages' && (
          currentUser ? (
            <MessagesView
              initialRecipientUser={directMessageRecipient}
              onSelectUserProfile={handleSelectUser}
              onOpenAuth={() => setIsAuthOpen(true)}
            />
          ) : (
            <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                Sign in to view messages
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Join IVNN to exchange real-time direct messages and photos with creators.
              </p>
              <button
                onClick={() => setIsAuthOpen(true)}
                className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-600/25 transition-all"
              >
                Sign In with Google
              </button>
            </div>
          )
        )}

        {activeTab === 'profile' && (
          <ProfileView
            targetUsername={targetUsername}
            onOpenAuth={() => setIsAuthOpen(true)}
            onOpenDirectMessage={handleOpenDirectMessageWithProfile}
            onBackToFeed={() => handleTabChange('feed')}
            onSelectUser={handleSelectUser}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onOpenCreate={() => setIsCreateOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
      />

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onPostCreated={() => {
          setActiveTab('feed');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />

      {/* First-time Onboarding & Profile Setup Modal */}
      <UsernameSetupModal
        isOpen={!!currentUser && needsProfileSetup && !loading}
      />

      {/* Notifications Drawer / Modal */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onSelectUser={handleSelectUser}
        onOpenDirectMessage={handleOpenDirectMessageWithUsername}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}
