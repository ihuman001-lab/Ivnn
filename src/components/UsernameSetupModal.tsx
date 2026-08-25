import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { Camera, Check, X, Loader2, Sparkles, AtSign, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { checkUsernameAvailable } from '../services/userService';
import { processAndCompressImage, uploadImageToStorage } from '../lib/imageUtils';

export function UsernameSetupModal({ isOpen }: { isOpen: boolean }) {
  const { currentUser, userProfile, completeProfileSetup } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);

  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isUsernameValid, setIsUsernameValid] = useState<boolean | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize with current user info
  useEffect(() => {
    if (currentUser) {
      setDisplayName(userProfile?.displayName || currentUser.displayName || '');
      const initialUser = userProfile?.username && !userProfile.username.startsWith('temp_')
        ? userProfile.username
        : (currentUser.email ? currentUser.email.split('@')[0] : 'creator')
            .toLowerCase()
            .replace(/[^a-z0-9_.]/g, '')
            .slice(0, 16);
      setUsername(initialUser);
      setBio(userProfile?.bio || '');
      setPhotoURL(
        userProfile?.photoURL ||
        currentUser.photoURL ||
        `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(currentUser.displayName || 'IV')}`
      );
    }
  }, [currentUser, userProfile]);

  // Debounced username check
  useEffect(() => {
    if (!username) {
      setIsUsernameValid(null);
      setUsernameError(null);
      return;
    }

    const clean = username.toLowerCase().trim().replace(/^@/, '');
    if (clean.length < 3) {
      setIsUsernameValid(false);
      setUsernameError('Username must be at least 3 characters');
      return;
    }
    if (clean.length > 20) {
      setIsUsernameValid(false);
      setUsernameError('Username cannot exceed 20 characters');
      return;
    }
    if (!/^[a-zA-Z0-9_.]+$/.test(clean)) {
      setIsUsernameValid(false);
      setUsernameError('Letters, numbers, dots, and underscores only');
      return;
    }

    setIsCheckingUsername(true);
    const timer = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailable(clean, currentUser?.uid);
        setIsUsernameValid(available);
        setUsernameError(available ? null : 'This @username is already taken');
      } catch (err) {
        setIsUsernameValid(true);
      } finally {
        setIsCheckingUsername(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username, currentUser]);

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const processed = await processAndCompressImage(file, 'normal', 400, 400, 0.9);
      setAvatarBlob(processed.blob);
      setPhotoURL(processed.dataUrl);
    } catch (err) {
      console.error('Error processing avatar:', err);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username || isUsernameValid === false || !displayName.trim()) return;

    try {
      setIsSubmitting(true);
      let finalPhotoURL = photoURL;

      if (avatarBlob && currentUser) {
        const storagePath = `avatars/${currentUser.uid}_${Date.now()}.jpg`;
        finalPhotoURL = await uploadImageToStorage(avatarBlob, storagePath, photoURL);
      }

      await completeProfileSetup({
        displayName: displayName.trim(),
        username: username.toLowerCase().trim().replace(/^@/, ''),
        photoURL: finalPhotoURL,
        bio: bio.trim(),
      });
    } catch (err: any) {
      console.error('Error completing setup:', err);
      setUsernameError(err.message || 'Failed to save profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        id="profile-setup-card"
        className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl"
      >
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Profile Setup</span>
          </div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Claim Your Identity</h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Choose your unique @username and profile info on IVNN.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative group cursor-pointer">
              <img
                src={photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=IV`}
                alt="Avatar"
                className="w-20 h-20 rounded-full object-cover ring-2 ring-violet-500/40 p-0.5 bg-neutral-100 dark:bg-neutral-800"
                referrerPolicy="no-referrer"
              />
              <label
                htmlFor="avatar-upload"
                className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white"
              >
                <Camera className="w-6 h-6" />
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <label
              htmlFor="avatar-upload"
              className="text-xs text-violet-600 dark:text-violet-400 font-medium mt-2 cursor-pointer hover:underline"
            >
              Change Photo
            </label>
          </div>

          {/* Display Name */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Display Name
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                id="setup-displayname-input"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Alex Rivera"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              />
            </div>
          </div>

          {/* Unique Username */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Unique Username
            </label>
            <div className="relative">
              <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                id="setup-username-input"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().trim())}
                placeholder="username"
                className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-sm bg-neutral-50 dark:bg-neutral-800/80 border text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 ${
                  isUsernameValid === true
                    ? 'border-emerald-500/60 focus:ring-emerald-500/40'
                    : isUsernameValid === false
                    ? 'border-rose-500/60 focus:ring-rose-500/40'
                    : 'border-neutral-200 dark:border-neutral-700 focus:ring-violet-500/50'
                }`}
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                {isCheckingUsername ? (
                  <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
                ) : isUsernameValid === true ? (
                  <Check className="w-4 h-4 text-emerald-500" />
                ) : isUsernameValid === false ? (
                  <X className="w-4 h-4 text-rose-500" />
                ) : null}
              </div>
            </div>
            {usernameError ? (
              <p className="text-[11px] text-rose-500 mt-1">{usernameError}</p>
            ) : isUsernameValid === true ? (
              <p className="text-[11px] text-emerald-500 mt-1">@{username} is available!</p>
            ) : null}
          </div>

          {/* Bio */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Bio (Optional)
              </label>
              <span className="text-[10px] text-neutral-400">{bio.length}/150</span>
            </div>
            <textarea
              id="setup-bio-input"
              rows={2}
              maxLength={150}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell others what you share..."
              className="w-full px-3.5 py-2 rounded-xl text-sm bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
            />
          </div>

          {/* Submit Button */}
          <button
            id="setup-submit-btn"
            type="submit"
            disabled={isSubmitting || isUsernameValid === false || isCheckingUsername || !displayName.trim()}
            className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-md shadow-violet-600/25 active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating Profile...</span>
              </>
            ) : (
              <span>Enter IVNN</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
