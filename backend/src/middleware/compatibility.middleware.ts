import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to provide backward compatibility for legacy clients / collections.
 * - Maps `name` -> `title` when present
 * - Maps `requirement` -> `epicContent` when present
 * - Removes `projectId` when null or the string 'null'
 */
export function legacyBodyMapper(req: Request, _res: Response, next: NextFunction) {
  try {
    const b = (req.body ||= {});

    if (b.name && !b.title) {
      b.title = b.name;
    }

    if (b.requirement && !b.epicContent) {
      b.epicContent = b.requirement;
    }

    // Normalize projectId: treat explicit null or 'null' as absent
    if (Object.prototype.hasOwnProperty.call(b, 'projectId')) {
      if (b.projectId === null || b.projectId === 'null' || b.projectId === '') {
        delete b.projectId;
      }
    }

    req.body = b;
    next();
  } catch (err) {
    // Don't block request on compatibility middleware error, log and continue
     
    console.warn('legacyBodyMapper error:', err);
    next();
  }
}

export default legacyBodyMapper;
