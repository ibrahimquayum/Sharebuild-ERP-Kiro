import { prisma } from '@/lib/prisma';
import type { AuditAction } from '@prisma/client';

function toAuditJson(value: unknown) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

export async function safeAuditLog(data: {
  userId?: string | null;
  projectId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  oldValues?: unknown;
  newValues?: unknown;
  context?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: data.userId ?? undefined,
        projectId: data.projectId ?? undefined,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId ?? undefined,
        oldValues: toAuditJson(data.oldValues),
        newValues: toAuditJson(data.newValues),
      },
    });
  } catch (error) {
    console.error(`[audit] Failed to write audit log${data.context ? ` for ${data.context}` : ''}`, error);
  }
}
