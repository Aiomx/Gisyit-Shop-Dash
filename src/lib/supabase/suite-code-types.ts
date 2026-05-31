/**
 * Suite Code Types for Admin Dashboard
 *
 * Type definitions for SUITE Studio activation code management.
 * These types are used by the admin dashboard for generating,
 * managing, and tracking activation codes.
 *
 * Requirements: 2.1
 */

// ============================================
// Base Types
// ============================================

/**
 * Activation code type
 * - membership: 会员时长激活码
 * - credits: 积分充值激活码
 */
export type CodeType = 'membership' | 'credits';

/**
 * Membership tier for membership codes
 * - plus: Plus 会员
 * - pro: Pro 会员
 * - ultra: Ultra 会员
 */
export type MembershipTier = 'plus' | 'pro' | 'ultra';

/**
 * Activation code status
 * - unused: 未使用
 * - used: 已使用
 * - expired: 已过期
 * - disabled: 已禁用
 */
export type CodeStatus = 'unused' | 'used' | 'expired' | 'disabled';

// ============================================
// Entity Types
// ============================================

/**
 * Suite Code entity
 *
 * Represents an activation code stored in the database.
 * Contains all metadata including activation details.
 *
 * Table: suite_codes
 * Requirements: 2.1, 2.2
 */
export interface SuiteCode {
    id: string;
    /** 激活码字符串，格式: {PREFIX}-{4CHARS}-{4CHARS} */
    code: string;
    /** 激活码类型 */
    code_type: CodeType;
    /** 会员等级，仅会员码有效 */
    membership_tier: MembershipTier | null;
    /** 积分数量，仅积分码有效，最小值 100 */
    credits_amount: number | null;
    /** 会员有效天数 */
    membership_days: number | null;
    /** 激活码状态 */
    status: CodeStatus;
    /** 过期时间 (ISO 8601) */
    expires_at: string;
    /** 创建时间 (ISO 8601) */
    created_at: string;
    /** 激活时间 (ISO 8601) */
    activated_at: string | null;
    /** 激活用户 ID */
    activated_by: string | null;
    /** 激活 IP 地址 */
    activation_ip: string | null;
    /** 激活设备信息 */
    activation_device: string | null;
    /** 批次 ID */
    batch_id: string | null;
    /** 备注 */
    notes: string | null;
}

// ============================================
// Request Types
// ============================================

/**
 * Request to generate activation codes
 *
 * Requirements: 1.2, 1.3, 1.4, 1.5
 */
export interface GenerateCodesRequest {
    /** 激活码类型 */
    code_type: CodeType;
    /** 生成数量 */
    quantity: number;
    /** 过期时间 (ISO 8601) */
    expires_at: string;
    /** 会员等级，会员码必填 */
    membership_tier?: MembershipTier;
    /** 会员有效天数，会员码必填 */
    membership_days?: number;
    /** 积分数量，积分码必填，最小值 100 */
    credits_amount?: number;
    /** 备注 */
    notes?: string;
}

/**
 * Request to activate a code (from client)
 *
 * Requirements: 5.1
 */
export interface ActivateCodeRequest {
    /** 激活码字符串 */
    code: string;
    /** 设备信息 */
    device_info?: string;
}

/**
 * Request to update code status
 *
 * Requirements: 4.1, 4.2
 */
export interface UpdateCodeStatusRequest {
    /** 新状态 */
    status: 'unused' | 'disabled';
}

// ============================================
// Response Types
// ============================================

/**
 * Response for code activation
 *
 * Requirements: 5.3, 5.5
 */
export interface ActivateCodeResponse {
    /** 是否成功 */
    success: boolean;
    /** 消息 */
    message: string;
    /** 激活的权益 */
    benefit?: {
        type: CodeType;
        membership_tier?: MembershipTier;
        membership_days?: number;
        credits_amount?: number;
    };
}

/**
 * Response for code generation
 *
 * Requirements: 1.5, 1.6
 */
export interface GenerateCodesResponse {
    /** 是否成功 */
    success: boolean;
    /** 消息 */
    message: string;
    /** 生成的激活码列表 */
    codes?: SuiteCode[];
    /** 批次 ID */
    batch_id?: string;
    /** 生成数量 */
    count?: number;
}

// ============================================
// Statistics Types
// ============================================

/**
 * Statistics for activation codes
 *
 * Requirements: 6.1, 6.2
 */
export interface CodeStatistics {
    /** 总数 */
    total: number;
    /** 未使用数量 */
    unused: number;
    /** 已使用数量 */
    used: number;
    /** 已过期数量 */
    expired: number;
    /** 已禁用数量 */
    disabled: number;
    /** 按类型分组统计 */
    by_type: {
        membership: {
            plus: number;
            pro: number;
            ultra: number;
        };
        credits: number;
    };
}

// ============================================
// Filter and Query Types
// ============================================

/**
 * Filter options for code list
 *
 * Requirements: 3.4, 3.5
 */
export interface CodeListFilter {
    /** 按类型筛选 */
    code_type?: CodeType;
    /** 按会员等级筛选 */
    membership_tier?: MembershipTier;
    /** 按状态筛选 */
    status?: CodeStatus;
    /** 开始日期 */
    start_date?: string;
    /** 结束日期 */
    end_date?: string;
    /** 搜索关键词 (激活码或用户) */
    search?: string;
    /** 批次 ID */
    batch_id?: string;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
    /** 页码 (从 1 开始) */
    page: number;
    /** 每页数量 */
    page_size: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
    /** 数据列表 */
    data: T[];
    /** 总数 */
    total: number;
    /** 当前页码 */
    page: number;
    /** 每页数量 */
    page_size: number;
    /** 总页数 */
    total_pages: number;
}

// ============================================
// Error Types
// ============================================

/**
 * Error codes for suite code operations
 *
 * Requirements: 5.5
 */
export type SuiteCodeErrorCode =
    | 'CODE_NOT_FOUND'
    | 'CODE_ALREADY_USED'
    | 'CODE_EXPIRED'
    | 'CODE_DISABLED'
    | 'INVALID_FORMAT'
    | 'INVALID_AMOUNT'
    | 'INVALID_TIER'
    | 'INVALID_EXPIRATION'
    | 'GENERATION_FAILED'
    | 'ENABLE_USED_CODE'
    | 'NETWORK_ERROR';

/**
 * Error messages for user-friendly display
 */
export const suiteCodeErrorMessages: Record<SuiteCodeErrorCode, string> = {
    CODE_NOT_FOUND: '激活码不存在',
    CODE_ALREADY_USED: '激活码已被使用',
    CODE_EXPIRED: '激活码已过期',
    CODE_DISABLED: '激活码已被禁用',
    INVALID_FORMAT: '激活码格式无效',
    INVALID_AMOUNT: '积分数量无效，最小值为 100',
    INVALID_TIER: '会员等级无效',
    INVALID_EXPIRATION: '过期时间无效',
    GENERATION_FAILED: '激活码生成失败',
    ENABLE_USED_CODE: '无法启用已使用的激活码',
    NETWORK_ERROR: '网络连接失败，请检查网络后重试',
};

// ============================================
// Code Prefix Constants
// ============================================

/**
 * Code prefix mapping
 *
 * Requirements: 7.1
 */
export const CODE_PREFIXES: Record<string, string> = {
    membership_plus: 'SPLUS',
    membership_pro: 'SPRO',
    membership_ultra: 'SULTRA',
    credits: 'SCRED',
};

/**
 * Reverse prefix mapping for parsing
 */
export const PREFIX_TO_TYPE: Record<string, { type: CodeType; tier?: MembershipTier }> = {
    SPLUS: { type: 'membership', tier: 'plus' },
    SPRO: { type: 'membership', tier: 'pro' },
    SULTRA: { type: 'membership', tier: 'ultra' },
    SCRED: { type: 'credits' },
};

/**
 * Character set for code generation
 *
 * Requirements: 7.2
 */
export const CODE_CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Code format regex pattern
 *
 * Requirements: 7.3, 7.4
 */
export const CODE_FORMAT_PATTERN = /^(SPLUS|SPRO|SULTRA|SCRED)-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
