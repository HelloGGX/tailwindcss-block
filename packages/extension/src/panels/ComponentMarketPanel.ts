import * as vscode from "vscode";
import * as path from "path";
import { ComponentService } from "../services/ComponentService";
import { AuthService } from "../services/AuthService";

// 定义消息类型
interface WebviewMessage {
  command: string;
  [key: string]: any;
}

// 定义组件类型
interface Component {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  code: string;
  isFavorite?: boolean;
}

// 定义过滤条件类型
interface ComponentFilters {
  searchTerm?: string;
  category?: string;
  sort?: string;
  favorites?: boolean;
}

/**
 * Tailwind CSS 组件市场面板
 * 负责展示组件市场、收藏组件和上传组件等功能
 */
export class ComponentMarketPanel {
  /** 当前活动的面板实例 */
  public static currentPanel: ComponentMarketPanel | undefined;

  /** Panel 实例 */
  private readonly _panel: vscode.WebviewPanel;

  /** 扩展URI */
  private readonly _extensionUri: vscode.Uri;

  /** 待释放的资源 */
  private _disposables: vscode.Disposable[] = [];

  /**
   * 构造函数
   * @param panel WebviewPanel实例
   * @param extensionUri 扩展URI
   * @param componentService 组件服务
   * @param authService 认证服务
   * @param initialView 初始视图
   */
  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    private readonly componentService: ComponentService,
    private readonly authService: AuthService,
    private initialView: string = "market"
  ) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    // 初始化面板
    this._update();

    // 注册事件处理
    this._registerEventHandlers();
  }

  /**
   * 创建或显示组件市场面板
   * @param extensionUri 扩展URI
   * @param componentService 组件服务
   * @param authService 认证服务
   * @param initialView 初始视图
   */
  public static createOrShow(
    extensionUri: vscode.Uri,
    componentService: ComponentService,
    authService: AuthService,
    initialView: string = "market"
  ): void {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // 如果面板已存在，则重用它
    if (ComponentMarketPanel.currentPanel) {
      ComponentMarketPanel.currentPanel._panel.reveal(column);
      ComponentMarketPanel.currentPanel.initialView = initialView;
      ComponentMarketPanel.currentPanel._update();
      return;
    }

    // 否则，创建新面板
    const panel = vscode.window.createWebviewPanel(
      "tailwindcssComponentMarket",
      "Tailwind CSS 组件市场",
      column || vscode.ViewColumn.One,
      ComponentMarketPanel._getWebviewOptions(extensionUri)
    );

    ComponentMarketPanel.currentPanel = new ComponentMarketPanel(
      panel,
      extensionUri,
      componentService,
      authService,
      initialView
    );
  }

  /**
   * 获取WebView配置选项
   * @param extensionUri 扩展URI
   */
  private static _getWebviewOptions(
    extensionUri: vscode.Uri
  ): vscode.WebviewOptions {
    const fsPath = vscode.Uri.parse(extensionUri.toString()).fsPath;

    return {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.file(path.join(fsPath, "media")),
        vscode.Uri.file(path.join(fsPath, "dist")),
      ],
    };
  }

  /**
   * 注册事件处理函数
   */
  private _registerEventHandlers(): void {
    // 释放资源
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // 处理WebView消息
    this._panel.webview.onDidReceiveMessage(
      this._handleWebviewMessage.bind(this),
      null,
      this._disposables
    );
  }

  /**
   * 处理WebView消息
   * @param message 消息对象
   */
  private async _handleWebviewMessage(message: WebviewMessage): Promise<void> {
    const { command } = message;

    try {
      switch (command) {
        case "getComponents":
          await this._handleGetComponents(message.filters);
          break;

        case "login":
          await this._handleLogin(message.email, message.password);
          break;

        case "register":
          await this._handleRegister(
            message.username,
            message.email,
            message.password
          );
          break;

        case "uploadComponent":
          await this._handleUploadComponent(message.component);
          break;

        case "insertComponent":
          this._handleInsertComponent(message.componentId);
          break;

        case "toggleFavorite":
          this._handleToggleFavorite(message.componentId);
          break;

        default:
          throw new Error(`未知的命令: ${command}`);
      }
    } catch (error) {
      // 统一错误处理
      vscode.window.showErrorMessage(`操作失败: ${error}`);
    }
  }

  /**
   * 处理获取组件请求
   * @param filters 过滤条件
   */
  private async _handleGetComponents(filters: ComponentFilters): Promise<void> {
    try {
      const components = await this.componentService.getComponents(filters);
      this._postMessageToWebview("componentsResult", { components, filters });
    } catch (error) {
      // 发送错误信息到WebView，包含原始过滤条件
      this._postMessageToWebview("componentsResult", {
        components: [],
        error: `无法加载组件: ${error}`,
        filters,
      });
      // 显示错误消息
      vscode.window.showErrorMessage(`无法加载组件: ${error}`);
    }
  }

  /**
   * 处理登录请求
   * @param email 邮箱
   * @param password 密码
   */
  private async _handleLogin(email: string, password: string): Promise<void> {
    try {
      await this.authService.login(email, password);
      this._postMessageToWebview("loginResult", {
        success: true,
        user: this.authService.getCurrentUser(),
      });
    } catch (error) {
      this._postMessageToWebview("loginResult", {
        success: false,
        error: `登录失败: ${error}`,
      });
    }
  }

  /**
   * 处理注册请求
   * @param username 用户名
   * @param email 邮箱
   * @param password 密码
   */
  private async _handleRegister(
    username: string,
    email: string,
    password: string
  ): Promise<void> {
    try {
      await this.authService.register(username, email, password);
      this._postMessageToWebview("registerResult", { success: true });
    } catch (error) {
      this._postMessageToWebview("registerResult", {
        success: false,
        error: `注册失败: ${error}`,
      });
    }
  }

  /**
   * 处理上传组件请求
   * @param component 组件数据
   */
  private async _handleUploadComponent(component: Component): Promise<void> {
    try {
      await this.componentService.createComponent(component);
      this._postMessageToWebview("uploadResult", { success: true });
      vscode.commands.executeCommand("tailwindcss-block.refreshComponents");
    } catch (error) {
      this._postMessageToWebview("uploadResult", {
        success: false,
        error: `上传失败: ${error}`,
      });
    }
  }

  /**
   * 处理插入组件请求
   * @param componentId 组件ID
   */
  private _handleInsertComponent(componentId: string): void {
    vscode.commands.executeCommand(
      "tailwindcss-block.insertComponent",
      componentId
    );
  }

  /**
   * 处理切换收藏请求
   * @param componentId 组件ID
   */
  private _handleToggleFavorite(componentId: string): void {
    vscode.commands.executeCommand(
      "tailwindcss-block.toggleFavorite",
      componentId
    );
  }

  /**
   * 向WebView发送消息
   * @param command 命令
   * @param data 数据
   */
  private _postMessageToWebview(command: string, data: any): void {
    this._panel.webview.postMessage({ command, ...data });
  }

  /**
   * 更新面板内容
   */
  private async _update(): Promise<void> {
    const webview = this._panel.webview;
    this._panel.title = "Tailwind CSS 组件市场";
    this._panel.webview.html = await this._getHtmlForWebview(webview);
  }

  /**
   * 获取WebView的HTML内容
   * @param webview WebView实例
   */
  private async _getHtmlForWebview(webview: vscode.Webview): Promise<string> {
    // 获取资源路径
    const extensionPath = vscode.Uri.parse(
      this._extensionUri.toString()
    ).fsPath;

    // 加载资源
    const resources = {
      script: webview.asWebviewUri(
        vscode.Uri.file(path.join(extensionPath, "media", "main.js"))
      ),
      style: webview.asWebviewUri(
        vscode.Uri.file(path.join(extensionPath, "media", "style.css"))
      ),
      tailwind: webview.asWebviewUri(
        vscode.Uri.file(path.join(extensionPath, "media", "tailwind.css"))
      ),
    };

    // 生成nonce用于CSP
    const nonce = this._getNonce();

    // 获取用户状态
    const isAuthenticated = this.authService.isAuthenticated();
    const currentUser = isAuthenticated
      ? this.authService.getCurrentUser()
      : null;

    // 构建HTML
    return this._buildHtmlContent(
      webview,
      resources,
      nonce,
      isAuthenticated,
      currentUser
    );
  }

  /**
   * 构建HTML内容
   * @param webview WebView实例
   * @param resources 资源路径
   * @param nonce CSP nonce
   * @param isAuthenticated 是否已认证
   * @param currentUser 当前用户
   */
  private _buildHtmlContent(
    webview: vscode.Webview,
    resources: { script: vscode.Uri; style: vscode.Uri; tailwind: vscode.Uri },
    nonce: string,
    isAuthenticated: boolean,
    currentUser: any
  ): string {
    return `<!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Tailwind CSS 组件市场</title>
      <link href="${resources.tailwind}" rel="stylesheet">
      <link href="${resources.style}" rel="stylesheet">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${
        webview.cspSource
      } https:; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
    </head>
    <body class="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100">
      <div class="container mx-auto px-4 py-6">
        <header class="mb-6">
          <h1 class="text-2xl font-bold mb-4">Tailwind CSS 组件市场</h1>
          
          <div class="flex justify-between items-center">
            <div class="flex space-x-2">
              <button id="market-tab" class="px-4 py-2 bg-blue-500 text-white rounded-t">组件市场</button>
              <button id="favorites-tab" class="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-t">我的收藏</button>
              <button id="upload-tab" class="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-t">上传组件</button>
            </div>
            
            <div>
              ${
                isAuthenticated
                  ? `<span class="mr-2">欢迎，${currentUser?.username}</span>
                   <button id="logout-btn" class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">登出</button>`
                  : `<button id="login-btn" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mr-2">登录</button>
                   <button id="register-btn" class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">注册</button>`
              }
            </div>
          </div>
        </header>
        
        <!-- 组件市场视图 -->
        <div id="market-view" class="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-md">
          <div class="flex flex-wrap gap-4 mb-6">
            <div class="flex-1">
              <input id="search-input" type="text" placeholder="搜索组件..." class="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
            
            <div>
              <select id="category-filter" class="px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">所有分类</option>
                <option value="buttons">按钮</option>
                <option value="cards">卡片</option>
                <option value="forms">表单</option>
                <option value="navigation">导航</option>
                <option value="other">其他</option>
              </select>
            </div>
            
            <div>
              <select id="sort-filter" class="px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="newest">最新</option>
                <option value="popular">最受欢迎</option>
                <option value="name">名称</option>
              </select>
            </div>
            
            <div>
              <button id="search-btn" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">搜索</button>
            </div>
          </div>
          
          <div id="components-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div class="text-center py-8">加载组件中...</div>
          </div>
        </div>
        
        <!-- 收藏视图 -->
        <div id="favorites-view" class="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-md hidden">
          <h2 class="text-xl font-bold mb-6">我的收藏</h2>
          
          <div id="favorites-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div class="text-center py-8">加载收藏中...</div>
          </div>
        </div>
        
        <!-- 上传视图 -->
        <div id="upload-view" class="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-md hidden">
          <h2 class="text-xl font-bold mb-6">上传组件</h2>
          
          <form id="upload-form">
            <div class="mb-4">
              <label class="block mb-2">组件名称</label>
              <input id="component-name" type="text" class="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" required>
            </div>
            
            <div class="mb-4">
              <label class="block mb-2">组件描述</label>
              <textarea id="component-description" class="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" rows="3" required></textarea>
            </div>
            
            <div class="mb-4">
              <label class="block mb-2">分类</label>
              <select id="component-category" class="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                <option value="buttons">按钮</option>
                <option value="cards">卡片</option>
                <option value="forms">表单</option>
                <option value="navigation">导航</option>
                <option value="other">其他</option>
              </select>
            </div>
            
            <div class="mb-4">
              <label class="block mb-2">标签（用逗号分隔）</label>
              <input id="component-tags" type="text" class="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500">
            </div>
            
            <div class="mb-4">
              <label class="block mb-2">组件代码</label>
              <textarea id="component-code" class="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" rows="10" required></textarea>
            </div>
            
            <div>
              <button type="submit" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">上传组件</button>
            </div>
          </form>
        </div>
        
        <!-- 登录视图 -->
        <div id="login-view" class="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-md hidden">
          <h2 class="text-xl font-bold mb-6">登录</h2>
          
          <form id="login-form">
            <div class="mb-4">
              <label class="block mb-2">邮箱</label>
              <input id="login-email" type="email" class="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" required>
            </div>
            
            <div class="mb-4">
              <label class="block mb-2">密码</label>
              <input id="login-password" type="password" class="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" required>
            </div>
            
            <div>
              <button type="submit" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">登录</button>
            </div>
          </form>
          
          <div class="mt-4">
            <p>还没有账号？ <a id="go-to-register" class="text-blue-500 cursor-pointer">注册</a></p>
          </div>
        </div>
        
        <!-- 注册视图 -->
        <div id="register-view" class="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-md hidden">
          <h2 class="text-xl font-bold mb-6">注册</h2>
          
          <form id="register-form">
            <div class="mb-4">
              <label class="block mb-2">用户名</label>
              <input id="register-username" type="text" class="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" required>
            </div>
            
            <div class="mb-4">
              <label class="block mb-2">邮箱</label>
              <input id="register-email" type="email" class="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" required>
            </div>
            
            <div class="mb-4">
              <label class="block mb-2">密码</label>
              <input id="register-password" type="password" class="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500" required>
            </div>
            
            <div>
              <button type="submit" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">注册</button>
            </div>
          </form>
          
          <div class="mt-4">
            <p>已有账号？ <a id="go-to-login" class="text-blue-500 cursor-pointer">登录</a></p>
          </div>
        </div>
        
        <!-- 组件详情模态框 -->
        <div id="component-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden flex items-center justify-center">
          <div class="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-4">
              <h2 id="modal-title" class="text-xl font-bold"></h2>
              <button id="close-modal" class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div class="mb-4">
              <h3 class="font-bold mb-2">预览</h3>
              <div id="component-preview" class="border p-4 rounded bg-white dark:bg-gray-800 mb-4"></div>
            </div>
            
            <div class="mb-4">
              <h3 class="font-bold mb-2">代码</h3>
              <pre id="component-code-display" class="bg-gray-100 dark:bg-gray-700 p-4 rounded overflow-x-auto"></pre>
            </div>
            
            <div class="flex space-x-2">
              <button id="insert-component" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">插入代码</button>
              <button id="toggle-favorite-modal" class="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600">收藏</button>
            </div>
          </div>
        </div>
      </div>
      
      <script nonce="${nonce}" src="${resources.script}"></script>
      <script nonce="${nonce}">
        (function() {
          const vscode = acquireVsCodeApi();
          let currentComponents = [];
          let currentComponent = null;
          
          // 初始化视图
          document.addEventListener('DOMContentLoaded', () => {
            // 标签切换
            document.getElementById('market-tab').addEventListener('click', () => showView('market'));
            document.getElementById('favorites-tab').addEventListener('click', () => showView('favorites'));
            document.getElementById('upload-tab').addEventListener('click', () => showView('upload'));
            
            // 登录/注册按钮
            const loginBtn = document.getElementById('login-btn');
            const registerBtn = document.getElementById('register-btn');
            if (loginBtn) loginBtn.addEventListener('click', () => showView('login'));
            if (registerBtn) registerBtn.addEventListener('click', () => showView('register'));
            
            // 登录/注册视图切换
            document.getElementById('go-to-register')?.addEventListener('click', () => showView('register'));
            document.getElementById('go-to-login')?.addEventListener('click', () => showView('login'));
            
            // 登出按钮
            const logoutBtn = document.getElementById('logout-btn');
            if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
            
            // 表单提交
            document.getElementById('login-form')?.addEventListener('submit', handleLogin);
            document.getElementById('register-form')?.addEventListener('submit', handleRegister);
            document.getElementById('upload-form')?.addEventListener('submit', handleUpload);
            
            // 搜索和过滤
            document.getElementById('search-btn')?.addEventListener('click', handleSearch);
            document.getElementById('category-filter')?.addEventListener('change', handleSearch);
            document.getElementById('sort-filter')?.addEventListener('change', handleSearch);
            
            // 模态框
            document.getElementById('close-modal')?.addEventListener('click', closeModal);
            document.getElementById('insert-component')?.addEventListener('click', handleInsertComponent);
            document.getElementById('toggle-favorite-modal')?.addEventListener('click', handleToggleFavorite);
            
            // 初始加载
            if ('${this.initialView}' === 'market') {
              loadComponents();
            } else if ('${this.initialView}' === 'favorites') {
              loadFavorites();
            } else if ('${this.initialView}' === 'login') {
              showView('login');
            }
          });
          
          // 显示视图
          function showView(viewName) {
            const views = ['market-view', 'favorites-view', 'upload-view', 'login-view', 'register-view'];
            const tabs = ['market-tab', 'favorites-tab', 'upload-tab'];
            
            views.forEach(v => {
              document.getElementById(v).classList.toggle('hidden', v !== viewName + '-view');
            });
            
            if (['market', 'favorites', 'upload'].includes(viewName)) {
              tabs.forEach(t => {
                const isActive = t === viewName + '-tab';
                document.getElementById(t).classList.toggle('bg-blue-500', isActive);
                document.getElementById(t).classList.toggle('text-white', isActive);
                document.getElementById(t).classList.toggle('bg-gray-200', !isActive);
                document.getElementById(t).classList.toggle('dark:bg-gray-700', !isActive);
              });
              
              if (viewName === 'market' && document.getElementById('components-grid').innerHTML === '<div class="text-center py-8">加载组件中...</div>') {
                loadComponents();
              } else if (viewName === 'favorites' && document.getElementById('favorites-grid').innerHTML === '<div class="text-center py-8">加载收藏中...</div>') {
                loadFavorites();
              }
            }
          }
          
          // 加载组件
          function loadComponents() {
            const searchTerm = document.getElementById('search-input')?.value || '';
            const category = document.getElementById('category-filter')?.value || '';
            const sort = document.getElementById('sort-filter')?.value || 'newest';
            
            vscode.postMessage({
              command: 'getComponents',
              filters: { searchTerm, category, sort }
            });
          }
          
          // 加载收藏
          function loadFavorites() {
            vscode.postMessage({
              command: 'getComponents',
              filters: { favorites: true }
            });
          }
          
          // 处理登录
          function handleLogin(e) {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            vscode.postMessage({
              command: 'login',
              email,
              password
            });
          }
          
          // 处理注册
          function handleRegister(e) {
            e.preventDefault();
            const username = document.getElementById('register-username').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            
            vscode.postMessage({
              command: 'register',
              username,
              email,
              password
            });
          }
          
          // 处理上传
          function handleUpload(e) {
            e.preventDefault();
            const name = document.getElementById('component-name').value;
            const description = document.getElementById('component-description').value;
            const category = document.getElementById('component-category').value;
            const tags = document.getElementById('component-tags').value.split(',').map(tag => tag.trim()).filter(Boolean);
            const code = document.getElementById('component-code').value;
            
            vscode.postMessage({
              command: 'uploadComponent',
              component: { name, description, category, tags, code }
            });
          }
          
          // 处理搜索
          function handleSearch() {
            loadComponents();
          }
          
          // 处理登出
          function handleLogout() {
            vscode.postMessage({ command: 'logout' });
            window.location.reload();
          }
          
          // 显示组件详情
          function showComponentDetails(component) {
            currentComponent = component;
            document.getElementById('modal-title').textContent = component.name;
            document.getElementById('component-preview').innerHTML = component.code;
            document.getElementById('component-code-display').textContent = component.code;
            document.getElementById('toggle-favorite-modal').textContent = component.isFavorite ? '取消收藏' : '收藏';
            document.getElementById('component-modal').classList.remove('hidden');
          }
          
          // 关闭模态框
          function closeModal() {
            document.getElementById('component-modal').classList.add('hidden');
          }
          
          // 插入组件
          function handleInsertComponent() {
            if (currentComponent) {
              vscode.postMessage({
                command: 'insertComponent',
                componentId: currentComponent.id
              });
              closeModal();
            }
          }
          
          // 收藏/取消收藏
          function handleToggleFavorite() {
            if (currentComponent) {
              vscode.postMessage({
                command: 'toggleFavorite',
                componentId: currentComponent.id
              });
              currentComponent.isFavorite = !currentComponent.isFavorite;
              document.getElementById('toggle-favorite-modal').textContent = currentComponent.isFavorite ? '取消收藏' : '收藏';
            }
          }
          
          // 渲染组件列表
          function renderComponents(components, containerId) {
            const container = document.getElementById(containerId);
            currentComponents = components;
            
            if (!components || components.length === 0) {
              container.innerHTML = '<div class="col-span-full text-center py-8">没有找到组件</div>';
              return;
            }
            
            let html = '';
            components.forEach((component, index) => {
              html += \`
              <div class="bg-white dark:bg-gray-700 rounded-lg shadow-md overflow-hidden">
                <div class="p-4">
                  <h3 class="text-lg font-semibold mb-2">\${component.name}</h3>
                  <p class="text-gray-600 dark:text-gray-300 text-sm mb-4">\${component.description}</p>
                  <div class="flex flex-wrap gap-1 mb-4">
                    \${component.tags.map(tag => \`<span class="px-2 py-1 bg-gray-200 dark:bg-gray-600 text-xs rounded">\${tag}</span>\`).join('')}
                  </div>
                  <div class="flex justify-between">
                    <button class="view-component px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm" data-index="\${index}">查看详情</button>
                    <button class="toggle-favorite px-3 py-1 \${component.isFavorite ? 'bg-yellow-500' : 'bg-gray-300 dark:bg-gray-600'} text-white rounded hover:bg-yellow-600 text-sm" data-index="\${index}">
                      \${component.isFavorite ? '已收藏' : '收藏'}
                    </button>
                  </div>
                </div>
              </div>
              \`;
            });
            
            container.innerHTML = html;
            
            // 添加事件监听
            document.querySelectorAll('.view-component').forEach(btn => {
              btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.getAttribute('data-index'));
                showComponentDetails(currentComponents[index]);
              });
            });
            
            document.querySelectorAll('.toggle-favorite').forEach(btn => {
              btn.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.getAttribute('data-index'));
                vscode.postMessage({
                  command: 'toggleFavorite',
                  componentId: currentComponents[index].id
                });
                
                currentComponents[index].isFavorite = !currentComponents[index].isFavorite;
                e.currentTarget.textContent = currentComponents[index].isFavorite ? '已收藏' : '收藏';
                e.currentTarget.classList.toggle('bg-yellow-500', currentComponents[index].isFavorite);
                e.currentTarget.classList.toggle('bg-gray-300', !currentComponents[index].isFavorite);
                e.currentTarget.classList.toggle('dark:bg-gray-600', !currentComponents[index].isFavorite);
              });
            });
          }
          
          // 监听来自扩展的消息
          window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.command) {
              case 'componentsResult':
                if (message.error) {
                  const grid = document.getElementById(message.filters?.favorites ? 'favorites-grid' : 'components-grid');
                  if (grid) {
                    grid.innerHTML = '<div class="col-span-full text-center py-8">
                    <p class="text-red-500 font-bold">加载失败</p>
                    <button id="retry-load" class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">重试</button>
                    </div>';
                    // 添加重试按钮事件
                    document.getElementById('retry-load')?.addEventListener('click', () => {
                      if (message.filters?.favorites) {
                        loadFavorites();
                      } else {
                        loadComponents();
                      }
                    });
                  }
                } else {
                  const containerId = message.filters?.favorites ? 'favorites-grid' : 'components-grid';
                  renderComponents(message.components, containerId);
                }
                break;
                
              case 'loginResult':
                if (message.success) {
                  window.location.reload();
                } else {
                  alert('登录失败: ' + message.error);
                }
                break;
                
              case 'registerResult':
                if (message.success) {
                  alert('注册成功，请登录');
                  showView('login');
                } else {
                  alert('注册失败: ' + message.error);
                }
                break;
                
              case 'uploadResult':
                if (message.success) {
                  alert('组件上传成功');
                  document.getElementById('upload-form').reset();
                  showView('market');
                } else {
                  alert('上传失败: ' + message.error);
                }
                break;
            }
          });
        })();
      </script>
    </body>
    </html>`;
  }

  /**
   * 生成随机nonce
   * 用于内容安全策略(CSP)
   */
  private _getNonce(): string {
    let text = "";
    const possible =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  /**
   * 释放资源
   * 清理面板及相关的disposables
   */
  public dispose(): void {
    ComponentMarketPanel.currentPanel = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
