import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

// 扩展 Request 类型以包含用户信息
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
      };
    }
  }
}

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // 获取请求头中的 token
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "未提供认证令牌" });
  }

  try {
    // 验证 token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your_jwt_secret"
    ) as { id: string };

    // 将用户 ID 添加到请求对象
    req.user = { id: decoded.id };
    next();
  } catch (error) {
    return res.status(401).json({ message: "无效的认证令牌" });
  }
};

// 可选的身份验证中间件，不强制要求登录
export const optionalAuthMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // 获取请求头中的 token
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return next();
  }

  try {
    // 验证 token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your_jwt_secret"
    ) as { id: string };

    // 将用户 ID 添加到请求对象
    req.user = { id: decoded.id };
    next();
  } catch (error) {
    // 令牌无效，但不阻止请求
    next();
  }
};
