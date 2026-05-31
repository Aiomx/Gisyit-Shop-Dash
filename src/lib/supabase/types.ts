/**
 * Database Types for Store Management
 */

export type ProductType = "app" | "game_card" | "game_cdk" | "game_digital" | "physical" | "overseas";
export type DeliveryType = "download" | "license_key" | "cdk" | "shipment" | "manual";
export type StoreSection = "apps" | "games" | "store" | "overseas" | "ai" | string;

/**
 * Store Section entity (大板块)
 * 
 * Represents a major section of the store like "应用软件", "游戏", "人工智能" etc.
 * Sections can be dynamically created and managed through the admin dashboard.
 * 
 * Table: store_sections
 */
export interface StoreSection_Entity {
    id: string;
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    color?: string;
    sort_order: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}
/**
 * Order status values
 * 
 * - pending: Newly created, awaiting payment (15-minute window)
 * - created: Legacy status (deprecated, use pending)
 * - pending_payment: Legacy status (deprecated, use pending)
 * - paid: Payment successful
 * - cancelled: Expired or manually cancelled
 * - fulfilled: Order fulfilled (digital delivery or shipped)
 * - completed: Order completed
 */
export type OrderStatus =
    | "pending"           // NEW: Initial state for pending orders
    | "created"           // Legacy
    | "pending_payment"   // Legacy
    | "paid"
    | "fulfilled"
    | "completed"
    | "cancelled";

export interface ProductCategory {
    id: string;
    name: string;
    slug: string;
    parent_id?: string;
    store_section: StoreSection;
    section_id?: string;
    sort_order: number;
    created_at: string;
    // Relations
    section?: StoreSection_Entity;
}

export interface Product {
    id: string;
    product_code: string;
    name: string;
    /** URL-friendly slug for product detail page */
    slug?: string;
    subtitle?: string;
    description?: string;
    product_type: ProductType;
    delivery_type: DeliveryType;
    category_id?: string;
    is_active: boolean;
    has_discount: boolean;
    has_demo_video: boolean;
    inventory_count?: number;
    /** Whether this product is free (no payment required) */
    is_free?: boolean;
    /** Whether login is required to download free products */
    require_login?: boolean;
    /** Whether this product has been verified (safe, virus-free, open-source) */
    is_verified?: boolean;
    /** Markdown formatted detailed product description */
    detail_content?: string;
    created_at: string;
    updated_at: string;
    // Relations
    images?: ProductImage[];
    prices?: ProductPrice[];
    category?: ProductCategory;
}

export interface ProductImage {
    id: string;
    product_id: string;
    image_url: string;
    alt_text?: string;
    is_primary: boolean;
    sort_order: number;
    created_at: string;
}

export interface ProductPrice {
    id: string;
    product_id: string;
    spec_combination?: Record<string, string>;
    price_amount: number;
    currency: string;
    is_active: boolean;
    created_at: string;
}

/**
 * Product file entity for downloadable content
 *
 * Represents a downloadable file associated with an app product.
 * Files are stored in Supabase Storage with metadata in the database.
 *
 * Table: product_files
 * Requirements: 1.3, 6.2
 */
export interface ProductFile {
    id: string;
    product_id: string;
    filename: string;           // Storage filename (may include unique suffix)
    original_filename: string;  // Original filename (used for download)
    file_size: number;          // File size in bytes
    mime_type: string;          // MIME type (e.g., 'application/zip')
    storage_path: string;       // Supabase Storage path
    uploaded_at: string;        // ISO timestamp
    updated_at: string;         // ISO timestamp
}

/**
 * Product video entity for video demonstrations
 *
 * Represents a video associated with a product for demonstration purposes.
 * Supports both external video URLs and local video uploads.
 *
 * Table: product_videos
 * Requirements: 3.3, 6.1, 6.2
 */
export interface ProductVideo {
    id: string;
    product_id: string;
    video_url: string;
    video_type: 'demo' | 'tutorial' | 'review';
    source_type: 'local' | 'youtube' | 'bilibili' | 'external';
    thumbnail_url?: string;
    title?: string;
    duration?: number;
    sort_order: number;
    created_at: string;
}

/**
 * Order entity
 * 
 * Represents a customer order with payment tracking.
 * Supports both authenticated users (user_id) and guest checkout (anonymous_session_id).
 * 
 * Table: orders
 * Requirements: 2.2, 2.3, 2.4, 2.5, 3.1, 5.3
 */
export interface Order {
    id: string;
    order_number: string;
    /** User ID for authenticated users. Null for guest checkout. */
    user_id?: string;
    /** Session ID for guest checkout. Used when user_id is null. */
    anonymous_session_id?: string;
    cart_id?: string;
    status: OrderStatus;
    total_amount: number;
    currency: string;
    stripe_session_id?: string;
    stripe_payment_intent_id?: string;
    created_at: string;
    /** Payment deadline. Order auto-cancels if not paid by this time. Set to created_at + 15 minutes. */
    expires_at?: string;
    /** Timestamp when payment was successfully completed via Stripe webhook. */
    payment_completed_at?: string;
    updated_at: string;
    // Relations
    items?: OrderItem[];
    user?: UserProfile;
}

export interface OrderItem {
    id: string;
    order_id: string;
    product_id: string;
    product_code: string;
    product_name: string;
    spec_combination?: Record<string, string>;
    quantity: number;
    price: number;
    currency: string;
    created_at: string;
}

export interface UserProfile {
    id: string;
    email?: string;
    nickname?: string;
    custom_id?: string;
    phone?: string;
    avatar_url?: string;
    created_at: string;
    updated_at: string;
}

// Stats types
export interface DashboardStats {
    totalProducts: number;
    activeProducts: number;
    totalOrders: number;
    totalRevenue: number;
    totalUsers: number;
    recentOrders: Order[];
    ordersByStatus: Record<OrderStatus, number>;
    revenueByDay: { date: string; revenue: number }[];
}

// ============================================
// Brand Types
// Requirements: 1.1, 7.4
// ============================================

/**
 * Brand group classification
 * 
 * - os: Operating systems (Mac, Windows, Linux)
 * - platform: Platforms (Steam, Epic, etc.)
 * - store: Stores (App Store, Google Play, etc.)
 * - other: Other classifications
 */
export type BrandGroup = "os" | "platform" | "store" | "other";

/**
 * Brand entity
 * 
 * Represents a platform or brand classification for products.
 * Examples: Mac, Windows, Linux, Steam, etc.
 * 
 * Table: brands
 * Requirements: 1.1
 */
export interface Brand {
    id: string;
    name: string;
    slug: string;
    logo_url?: string;
    brand_group: BrandGroup;
    sort_order: number;
    is_active: boolean;
    description?: string;
    created_at: string;
    updated_at: string;
}

/**
 * Brand with product count for admin display
 * Requirements: 1.8, 7.4
 */
export interface BrandWithCount extends Brand {
    product_count: number;
}

/**
 * Product-Brand association
 * Requirements: 2.1
 */
export interface ProductBrand {
    id: string;
    product_id: string;
    brand_id: string;
    created_at: string;
}

/**
 * Input for creating a brand
 * Requirements: 1.1, 1.2
 */
export interface CreateBrandInput {
    name: string;
    slug?: string;  // Auto-generated if not provided
    logo_url?: string;
    brand_group: BrandGroup;
    sort_order?: number;
    is_active?: boolean;
    description?: string;
}

/**
 * Input for updating a brand
 * Requirements: 1.1
 */
export interface UpdateBrandInput {
    name?: string;
    slug?: string;
    logo_url?: string;
    brand_group?: BrandGroup;
    sort_order?: number;
    is_active?: boolean;
    description?: string;
}

/**
 * Brand error codes for validation and API responses
 * Requirements: 7.1, 7.2, 7.3
 */
export type BrandErrorCode =
    | "BRAND_NOT_FOUND"
    | "BRAND_SLUG_EXISTS"
    | "BRAND_HAS_PRODUCTS"
    | "INVALID_FILE_TYPE"
    | "FILE_TOO_LARGE"
    | "INVALID_BRAND_NAME"
    | "INVALID_SLUG_FORMAT"
    | "AI_SERVICE_ERROR"
    | "NETWORK_ERROR";

/**
 * Brand error messages for user-friendly display
 */
export const brandErrorMessages: Record<BrandErrorCode, string> = {
    BRAND_NOT_FOUND: "品牌不存在",
    BRAND_SLUG_EXISTS: "品牌标识已存在，请使用其他标识",
    BRAND_HAS_PRODUCTS: "该品牌下有关联商品，无法删除",
    INVALID_FILE_TYPE: "仅支持 SVG 和 PNG 格式的图片",
    FILE_TOO_LARGE: "文件大小不能超过 2MB",
    INVALID_BRAND_NAME: "品牌名称长度必须在 1-100 字符之间",
    INVALID_SLUG_FORMAT: "品牌标识只能包含小写字母、数字和连字符",
    AI_SERVICE_ERROR: "AI 服务暂时不可用，请稍后重试",
    NETWORK_ERROR: "网络连接失败，请检查网络后重试",
};
