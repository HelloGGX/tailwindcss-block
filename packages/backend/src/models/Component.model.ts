import mongoose from "mongoose";

export interface IComponent extends mongoose.Document {
  name: string;
  description: string;
  category: string;
  tags: string[];
  code: string;
  author: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const componentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 500,
    },
    category: {
      type: String,
      required: true,
      enum: ["buttons", "cards", "forms", "navigation", "other"],
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    code: {
      type: String,
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// 创建索引以支持搜索
componentSchema.index({ name: "text", description: "text", tags: "text" });

export default mongoose.model<IComponent>("Component", componentSchema);
