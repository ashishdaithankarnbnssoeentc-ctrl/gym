import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        tenantId: string;
        email: string;
        role: string;
        id?: string;
      };
      tenant?: {
        id: string;
        role: 'admin' | 'user';
      };
    }
  }
}

export interface AuthRequest extends Request {
  user: {
    uid: string;
    tenantId: string;
    email: string;
    role: string;
    id?: string;
  };
  tenant?: {
    id: string;
    role: 'admin' | 'user';
  };
}
