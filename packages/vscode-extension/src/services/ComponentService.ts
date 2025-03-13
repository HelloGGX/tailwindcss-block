import axios from "axios";
import { AuthService } from "./AuthService";

export interface Component {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  code: string;
  author: {
    id: string;
    username: string;
  };
  createdAt: string;
  isFavorite: boolean;
}

export interface ComponentFilters {
  searchTerm?: string;
  category?: string;
  sort?: string;
  favorites?: boolean;
}

export class ComponentService {
  private static readonly API_URL = "https://api.tailwindcss-block.com"; // 替换为实际的 API 地址

  constructor(private readonly authService: AuthService) {}

  public async getComponents(
    filters: ComponentFilters = {}
  ): Promise<Component[]> {
    try {
      const queryParams = new URLSearchParams();

      if (filters.searchTerm) {
        queryParams.append("search", filters.searchTerm);
      }

      if (filters.category) {
        queryParams.append("category", filters.category);
      }

      if (filters.sort) {
        queryParams.append("sort", filters.sort);
      }

      if (filters.favorites) {
        queryParams.append("favorites", "true");
      }

      const url = `${
        ComponentService.API_URL
      }/components?${queryParams.toString()}`;

      const response = await axios.get(url, {
        headers: this.authService.getAuthHeader(),
      });

      return response.data;
    } catch (error) {
      console.error("Get components error:", error);
      throw new Error("获取组件列表失败");
    }
  }

  public async getComponent(id: string): Promise<Component> {
    try {
      const response = await axios.get(
        `${ComponentService.API_URL}/components/${id}`,
        {
          headers: this.authService.getAuthHeader(),
        }
      );

      return response.data;
    } catch (error) {
      console.error("Get component error:", error);
      throw new Error("获取组件详情失败");
    }
  }

  public async createComponent(
    component: Omit<Component, "id" | "author" | "createdAt" | "isFavorite">
  ): Promise<Component> {
    try {
      const response = await axios.post(
        `${ComponentService.API_URL}/components`,
        component,
        {
          headers: this.authService.getAuthHeader(),
        }
      );

      return response.data;
    } catch (error) {
      console.error("Create component error:", error);
      throw new Error((error as any).response?.data?.message || "创建组件失败");
    }
  }

  public async toggleFavorite(componentId: string): Promise<void> {
    try {
      await axios.post(
        `${ComponentService.API_URL}/components/${componentId}/favorite`,
        {},
        {
          headers: this.authService.getAuthHeader(),
        }
      );
    } catch (error) {
      console.error("Toggle favorite error:", error);
      throw new Error("收藏操作失败");
    }
  }
}
