/**
 * 组件类型定义
 */
export interface Component {
  /** 组件ID */
  id: string;

  /** 组件名称 */
  name: string;

  /** 组件描述 */
  description: string;

  /** 组件分类 */
  category: string;

  /** 组件标签 */
  tags: string[];

  /** 组件代码 */
  code: string;

  /** 是否已收藏 */
  isFavorite?: boolean;
}

/**
 * 组件过滤条件
 */
export interface ComponentFilters {
  /** 搜索关键词 */
  searchTerm?: string;

  /** 分类 */
  category?: string;

  /** 排序方式 */
  sort?: string;

  /** 是否只显示收藏 */
  favorites?: boolean;
}

/**
 * 用户信息
 */
export interface User {
  /** 用户ID */
  id: string;

  /** 用户名 */
  username: string;

  /** 邮箱 */
  email: string;
}
