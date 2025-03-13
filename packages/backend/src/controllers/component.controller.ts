import { Request, Response, NextFunction } from 'express';
import Component from '../models/Component.model';
import User from '../models/User.model';
import mongoose from 'mongoose';

// 获取组件列表
export const getComponents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { search, category, sort, favorites } = req.query;
    const userId = req.user?.id;

    let query: any = {};

    // 搜索
    if (search) {
      query.$text = { $search: search as string };
    }

    // 分类过滤
    if (category) {
      query.category = category;
    }

    // 收藏过滤
    if (favorites === 'true' && userId) {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: '用户不存在' });
      }
      query._id = { $in: user.favorites };
    }

    // 排序
    let sortOption: any = { createdAt: -1 }; // 默认按创建时间降序
    if (sort === 'popular') {
      // 这里可以添加一个受欢迎度字段，如点赞数或收藏数
      // 暂时仍按创建时间排序
    } else if (sort === 'name') {
      sortOption = { name: 1 };
    }

    // 查询组件
    const components = await Component.find(query)
      .sort(sortOption)
      .populate('author', 'username')
      .lean();

    // 如果用户已登录，标记收藏状态
    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        const favorites = user.favorites.map(id => id.toString());
        components.forEach(component => {
          (component as any).isFavorite = favorites.includes(component._id.toString());
        });
      }
    }

    res.json(components);
  } catch (error) {
    next(error);
  }
};

// 获取单个组件
export const getComponent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const component = await Component.findById(id).populate('author', 'username').lean();

    if (!component) {
      return res.status(404).json({ message: '组件不存在' });
    }

    // 如果用户已登录，标记收藏状态
    if (userId) {
      const user = await User.findById(userId);
      if (user) {
        (component as any).isFavorite = user.favorites.some(
          favId => favId.toString() === id
        );
      }
    }

    res.json(component);
  } catch (error) {
    next(error);
  }
};

// 创建组件
export const createComponent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, description, category, tags, code } = req.body;
    const userId = req.user?.id;

    const component = new Component({
      name,
      description,
      category,
      tags,
      code,
      author: userId
    });

    await component.save();

    res.status(201).json(component);
  } catch (error) {
    next(error);
  }
};

// 收藏/取消收藏组件
export const toggleFavorite = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // 检查组件是否存在
    const component = await Component.findById(id);
    if (!component) {
      return res.status(404).json({ message: '组件不存在' });
    }

    // 查找用户
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 检查是否已收藏
    const index = user.favorites.findIndex(
      favId => favId.toString() === id
    );

    if (index === -1) {
      // 添加收藏
      user.favorites.push(new mongoose.Types.ObjectId(id));
    } else {
      // 取消收藏
      user.favorites.splice(index, 1);
    }

    await user.save();

    res.json({ isFavorite: index === -1 });
  } catch (error) {
    next(error);
  }
};