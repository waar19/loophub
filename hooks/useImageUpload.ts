import { useState } from "react";
import { useToast } from "@/contexts/ToastContext";

interface UploadOptions {
  threadId?: string;
  commentId?: string;
  profile?: boolean;
}

interface UploadResult {
  url: string;
  id?: string;
  fileName: string;
  fileSize: number;
}

interface UseImageUploadResult {
  uploadImage: (file: File, options?: UploadOptions) => Promise<string | null>;
  isUploading: boolean;
  progress: number;
}

export function useImageUpload(): UseImageUploadResult {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { showError, showSuccess } = useToast();

  const uploadImage = async (file: File, options?: UploadOptions): Promise<string | null> => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      showError("Solo se permiten archivos de imagen");
      return null;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showError("La imagen no debe superar los 5MB");
      return null;
    }

    // Validate file extension
    const ext = file.name.split('.').pop()?.toLowerCase();
    const allowedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    if (!ext || !allowedExts.includes(ext)) {
      showError("Formato no permitido. Usa: jpg, png, gif o webp");
      return null;
    }

    try {
      setIsUploading(true);
      setProgress(10);

      const formData = new FormData();
      formData.append('file', file);
      
      if (options?.threadId) {
        formData.append('threadId', options.threadId);
      }
      if (options?.commentId) {
        formData.append('commentId', options.commentId);
      }
      if (options?.profile) {
        formData.append('profile', 'true');
      }

      setProgress(30);

      const response = await fetch('/api/uploads', {
        method: 'POST',
        body: formData,
      });

      setProgress(80);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al subir la imagen');
      }

      const result: UploadResult = await response.json();
      
      setProgress(100);
      
      return result.url;
    } catch (error) {
      console.error("Error uploading image:", error);
      const message = error instanceof Error ? error.message : "Error al subir la imagen";
      showError(message);
      return null;
    } finally {
      setIsUploading(false);
      setTimeout(() => setProgress(0), 500);
    }
  };

  return { uploadImage, isUploading, progress };
}
