/**
 * OptimizedImage - Componente de imagen con lazy loading y blur placeholder
 */

'use client';

import Image from 'next/image';
import { useState, useCallback } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  priority?: boolean;
  quality?: number;
  /** Mostrar placeholder blur */
  showBlur?: boolean;
  /** Color de fondo mientras carga */
  backgroundColor?: string;
  /** Aspect ratio para contenedor (e.g., "16/9", "1/1", "4/3") */
  aspectRatio?: string;
  /** Callback cuando la imagen carga */
  onLoad?: () => void;
  /** Callback cuando hay error */
  onError?: () => void;
  /** Imagen fallback si hay error */
  fallbackSrc?: string;
  /** Sizes para responsive */
  sizes?: string;
}

// Placeholder blur base64 genérico (gris claro)
const DEFAULT_BLUR_DATA_URL = 
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDABQODxIPDRQSEBIXFRQdHx0fHRsdHSIeHx8iIicpKSkpKSklJTU1NSU1JUZGRkZGRm5ubm5uf39/f39/f39/f3//2wBDARUXFyAeIB8hIR9CQEJCf39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f39/f3//wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBEQCEAwEPwAB//9k=';

export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill = false,
  className = '',
  priority = false,
  quality = 75,
  showBlur = true,
  backgroundColor = 'bg-gray-200 dark:bg-gray-700',
  aspectRatio,
  onLoad,
  onError,
  fallbackSrc = '/images/placeholder.png',
  sizes,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoading(false);
    
    // Usar fallback si está disponible
    if (currentSrc !== fallbackSrc && fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setHasError(false);
      setIsLoading(true);
    }
    
    onError?.();
  }, [currentSrc, fallbackSrc, onError]);

  // Determinar si es URL externa
  const isExternal = currentSrc.startsWith('http://') || currentSrc.startsWith('https://');
  
  // Para URLs externas, usar unoptimized
  const imageProps = isExternal ? { unoptimized: true } : {};

  // Container style para aspect ratio
  const containerStyle = aspectRatio
    ? { aspectRatio, position: 'relative' as const }
    : undefined;

  const containerClass = `
    ${aspectRatio ? 'w-full overflow-hidden' : ''}
    ${isLoading ? backgroundColor : ''}
    ${className}
  `.trim();

  if (fill) {
    return (
      <div 
        className={`relative ${containerClass}`}
        style={containerStyle}
      >
        <Image
          src={currentSrc}
          alt={alt}
          fill
          className={`
            object-cover
            transition-opacity duration-300
            ${isLoading ? 'opacity-0' : 'opacity-100'}
          `}
          priority={priority}
          quality={quality}
          sizes={sizes || '100vw'}
          placeholder={showBlur ? 'blur' : 'empty'}
          blurDataURL={DEFAULT_BLUR_DATA_URL}
          onLoad={handleLoad}
          onError={handleError}
          {...imageProps}
        />
        {hasError && !fallbackSrc && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-700">
            <span className="text-gray-500 dark:text-gray-400 text-sm">
              Error loading image
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      className={containerClass}
      style={containerStyle}
    >
      <Image
        src={currentSrc}
        alt={alt}
        width={width || 100}
        height={height || 100}
        className={`
          transition-opacity duration-300
          ${isLoading ? 'opacity-0' : 'opacity-100'}
          ${aspectRatio ? 'w-full h-full object-cover' : ''}
        `}
        priority={priority}
        quality={quality}
        sizes={sizes}
        placeholder={showBlur ? 'blur' : 'empty'}
        blurDataURL={DEFAULT_BLUR_DATA_URL}
        onLoad={handleLoad}
        onError={handleError}
        {...imageProps}
      />
      {hasError && !fallbackSrc && (
        <div className="flex items-center justify-center bg-gray-200 dark:bg-gray-700 w-full h-full min-h-[100px]">
          <span className="text-gray-500 dark:text-gray-400 text-sm">
            Error loading image
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Avatar optimizado con soporte para iniciales como fallback
 */
interface OptimizedAvatarProps {
  src?: string | null;
  alt: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  /** Nombre para generar iniciales como fallback */
  name?: string;
}

const AVATAR_SIZES = {
  xs: { dimension: 24, textSize: 'text-xs' },
  sm: { dimension: 32, textSize: 'text-sm' },
  md: { dimension: 40, textSize: 'text-base' },
  lg: { dimension: 56, textSize: 'text-lg' },
  xl: { dimension: 80, textSize: 'text-xl' },
};

export function OptimizedAvatar({
  src,
  alt,
  size = 'md',
  className = '',
  name,
}: OptimizedAvatarProps) {
  const [hasError, setHasError] = useState(false);
  const { dimension, textSize } = AVATAR_SIZES[size];

  // Generar iniciales del nombre
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Generar color basado en el nombre
  const getColorFromName = (name: string) => {
    const colors = [
      'bg-red-500',
      'bg-orange-500',
      'bg-amber-500',
      'bg-yellow-500',
      'bg-lime-500',
      'bg-green-500',
      'bg-emerald-500',
      'bg-teal-500',
      'bg-cyan-500',
      'bg-sky-500',
      'bg-blue-500',
      'bg-indigo-500',
      'bg-violet-500',
      'bg-purple-500',
      'bg-fuchsia-500',
      'bg-pink-500',
      'bg-rose-500',
    ];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const showFallback = !src || hasError;

  if (showFallback && name) {
    return (
      <div
        className={`
          flex items-center justify-center rounded-full text-white font-medium
          ${getColorFromName(name)}
          ${textSize}
          ${className}
        `}
        style={{ width: dimension, height: dimension }}
        title={alt}
      >
        {getInitials(name)}
      </div>
    );
  }

  if (showFallback) {
    return (
      <div
        className={`
          flex items-center justify-center rounded-full bg-gray-300 dark:bg-gray-600
          ${className}
        `}
        style={{ width: dimension, height: dimension }}
        title={alt}
      >
        <svg
          className="w-1/2 h-1/2 text-gray-500 dark:text-gray-400"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={dimension}
      height={dimension}
      className={`rounded-full object-cover ${className}`}
      onError={() => setHasError(true)}
    />
  );
}
