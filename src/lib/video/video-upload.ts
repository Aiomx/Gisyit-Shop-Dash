/**
 * Video Upload Utilities
 * 
 * Utilities for handling video file uploads with validation
 * Supports MP4, WebM, MOV formats with 500MB size limit
 * 
 * Requirements: 6.2, 3.4
 */

import { validateFileSize, SUPPORTED_VIDEO_MIME_TYPES, formatFileSize } from "@/lib/storage/types";

export interface VideoUploadResult {
    success: boolean;
    error?: string;
    videoUrl?: string;
    fileName?: string;
    fileSize?: number;
    duration?: number;
}

/**
 * Validate video file before upload
 * 
 * @param file - Video file to validate
 * @returns Error message if validation fails, null if valid
 */
export function validateVideoFile(file: File): string | null {
    // Check MIME type
    if (!SUPPORTED_VIDEO_MIME_TYPES.includes(file.type as any)) {
        const supportedFormats = SUPPORTED_VIDEO_MIME_TYPES
            .map(type => type.split('/')[1].toUpperCase())
            .join(', ');
        return `不支持的视频格式。支持的格式：${supportedFormats}`;
    }

    // Check file size
    const sizeError = validateFileSize(file, "video");
    if (sizeError) {
        return sizeError;
    }

    return null;
}

/**
 * Get video duration from file (client-side)
 * 
 * @param file - Video file
 * @returns Promise that resolves to duration in seconds, or null if unable to determine
 */
export function getVideoDuration(file: File): Promise<number | null> {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        const url = URL.createObjectURL(file);

        video.onloadedmetadata = () => {
            URL.revokeObjectURL(url);
            resolve(video.duration || null);
        };

        video.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(null);
        };

        video.src = url;
    });
}

/**
 * Generate video thumbnail from file (client-side)
 * 
 * @param file - Video file
 * @param timeOffset - Time offset in seconds for thumbnail (default: 1)
 * @returns Promise that resolves to thumbnail data URL, or null if unable to generate
 */
export function generateVideoThumbnail(file: File, timeOffset: number = 1): Promise<string | null> {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const url = URL.createObjectURL(file);

        if (!ctx) {
            resolve(null);
            return;
        }

        video.onloadedmetadata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            video.currentTime = Math.min(timeOffset, video.duration);
        };

        video.onseeked = () => {
            try {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                URL.revokeObjectURL(url);
                resolve(thumbnailDataUrl);
            } catch (error) {
                console.error('Error generating thumbnail:', error);
                URL.revokeObjectURL(url);
                resolve(null);
            }
        };

        video.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(null);
        };

        video.src = url;
    });
}

/**
 * Get video file information
 * 
 * @param file - Video file
 * @returns Promise that resolves to video information
 */
export async function getVideoFileInfo(file: File): Promise<{
    name: string;
    size: number;
    sizeFormatted: string;
    type: string;
    duration?: number;
    thumbnail?: string;
}> {
    const [duration, thumbnail] = await Promise.all([
        getVideoDuration(file),
        generateVideoThumbnail(file)
    ]);

    return {
        name: file.name,
        size: file.size,
        sizeFormatted: formatFileSize(file.size),
        type: file.type,
        duration: duration || undefined,
        thumbnail: thumbnail || undefined
    };
}

/**
 * Check if file is a supported video format
 * 
 * @param file - File to check
 * @returns true if file is a supported video format
 */
export function isSupportedVideoFile(file: File): boolean {
    return SUPPORTED_VIDEO_MIME_TYPES.includes(file.type as any);
}

/**
 * Get human-readable video format name
 * 
 * @param mimeType - Video MIME type
 * @returns Human-readable format name
 */
export function getVideoFormatName(mimeType: string): string {
    switch (mimeType) {
        case 'video/mp4':
            return 'MP4';
        case 'video/webm':
            return 'WebM';
        case 'video/quicktime':
            return 'MOV';
        default:
            return mimeType.split('/')[1]?.toUpperCase() || 'Unknown';
    }
}