import { Router } from "express";
import { register, login } from "../controllers/auth.controller";
import { body } from "express-validator";
import { validate } from "../middleware/validation.middleware";

const router = Router();

// 注册路由
router.post(
  "/register",
  [
    body("username")
      .isLength({ min: 3, max: 30 })
      .withMessage("用户名长度必须在 3-30 个字符之间"),
    body("email").isEmail().withMessage("请提供有效的邮箱地址"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("密码长度必须至少为 6 个字符"),
  ],
  validate,
  register
);

// 登录路由
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("请提供有效的邮箱地址"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("密码长度必须至少为 6 个字符"),
  ],
  validate,
  login
);

export default router;
