import { Request, Response, NextFunction } from 'express';
import User from '../models/User.model';

// 获取当前用户信息
export const getCurrentUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
};

// 更新用户信息
export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const { username, email } = req.body;

    // 检查用户名和邮箱是否已被使用
    const existingUser = await User.findOne({
      $and: [
        { _id: { $ne: userId } },
        { $or: [{ username }, { email }] }
      ]
    });

    if (existingUser) {
      return res.status(400).json({ message: '用户名或邮箱已被使用' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { username, email },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
};