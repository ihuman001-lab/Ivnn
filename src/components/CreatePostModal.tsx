import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import {
  X,
  UploadCloud,
  Image as ImageIcon,
  Sparkles,
  Loader2,
  Check,
  Maximize2,
  Sliders,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createPost } from '../services/postService';
import { PHOTO_FILTERS, processAndCompressImage } from '../lib/imageUtils';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated?: () => void;
}

export function CreatePostModal({ isOpen, onClose, onPostCreated }: CreatePostModalProps) {
  const { userProfile } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>('normal');
  const [caption, setCaption] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.type.startsWith('image/')) return;
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!file || !userProfile || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setUploadProgress(20);

      // Process image with selected filter on canvas
      const processed = await processAndCompressImage(
        file,
        selectedFilter,
        1600,
        1600,
        0.88
      );
      setUploadProgress(60);

      // Create post with Firebase Storage + Firestore
      await createPost(
        userProfile,
        processed.blob,
        processed.dataUrl,
        caption,
        selectedFilter,
        aspectRatio
      );

      setUploadProgress(100);
      setTimeout(() => {
        // Reset state
        setFile(null);
        setPreviewUrl(null);
        setCaption('');
        setSelectedFilter('normal');
        setIsSubmitting(false);
        onClose();
        if (onPostCreated) onPostCreated();
      }, 400);
    } catch (error) {
      console.error('Failed to create post:', error);
      alert('Failed to publish post. Please try again.');
      setIsSubmitting(false);
    }
  };

  const activeFilterCss = PHOTO_FILTERS.find((f) => f.id === selectedFilter)?.css || 'none';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        id="create-post-card"
        className="w-full max-w-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-full transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="text-base font-bold text-neutral-900 dark:text-white">Create New Post</h2>
          <button
            id="publish-post-btn"
            onClick={handleSubmit}
            disabled={!previewUrl || isSubmitting}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-sm shadow-violet-600/30 active:scale-95 transition-all disabled:opacity-40 flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Sharing...</span>
              </>
            ) : (
              <span>Share</span>
            )}
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!previewUrl ? (
            /* Upload Dropzone */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-violet-500 bg-violet-500/10'
                  : 'border-neutral-300 dark:border-neutral-700 hover:border-violet-400 dark:hover:border-violet-500/50 bg-neutral-50 dark:bg-neutral-800/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleInputChange}
                className="hidden"
              />
              <div className="w-16 h-16 rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-4 shadow-inner">
                <UploadCloud className="w-8 h-8" />
              </div>
              <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
                Drag photos here or tap to upload
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-xs">
                Supports JPG, PNG, WEBP. High-resolution photos are optimized automatically.
              </p>
              <button
                type="button"
                className="mt-5 px-4 py-2 rounded-xl text-xs font-semibold bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 hover:bg-neutral-800 transition-colors shadow-sm"
              >
                Select from Device
              </button>
            </div>
          ) : (
            /* Image Preview & Editor */
            <div className="space-y-5">
              {/* Preview with applied filter */}
              <div className="relative rounded-2xl overflow-hidden bg-neutral-950 flex items-center justify-center max-h-[380px] shadow-lg">
                <img
                  src={previewUrl}
                  alt="Post preview"
                  style={{ filter: activeFilterCss }}
                  className="max-h-[380px] w-auto object-contain transition-all duration-200"
                />
                <button
                  onClick={() => {
                    setFile(null);
                    setPreviewUrl(null);
                  }}
                  className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors backdrop-blur-sm"
                  title="Change image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Filter Selector */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sliders className="w-4 h-4 text-violet-500" />
                  <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Filters & Tones
                  </span>
                </div>
                <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
                  {PHOTO_FILTERS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setSelectedFilter(f.id)}
                      className={`flex-shrink-0 flex flex-col items-center gap-1 p-1 rounded-xl border transition-all ${
                        selectedFilter === f.id
                          ? 'border-violet-500 bg-violet-500/10'
                          : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                      }`}
                    >
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-neutral-900">
                        <img
                          src={previewUrl}
                          alt={f.name}
                          style={{ filter: f.css }}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span
                        className={`text-[10px] font-medium ${
                          selectedFilter === f.id
                            ? 'text-violet-600 dark:text-violet-400 font-bold'
                            : 'text-neutral-500'
                        }`}
                      >
                        {f.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Caption & Details */}
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <img
                    src={userProfile?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=IV`}
                    alt={userProfile?.displayName}
                    className="w-7 h-7 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                    @{userProfile?.username || 'user'}
                  </span>
                </div>
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Write a caption, tags, or story..."
                  className="w-full p-3.5 rounded-2xl text-sm bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
                />
                <div className="flex justify-between items-center text-[11px] text-neutral-400 mt-1 px-1">
                  <span>Add #tags or @mentions</span>
                  <span>{caption.length}/1000</span>
                </div>
              </div>

              {/* Progress bar if uploading */}
              {isSubmitting && (
                <div className="space-y-1">
                  <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-600 to-indigo-600 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-center text-neutral-400">
                    Optimizing & uploading to IVNN...
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
