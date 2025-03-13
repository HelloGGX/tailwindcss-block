import { Router } from "express";
import {
  getComponents,
  getComponent,
  createComponent,
  toggleFavorite,
} from "../controllers/component.controller";
import {
  authMiddleware,
  optionalAuthMiddleware,
} from "../middleware/auth.middleware";
import { body } from "express-validator";

const router = Router();

// 获取组件列表（可选身份验证）
router.get("/", optionalAuthMiddleware, getComponents);

// 获取单个组件（可选身份验证）
router.get("/:id", optionalAuthMiddleware, getComponent);

// 创建组件（需要身份验证）
router.post(
  "/",
  authMiddleware,
  [
    body("name")
      .isLength({ min: 3, max: 100 })
      .withMessage("组件名称长度必须在 3-100 个字符之间"),
    body("description")
      .isLength({ min: 10, max: 500 })
      .withMessage("组件描述长度必须在 10-500 个字符之间"),
    body("category")
      .isIn(["buttons", "cards", "forms", "navigation", "other"])
      .withMessage("无效的组件分类"),
    body("code").notEmpty().withMessage("组件代码不能为空"),
  ],
  createComponent
);

// 收藏/取消收藏组件（需要身份验证）
router.post("/:id/favorite", authMiddleware, toggleFavorite);

export default router;
