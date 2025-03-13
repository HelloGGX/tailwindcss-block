import * as vscode from "vscode";
import { ComponentMarketPanel } from "./panels/ComponentMarketPanel";
import { ComponentProvider } from "./providers/ComponentProvider";
import { FavoriteProvider } from "./providers/FavoriteProvider";
import { AuthService } from "./services/AuthService";
import { ComponentService } from "./services/ComponentService";

export function activate(context: vscode.ExtensionContext) {
  console.log("Tailwind CSS 组件市场插件已激活");

  // 初始化服务
  const authService = new AuthService(context);
  const componentService = new ComponentService(authService);

  // 注册视图提供者
  const componentProvider = new ComponentProvider(componentService);
  const favoriteProvider = new FavoriteProvider(componentService, authService);

  // 注册视图
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(
      "tailwindcss-components",
      componentProvider
    ),
    vscode.window.registerTreeDataProvider(
      "tailwindcss-favorites",
      favoriteProvider
    )
  );

  // 注册命令
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "tailwindcss-block.openComponentMarket",
      () => {
        ComponentMarketPanel.createOrShow(
          context.extensionUri,
          componentService,
          authService
        );
      }
    ),

    vscode.commands.registerCommand(
      "tailwindcss-block.refreshComponents",
      () => {
        componentProvider.refresh();
      }
    ),

    vscode.commands.registerCommand(
      "tailwindcss-block.refreshFavorites",
      () => {
        favoriteProvider.refresh();
      }
    ),

    vscode.commands.registerCommand(
      "tailwindcss-block.insertComponent",
      async (componentId: string) => {
        try {
          const component = await componentService.getComponent(componentId);
          const editor = vscode.window.activeTextEditor;

          if (editor) {
            const position = editor.selection.active;
            editor.edit((editBuilder) => {
              editBuilder.insert(position, component.code);
            });
            vscode.window.showInformationMessage(
              `已插入组件: ${component.name}`
            );
          } else {
            vscode.window.showErrorMessage("没有打开的编辑器");
          }
        } catch (error) {
          vscode.window.showErrorMessage(`插入组件失败: ${error}`);
        }
      }
    ),

    vscode.commands.registerCommand(
      "tailwindcss-block.toggleFavorite",
      async (componentId: string) => {
        try {
          if (!authService.isAuthenticated()) {
            const result = await vscode.window.showInformationMessage(
              "需要登录才能收藏组件",
              "登录"
            );

            if (result === "登录") {
              // 打开登录面板
              vscode.commands.executeCommand(
                "tailwindcss-block.openComponentMarket",
                "login"
              );
            }
            return;
          }

          await componentService.toggleFavorite(componentId);
          favoriteProvider.refresh();
        } catch (error) {
          vscode.window.showErrorMessage(`收藏操作失败: ${error}`);
        }
      }
    ),

    vscode.commands.registerCommand("tailwindcss-block.uploadComponent", () => {
      if (!authService.isAuthenticated()) {
        vscode.window.showInformationMessage("需要登录才能上传组件");
        return;
      }

      ComponentMarketPanel.createOrShow(
        context.extensionUri,
        componentService,
        authService,
        "upload"
      );
    })
  );
}

export function deactivate() {}
