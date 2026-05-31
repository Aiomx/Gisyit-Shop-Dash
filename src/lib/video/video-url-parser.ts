/**
 * Video URL Parser
 * 
 * Utilities for parsing and extracting information from video URLs
 * Supports YouTube, Bilibili, and other external video sources
 * 
 * Requirements: 6.1
 */

export interface VideoInfo {
    source_type: 'youtube' | 'bilibili' | 'external';
    video_id?: string;
    thumbnail_url?: string;
    title?: string;
    duration?: number;
    embed_url?: string;
}

/**
 * Parse YouTube URL and extract video information
 * 
 * Supports various YouTube URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * 
 * @param url - YouTube URL
 * @returns VideoInfo object or null if not a valid YouTube URL
 */
export function parseYouTubeUrl(url: string): VideoInfo | null {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            const videoId = match[1];
            return {
                source_type: 'youtube',
                video_id: videoId,
                thumbnail_url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                embed_url: `https://www.youtube.com/embed/${videoId}`
            };
        }
    }

    return null;
}

/**
 * Parse Bilibili URL and extract video information
 * 
 * Supports various Bilibili URL formats:
 * - https://www.bilibili.com/video/BV1234567890
 * - https://bilibili.com/video/av12345678
 * - https://b23.tv/shortlink
 * 
 * @param url - Bilibili URL
 * @returns VideoInfo object or null if not a valid Bilibili URL
 */
export function parseBilibiliUrl(url: string): VideoInfo | null {
    const patterns = [
        /bilibili\.com\/video\/(BV[a-zA-Z0-9]+)/,
        /bilibili\.com\/video\/av(\d+)/,
        /b23\.tv\/([a-zA-Z0-9]+)/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            const videoId = match[1];
            return {
                source_type: 'bilibili',
                video_id: videoId,
                // Bilibili thumbnails require API access, so we'll use a placeholder
                thumbnail_url: undefined,
                embed_url: `https://player.bilibili.com/player.html?bvid=${videoId.startsWith('BV') ? videoId : `av${videoId}`}`
            };
        }
    }

    return null;
}

/**
 * Parse video URL and determine source type and extract information
 * 
 * @param url - Video URL to parse
 * @returns VideoInfo object with parsed information
 */
export function parseVideoUrl(url: string): VideoInfo {
    if (!url || typeof url !== 'string') {
        return { source_type: 'external' };
    }

    const normalizedUrl = url.trim().toLowerCase();

    // Try YouTube parsing
    if (normalizedUrl.includes('youtube.com') || normalizedUrl.includes('youtu.be')) {
        const youtubeInfo = parseYouTubeUrl(url);
        if (youtubeInfo) {
            return youtubeInfo;
        }
    }

    // Try Bilibili parsing
    if (normalizedUrl.includes('bilibili.com') || normalizedUrl.includes('b23.tv')) {
        const bilibiliInfo = parseBilibiliUrl(url);
        if (bilibiliInfo) {
            return bilibiliInfo;
        }
    }

    // Default to external video
    return {
        source_type: 'external'
    };
}

/**
 * Validate if a URL is a valid video URL
 * 
 * @param url - URL to validate
 * @returns true if the URL appears to be a valid video URL
 */
export function isValidVideoUrl(url: string): boolean {
    if (!url || typeof url !== 'string') {
        return false;
    }

    try {
        const parsedUrl = new URL(url);

        // Check for common video domains
        const videoDomains = [
            'youtube.com',
            'youtu.be',
            'bilibili.com',
            'b23.tv',
            'vimeo.com',
            'dailymotion.com',
            'twitch.tv'
        ];

        const hostname = parsedUrl.hostname.toLowerCase();
        return videoDomains.some(domain =>
            hostname === domain || hostname.endsWith(`.${domain}`)
        );
    } catch {
        return false;
    }
}

/**
 * Get video thumbnail URL if available
 * 
 * @param videoInfo - Parsed video information
 * @returns Thumbnail URL or null if not available
 */
export function getVideoThumbnail(videoInfo: VideoInfo): string | null {
    return videoInfo.thumbnail_url || null;
}

/**
 * Get embeddable video URL if available
 * 
 * @param videoInfo - Parsed video information
 * @returns Embeddable URL or original URL
 */
export function getEmbedUrl(videoInfo: VideoInfo, originalUrl: string): string {
    return videoInfo.embed_url || originalUrl;
}