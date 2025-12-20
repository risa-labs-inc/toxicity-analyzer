import { Request, Response, NextFunction } from 'express';
import { getDb } from '../db/connection';

/**
 * Extended Express Request with user information
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    patientId?: string;
    role: 'patient' | 'clinician' | 'admin';
  };
}

/**
 * Demo authentication middleware
 *
 * For MVP demo version with 15 hardcoded patient logins (P001-P015).
 * In production, this would validate Firebase Auth tokens.
 *
 * Expects:
 * - Authorization header with format: "Demo P001" or "Clinician CLIN001"
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Next middleware function
 */
export async function authenticateDemo(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'No authorization header provided',
      });
      return;
    }

    const [scheme, credential] = authHeader.split(' ');

    // Demo patient authentication
    if (scheme === 'Demo' && credential) {
      // Validate patient ID format (P001-P015)
      if (!/^P\d{3}$/.test(credential)) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid patient ID format',
        });
        return;
      }

      // Look up patient in database
      const db = getDb();
      const patient = await db('patients')
        .where('firebase_uid', credential)
        .first();

      if (!patient) {
        res.status(401).json({
          error: 'Unauthorized',
          message: 'Patient not found',
        });
        return;
      }

      // Attach user info to request
      req.user = {
        userId: credential,
        patientId: patient.patient_id,
        role: 'patient',
      };

      next();
      return;
    }

    // Demo clinician authentication
    if (scheme === 'Clinician' && credential) {
      // Simple clinician auth for demo
      req.user = {
        userId: credential,
        role: 'clinician',
      };

      next();
      return;
    }

    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid authorization scheme',
    });
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed',
    });
  }
}

/**
 * Require patient role
 *
 * Middleware to ensure authenticated user is a patient.
 */
export function requirePatient(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
    return;
  }

  if (req.user.role !== 'patient') {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Patient access required',
    });
    return;
  }

  next();
}

/**
 * Require clinician role
 *
 * Middleware to ensure authenticated user is a clinician.
 */
export function requireClinician(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
    return;
  }

  if (req.user.role !== 'clinician' && req.user.role !== 'admin') {
    res.status(403).json({
      error: 'Forbidden',
      message: 'Clinician access required',
    });
    return;
  }

  next();
}

/**
 * Validate patient access
 *
 * Ensures patient can only access their own data.
 * Clinicians can access any patient data.
 */
export function validatePatientAccess(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const requestedPatientId = req.params.patientId || req.params.id;

  if (!req.user) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required',
    });
    return;
  }

  // Clinicians can access any patient
  if (req.user.role === 'clinician' || req.user.role === 'admin') {
    next();
    return;
  }

  // Patients can only access their own data
  if (req.user.role === 'patient') {
    if (req.user.patientId !== requestedPatientId) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Cannot access other patient data',
      });
      return;
    }
  }

  next();
}
