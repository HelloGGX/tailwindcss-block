import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.routes";
import componentRoutes from "./routes/component.routes";
import userRoutes from "./routes/user.routes";

// 加载环境变量
dotenv.config();

// 创建 Express 应用
const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// 路由
app.use("/api/auth", authRoutes);
app.use("/api/components", componentRoutes);
app.use("/api/users", userRoutes);

// 错误处理中间件
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error(err.stack);
    res.status(err.statusCode || 500).json({
      message: err.message || "服务器内部错误",
    });
  }
);

// 连接数据库
const connectDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/tailwindcss-block"
    );
    console.log("MongoDB 连接成功");
  } catch (error) {
    console.error("MongoDB 连接失败:", error);
    process.exit(1);
  }
};

connectDB();

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});
