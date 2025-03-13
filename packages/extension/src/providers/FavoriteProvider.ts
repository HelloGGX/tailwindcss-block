import * as vscode from "vscode";
import { ComponentService } from "../services/ComponentService";
import { AuthService } from "../services/AuthService";
import { Component } from "../types";
import { ComponentItem } from "./ComponentProvider";

/**
 * 收藏组件树视图提供者
 * 负责在 VSCode 侧边栏中展示收藏的组件列表
 */
export class FavoriteProvider
  implements vscode.TreeDataProvider<ComponentItem | vscode.TreeItem>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<
    ComponentItem | vscode.TreeItem | null
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private _favorites: Component[] = [];

  constructor(
    private readonly componentService: ComponentService,
    private readonly authService: AuthService
  ) {
    this.refresh();
  }

  /**
   * 刷新收藏列表
   */
  refresh(): void {
    this._onDidChangeTreeData.fire(null);
  }

  /**
   * 获取树项
   * @param element 组件树项
   */
  getTreeItem(element: ComponentItem | vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  /**
   * 获取子项
   * @param element 父组件树项
   */
  async getChildren(
    element?: ComponentItem | vscode.TreeItem
  ): Promise<Array<ComponentItem | vscode.TreeItem>> {
    if (element) {
      return [];
    }

    if (!this.authService.isAuthenticated()) {
      const loginItem = new vscode.TreeItem("请登录以查看收藏");
      loginItem.contextValue = "login";
      return [loginItem];
    }

    try {
      this._favorites = await this.componentService.getComponents({
        favorites: true,
      });

      if (this._favorites.length === 0) {
        const emptyItem = new vscode.TreeItem("暂无收藏");
        emptyItem.contextValue = "empty";
        return [emptyItem];
      }

      return this._favorites.map(
        (component) =>
          new ComponentItem(component, vscode.TreeItemCollapsibleState.None)
      );
    } catch (error) {
      vscode.window.showErrorMessage("无法加载收藏列表");
      const errorItem = new vscode.TreeItem("加载失败");
      errorItem.contextValue = "error";
      return [errorItem];
    }
  }
}
