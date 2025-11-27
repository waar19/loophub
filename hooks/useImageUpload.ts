import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useToast } from "@/contexts/ToastContext";

interface UseImageUploadResult {
  uploadImage: (file: File) => Promise<string | null>;
  isUploading: boolean;
}

export function useImageUpload(): UseImageUploadResult {
  const [isUploading, setIsUploading] = useState(false);
  const { showError } = useToast();
  const supabase = createClient();

  const uploadImage = async (file: File): Promise<string | null> => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      showError("Solo se permiten archivos de imagen");
      return null;
    }

    // Validate file size (e.g., max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showError("La imagen no debe superar los 5MB");
      return null;
    }

    try {
      setIsUploading(true);

      // Create unique file name
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()
        .toString(36)
        .substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from("uploads").getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      showError("Error al subir la imagen");
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadImage, isUploading };
}
