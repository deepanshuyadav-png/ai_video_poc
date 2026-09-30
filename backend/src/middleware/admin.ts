import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import UserModel from '../models/user';

const adminMiddleware = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const user = await UserModel.findById(req.userId);
    
    if (!user || user.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Admin access required' });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({ success: false, error: 'Authorization failed' });
  }
};

export default adminMiddleware;
