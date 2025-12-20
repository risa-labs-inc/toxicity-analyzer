import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.middleware';
import { getDb } from '../db/connection';

/**
 * HIPAA audit logging middleware
 *
 * Automatically logs all access to protected health information (PHI)
 * for HIPAA compliance. Logs include:
 * - Who accessed the data (user ID)
 * - What data was accessed (patient ID, resource)
 * - When it was accessed (timestamp)
 * - Where from (IP address)
 * - What action was performed (read, write, update, delete)
 *
 * Audit logs are retained for 7 years per HIPAA requirements.
 */

export interface AuditLogEntry {
  eventType: string;
  userId: string;
  patientId?: string;
  action: 'create' | 'read' | 'update' | 'delete';
  resourceType: string;
  resourceId?: string;
  ipAddress: string;
  userAgent?: string;
  statusCode?: number;
  errorMessage?: string;
}

/**
 * Log audit event to database
 *
 * @param entry - Audit log entry
 */
async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    const db = getDb();
    await db('audit_logs').insert({
      event_type: entry.eventType,
      user_id: entry.userId,
      patient_id: entry.patientId,
      action: entry.action,
      ip_address: entry.ipAddress,
      timestamp: new Date(),
    });
  } catch (error) {
    // Critical: Audit logging failure should be logged but not block request
    console.error('AUDIT LOG FAILURE:', error);
    console.error('Failed audit entry:', entry);
  }
}

/**
 * Determine action type from HTTP method
 */
function getActionFromMethod(method: string): AuditLogEntry['action'] {
  switch (method.toUpperCase()) {
    case 'GET':
    case 'HEAD':
      return 'read';
    case 'POST':
      return 'create';
    case 'PUT':
    case 'PATCH':
      return 'update';
    case 'DELETE':
      return 'delete';
    default:
      return 'read';
  }
}

/**
 * Extract resource information from request path
 */
function extractResourceInfo(path: string): {
  resourceType: string;
  resourceId?: string;
} {
  // Parse paths like /api/v1/patients/:id/questionnaires/:qid
  const segments = path.split('/').filter(Boolean);

  if (segments.length < 3) {
    return { resourceType: 'unknown' };
  }

  // segments[0] = 'api', segments[1] = 'v1', segments[2] = resource type
  const resourceType = segments[2];
  const resourceId = segments[3] && !segments[3].includes(':') ? segments[3] : undefined;

  return { resourceType, resourceId };
}

/**
 * HIPAA audit logging middleware
 *
 * Logs all requests that access PHI.
 */
export function auditLog(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const startTime = Date.now();

  // Capture response completion
  const originalSend = res.send;
  res.send = function (data: any): Response {
    // Log audit event on response
    const duration = Date.now() - startTime;
    const { resourceType, resourceId } = extractResourceInfo(req.path);

    const auditEntry: AuditLogEntry = {
      eventType: `${req.method} ${resourceType}`,
      userId: req.user?.userId || 'anonymous',
      patientId: req.params.patientId || req.params.id || req.user?.patientId,
      action: getActionFromMethod(req.method),
      resourceType,
      resourceId,
      ipAddress: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'],
      statusCode: res.statusCode,
    };

    // Log asynchronously (don't block response)
    logAuditEvent(auditEntry).catch((err) => {
      console.error('Failed to log audit event:', err);
    });

    // Add audit trail header to response
    res.setHeader('X-Audit-Logged', 'true');
    res.setHeader('X-Response-Time', `${duration}ms`);

    return originalSend.call(this, data);
  };

  next();
}

/**
 * Log PHI access event
 *
 * Manually log specific PHI access events when automatic logging isn't sufficient.
 *
 * @param req - Request object
 * @param patientId - Patient whose data was accessed
 * @param resourceType - Type of resource accessed
 * @param action - Action performed
 */
export async function logPhiAccess(
  req: AuthenticatedRequest,
  patientId: string,
  resourceType: string,
  action: AuditLogEntry['action']
): Promise<void> {
  const entry: AuditLogEntry = {
    eventType: `MANUAL_${resourceType}_${action}`,
    userId: req.user?.userId || 'system',
    patientId,
    action,
    resourceType,
    ipAddress: req.ip || 'unknown',
    userAgent: req.headers['user-agent'],
  };

  await logAuditEvent(entry);
}

/**
 * Retrieve audit logs for a patient
 *
 * For patient access requests (HIPAA right of access).
 *
 * @param patientId - Patient ID
 * @param limit - Maximum number of logs to return
 * @returns Array of audit log entries
 */
export async function getPatientAuditLogs(
  patientId: string,
  limit: number = 100
): Promise<any[]> {
  const db = getDb();

  const logs = await db('audit_logs')
    .where('patient_id', patientId)
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .select('*');

  return logs;
}

/**
 * Retrieve audit logs for a user
 *
 * For internal auditing and security monitoring.
 *
 * @param userId - User ID
 * @param limit - Maximum number of logs to return
 * @returns Array of audit log entries
 */
export async function getUserAuditLogs(
  userId: string,
  limit: number = 100
): Promise<any[]> {
  const db = getDb();

  const logs = await db('audit_logs')
    .where('user_id', userId)
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .select('*');

  return logs;
}
