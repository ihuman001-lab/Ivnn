import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

export interface ImageFilterOption {
  id: string;
  name: string;
  css: string;
  description: string;
}

export const PHOTO_FILTERS: ImageFilterOption[] = [
  { id: 'normal', name: 'Normal', css: 'none', description: 'Original clean tone' },
  { id: 'vivid', name: 'Vivid', css: 'saturate(1.4) contrast(1.1)', description: 'Punchy vibrant colors' },
  { id: 'warm', name: 'Golden', css: 'sepia(0.25) saturate(1.2) contrast(1.05) brightness(1.05)', description: 'Sun-drenched warmth' },
  { id: 'cool', name: 'Nordic', css: 'hue-rotate(190deg) saturate(0.9) contrast(1.08)', description: 'Crisp cold tones' },
  { id: 'mono', name: 'Obsidian', css: 'grayscale(1) contrast(1.25) brightness(0.95)', description: 'Deep high-contrast B&W' },
  { id: 'vintage', name: 'Film 90s', css: 'sepia(0.4) contrast(0.9) brightness(1.1) saturate(1.3)', description: 'Nostalgic film wash' },
  { id: 'cyber', name: 'Neon', css: 'contrast(1.3) saturate(1.6) brightness(1.05)', description: 'Intense midnight vibe' },
];

/**
 * Compresses an image file and renders filter directly into pixel data via Canvas
 */
export async function processAndCompressImage(
  file: File | Blob,
  filterId: string = 'normal',
  maxWidth: number = 1600,
  maxHeight: number = 1600,
  quality: number = 0.88
): Promise<{ blob: Blob; dataUrl: string; aspectRatio: number; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        const aspectRatio = width / height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Failed to get canvas 2D context'));
          return;
        }

        // Apply CSS filter if selected
        const filter = PHOTO_FILTERS.find((f) => f.id === filterId);
        if (filter && filter.css !== 'none') {
          ctx.filter = filter.css;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to Blob and DataURL
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              // Fallback to dataURL
              const dataUrl = canvas.toDataURL('image/jpeg', quality);
              resolve({ blob: file as Blob, dataUrl, aspectRatio, width, height });
              return;
            }
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve({ blob, dataUrl, aspectRatio, width, height });
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Failed to load image for processing'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads an image blob to Firebase Storage with a fallback to Data URL
 */
export async function uploadImageToStorage(
  blobOrFile: Blob | File,
  storagePath: string,
  fallbackDataUrl?: string
): Promise<string> {
  try {
    const storageRef = ref(storage, storagePath);
    const snapshot = await uploadBytes(storageRef, blobOrFile, {
      contentType: 'image/jpeg',
      cacheControl: 'public, max-age=31536000',
    });
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (error) {
    console.warn('Firebase storage direct upload fallback active:', error);
    if (fallbackDataUrl) {
      return fallbackDataUrl;
    }
    // Convert blob to base64 data url as guaranteed durable fallback
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blobOrFile);
    });
  }
}
