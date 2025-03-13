import * as vscode from "vscode";
import { ComponentService } from "../services/ComponentService";
import { Component } from "../types";

/**
 * 组件树项
 * 用于在 VSCode 侧边栏中显示组件
 */
export class ComponentItem extends vscode.TreeItem {
  constructor(
    public readonly component: Component,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(component.name, collapsibleState);

    this.tooltip = component.description;
    this.description = component.category;
    this.contextValue = "component";

    // 点击时打开组件市场
    this.command = {
      command: "tailwindcss-block.openComponentMarket",
      title: "查看组件",
      arguments: [component.id],
    };

    // 设置图标
    this.iconPath = {
      light: vscode.Uri.file("media/light/component.svg"),
      dark: vscode.Uri.file("media/dark/component.svg"),
    };
  }
}

/**
 * 组件树视图提供者
 * 负责在 VSCode 侧边栏中展示组件列表
 */
export class ComponentProvider
  implements vscode.TreeDataProvider<ComponentItem | vscode.TreeItem>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<
    ComponentItem | vscode.TreeItem | null
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private _components: Component[] = [];

  constructor(private readonly componentService: ComponentService) {
    this.refresh();
  }

  /**
   * 刷新组件列表
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

    try {
      this._components = await this.componentService.getComponents();

      if (this._components.length === 0) {
        const emptyItem = new vscode.TreeItem("暂无组件");
        emptyItem.contextValue = "empty";
        return [emptyItem];
      }

      return this._components.map(
        (component) =>
          new ComponentItem(component, vscode.TreeItemCollapsibleState.None)
      );
    } catch (error) {
      vscode.window.showErrorMessage("无法加载组件列表");
      const errorItem = new vscode.TreeItem("加载失败");
      errorItem.contextValue = "error";
      return [errorItem];
    }
  }
}
