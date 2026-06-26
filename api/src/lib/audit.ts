import { query } from './db.js';

export interface AuditLogInput {
  action: string;
  category: 'auth' | 'user' | 'task' | 'organization' | 'system' | 'report';
  actorId?: string;
  actorName?: string | null;
  actorRole?: string;
  targetType?: string;
  targetId?: string;
  targetName?: string | null;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  success?: boolean;
  errorMessage?: string;
}

/**
 * 写入审计日志。
 * 采用 fire-and-forget + 错误抑制，避免影响主业务流程。
 */
export async function auditLog(input: AuditLogInput): Promise<void> {
  try {
    await query(
      `INSERT INTO audit_logs
       (action, category, actor_id, actor_name, actor_role, target_type, target_id, target_name, details, ip_address, user_agent, success, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        input.action,
        input.category,
        input.actorId || null,
        input.actorName || null,
        input.actorRole || null,
        input.targetType || null,
        input.targetId || null,
        input.targetName || null,
        input.details ? JSON.stringify(input.details) : null,
        input.ipAddress || null,
        input.userAgent || null,
        input.success ?? true,
        input.errorMessage || null,
      ]
    );
  } catch {
    // 审计日志失败不应阻断主流程
  }
}
