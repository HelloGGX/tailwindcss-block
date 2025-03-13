import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.model";

// 注册新用户
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { username, email, password } = req.body;

    // 检查用户是否已存在
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: "用户名或邮箱已被使用" });
    }

    // 创建新用户
    const user = new User({
      username,
      email,
      password,
    });

    await user.save();

    res.status(201).json({ message: "注册成功" });
  } catch (error) {
    next(error);
  }
};

// 用户登录
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email, password } = req.body;

    // 查找用户
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "邮箱或密码不正确" });
    }

    // 验证密码
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "邮箱或密码不正确" });
    }

    // 生成 JWT
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || "your_jwt_secret",
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
};
