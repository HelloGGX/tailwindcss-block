import * as vscode from "vscode";
import axios, { AxiosError } from "axios";
import { User } from "../types";

interface ErrorResponse {
  message: string;
}

export class AuthService {
  private static readonly AUTH_TOKEN_KEY = "tailwindcss-block.authToken";
  private static readonly API_URL = "https://api.tailwindcss-block.com"; // 替换为实际的 API 地址

  private _token: string | undefined;
  private _currentUser: User | undefined;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.initialize();
  }

  private async initialize() {
    this._token = await this.context.secrets.get(AuthService.AUTH_TOKEN_KEY);
    if (this._token) {
      try {
        await this._fetchCurrentUser();
      } catch {
        this._token = undefined;
        await this.context.secrets.delete(AuthService.AUTH_TOKEN_KEY);
      }
    }
  }

  public isAuthenticated(): boolean {
    return !!this._token;
  }

  public getCurrentUser(): User | undefined {
    return this._currentUser;
  }

  public async login(email: string, password: string): Promise<void> {
    try {
      const response = await axios.post<{ token: string; user: User }>(
        `${AuthService.API_URL}/auth/login`,
        {
          email,
          password,
        }
      );

      this._token = response.data.token;
      this._currentUser = response.data.user;

      if (this._token) {
        await this.context.secrets.store(
          AuthService.AUTH_TOKEN_KEY,
          this._token
        );
      }
    } catch (error) {
      const axiosError = error as AxiosError<ErrorResponse>;
      console.error("Login error:", axiosError);
      throw new Error(axiosError.response?.data?.message || "登录失败");
    }
  }

  public async register(
    username: string,
    email: string,
    password: string
  ): Promise<void> {
    try {
      await axios.post(`${AuthService.API_URL}/auth/register`, {
        username,
        email,
        password,
      });
    } catch (error) {
      const axiosError = error as AxiosError<ErrorResponse>;
      console.error("Register error:", axiosError);
      throw new Error(axiosError.response?.data?.message || "注册失败");
    }
  }

  public async logout(): Promise<void> {
    this._token = undefined;
    this._currentUser = undefined;
    await this.context.secrets.delete(AuthService.AUTH_TOKEN_KEY);
  }

  public getAuthHeader() {
    return this._token ? { Authorization: `Bearer ${this._token}` } : {};
  }

  private async _fetchCurrentUser(): Promise<void> {
    try {
      const response = await axios.get<User>(
        `${AuthService.API_URL}/users/me`,
        {
          headers: this.getAuthHeader(),
        }
      );

      this._currentUser = response.data;
    } catch (error) {
      const axiosError = error as AxiosError<ErrorResponse>;
      console.error("Fetch user error:", axiosError);
      throw new Error("获取用户信息失败");
    }
  }
}
