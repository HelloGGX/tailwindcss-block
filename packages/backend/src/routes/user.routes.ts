import { Router } from "express";
import { getCurrentUser, updateUser } from "../controllers/user.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { body } from "express-validator";

const router = Router();

// 获取当前用户信息
router.get("/me", authMiddleware, getCurrentUser);

// 更新用户信息
router.put(
  "/me",
  authMiddleware,
  [
    body("username")
      .optional()
      .isLength({ min: 3, max: 30 })
      .withMessage("用户名长度必须在 3-30 个字符之间"),
    body("email").optional().isEmail().withMessage("请提供有效的邮箱地址"),
  ],
  updateUser
);

export default router;
