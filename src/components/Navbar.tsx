import { useState } from 'react';
import {
  Sparkles,
  Search,
  PlusSquare,
  MessageCircle,
  Bell,
  Sun,
  Moon,
  LogOut,
  User,
  Compass,
  Home,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ActiveTab, UserProfile } from '../types';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenCreate: () => void;
  onOpenNotifications: () => void;
  onOpenAuth: () => void;
  onSelectUser?: (user: UserProfile) => void;
}

export function Navbar({
  activeTab,
  setActiveTab,
  onOpenCreate,
  onOpenNotifications,
  onOpenAuth,
}: NavbarProps) {
  const { currentUser, userProfile, signOutUser, unreadMessagesCount, unreadNotificationsCount } =
    useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  return (
    <header
      id="ivnn-navbar"
      className="sticky top-0 z-40 w-full border-b border-neutral-200 dark:border-neutral-800/80 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-md transition-colors"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <div
          id="ivnn-brand"
          onClick={() => setActiveTab('feed')}
          className="flex items-center gap-2 cursor-pointer group select-none"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-500 to-cyan-400 p-[2px] shadow-sm shadow-violet-500/20 group-hover:scale-105 transition-transform duration-200">
            <div className="w-full h-full bg-neutral-950 rounded-[10px] flex items-center justify-center">
              <span className="text-sm font-black tracking-tighter bg-gradient-to-r from-white via-neutral-200 to-violet-300 bg-clip-text text-transparent">
                IV
              </span>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-extrabold tracking-wider bg-gradient-to-r from-neutral-900 via-neutral-800 to-violet-600 dark:from-white dark:via-neutral-100 dark:to-violet-400 bg-clip-text text-transparent">
              IVNN
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          <button
            id="nav-home-btn"
            onClick={() => setActiveTab('feed')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'feed'
                ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Feed</span>
          </button>

          <button
            id="nav-search-btn"
            onClick={() => setActiveTab('search')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'search'
                ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Explore</span>
          </button>

          <button
            id="nav-messages-btn"
            onClick={() => setActiveTab('messages')}
            className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'messages'
                ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 hover:text-neutral-900 dark:hover:text-neutral-100'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>Messages</span>
            {unreadMessagesCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-violet-600 text-white rounded-full leading-none">
                {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
              </span>
            )}
          </button>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Create Post Button */}
          {currentUser && (
            <button
              id="nav-create-post-btn"
              onClick={onOpenCreate}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-sm shadow-violet-500/25 active:scale-95 transition-all"
            >
              <PlusSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Create</span>
            </button>
          )}

          {/* Notifications Button */}
          {currentUser && (
            <button
              id="nav-notifications-btn"
              onClick={onOpenNotifications}
              className="relative p-2.5 rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white dark:ring-neutral-950" />
              )}
            </button>
          )}

          {/* Theme Toggle */}
          <button
            id="nav-theme-toggle-btn"
            onClick={toggleTheme}
            className="p-2.5 rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-neutral-700" />}
          </button>

          {/* User Profile / Auth State */}
          {currentUser ? (
            <div className="relative">
              <button
                id="nav-user-menu-btn"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-violet-500/30 transition-all"
              >
                <img
                  src={userProfile?.photoURL || currentUser.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=IV`}
                  alt={userProfile?.displayName || 'User'}
                  className="w-8 h-8 rounded-full object-cover ring-1 ring-neutral-300 dark:ring-neutral-700"
                  referrerPolicy="no-referrer"
                />
              </button>

              {profileDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setProfileDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl z-50 p-2 text-sm text-neutral-800 dark:text-neutral-200 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-2 border-b border-neutral-100 dark:border-neutral-800/80 mb-1">
                      <p className="font-semibold truncate text-neutral-900 dark:text-white">
                        {userProfile?.displayName || currentUser.displayName || 'IVNN User'}
                      </p>
                      <p className="text-xs text-neutral-500 truncate">
                        @{userProfile?.username || 'user'}
                      </p>
                    </div>

                    <button
                      id="dropdown-profile-btn"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        setActiveTab('profile');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800/70 text-left transition-colors"
                    >
                      <User className="w-4 h-4 text-neutral-500" />
                      <span>My Profile</span>
                    </button>

                    <button
                      id="dropdown-signout-btn"
                      onClick={async () => {
                        setProfileDropdownOpen(false);
                        await signOutUser();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-left transition-colors mt-1"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              id="nav-signin-btn"
              onClick={onOpenAuth}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white shadow-sm shadow-violet-600/30 transition-all"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export function BottomNav({
  activeTab,
  setActiveTab,
  onOpenCreate,
  onOpenAuth,
}: {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenCreate: () => void;
  onOpenAuth: () => void;
}) {
  const { currentUser, userProfile, unreadMessagesCount } = useAuth();

  return (
    <nav
      id="ivnn-bottom-nav"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200 dark:border-neutral-800/80 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-lg px-2 py-1.5"
    >
      <div className="flex items-center justify-around">
        <button
          id="mobile-nav-feed"
          onClick={() => setActiveTab('feed')}
          className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
            activeTab === 'feed'
              ? 'text-violet-600 dark:text-violet-400'
              : 'text-neutral-500 dark:text-neutral-400'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-0.5">Feed</span>
        </button>

        <button
          id="mobile-nav-search"
          onClick={() => setActiveTab('search')}
          className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
            activeTab === 'search'
              ? 'text-violet-600 dark:text-violet-400'
              : 'text-neutral-500 dark:text-neutral-400'
          }`}
        >
          <Search className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-0.5">Search</span>
        </button>

        <button
          id="mobile-nav-create"
          onClick={() => (currentUser ? onOpenCreate() : onOpenAuth())}
          className="flex flex-col items-center justify-center p-1.5"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-violet-600/30 active:scale-95 transition-transform">
            <PlusSquare className="w-5 h-5" />
          </div>
        </button>

        <button
          id="mobile-nav-messages"
          onClick={() => (currentUser ? setActiveTab('messages') : onOpenAuth())}
          className={`relative flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
            activeTab === 'messages'
              ? 'text-violet-600 dark:text-violet-400'
              : 'text-neutral-500 dark:text-neutral-400'
          }`}
        >
          <MessageCircle className="w-5 h-5" />
          {unreadMessagesCount > 0 && (
            <span className="absolute top-1 right-2 px-1 text-[9px] font-bold bg-violet-600 text-white rounded-full leading-tight">
              {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
            </span>
          )}
          <span className="text-[10px] font-medium mt-0.5">Messages</span>
        </button>

        <button
          id="mobile-nav-profile"
          onClick={() => (currentUser ? setActiveTab('profile') : onOpenAuth())}
          className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
            activeTab === 'profile'
              ? 'text-violet-600 dark:text-violet-400'
              : 'text-neutral-500 dark:text-neutral-400'
          }`}
        >
          {currentUser && userProfile?.photoURL ? (
            <img
              src={userProfile.photoURL}
              alt="Profile"
              className={`w-5 h-5 rounded-full object-cover ${
                activeTab === 'profile'
                  ? 'ring-2 ring-violet-500'
                  : 'ring-1 ring-neutral-300 dark:ring-neutral-700'
              }`}
              referrerPolicy="no-referrer"
            />
          ) : (
            <User className="w-5 h-5" />
          )}
          <span className="text-[10px] font-medium mt-0.5">Profile</span>
        </button>
      </div>
    </nav>
  );
}
