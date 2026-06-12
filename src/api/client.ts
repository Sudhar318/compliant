import { Capacitor } from "@capacitor/core";

export class ApiError extends Error {
  code?: string;
  details?: any;
  status: number;

  constructor(message: string, status: number, code?: string, details?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const BASE_URL = ((import.meta as any).env.VITE_API_URL || "").replace(/\/$/, "");

function isStaticDemoMode() {
  const isGitHubPages = typeof window !== "undefined" && window.location.hostname.endsWith("github.io");
  return !BASE_URL && (Capacitor.isNativePlatform() || isGitHubPages);
}

function getApiUrl(endpoint: string) {
  return `${BASE_URL}${endpoint}`;
}

async function parseApiResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new ApiError("Invalid API response. Check that VITE_API_URL points to the backend server.", response.status, "INVALID_API_RESPONSE");
  }

  return response.json();
}

let _token: string | null = null;
let _onTokenRefreshed: ((token: string | null) => void) | null = null;
let _onAuthFailure: (() => void) | null = null;

export const tokenStore = {
  getToken: () => _token,
  setToken: (token: string | null) => {
    _token = token;
    if (_onTokenRefreshed) {
      _onTokenRefreshed(token);
    }
  },
  onTokenRefreshed: (cb: (token: string | null) => void) => {
    _onTokenRefreshed = cb;
  },
  onAuthFailure: (cb: () => void) => {
    _onAuthFailure = cb;
  },
  triggerAuthFailure: () => {
    _token = null;
    if (_onAuthFailure) {
      _onAuthFailure();
    }
  }
};

let isRefreshing = false;
let refreshSubscribers: ((newToken: string) => void)[] = [];

function subscribeTokenRefresh(cb: (newToken: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(newToken: string) {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
}

export async function apiClient(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false
): Promise<any> {
  if (isStaticDemoMode()) {
    const { handleLocalNativeRequest } = await import("./localNativeApi.ts");
    return handleLocalNativeRequest(endpoint, options);
  }

  const url = getApiUrl(endpoint);
  
  const headers = new Headers(options.headers || {});
  
  if (!(options.body instanceof FormData)) {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
  }
  
  const token = tokenStore.getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  
  const config = {
    credentials: "include" as RequestCredentials,
    ...options,
    headers,
  };
  
  const response = await fetch(url, config);
  
  if (response.status === 401 && !isRetry) {
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh((newToken) => {
          headers.set("Authorization", `Bearer ${newToken}`);
          fetch(url, { ...options, headers })
            .then(async (res) => {
              if (!res.ok) {
                const errData = await parseApiResponse(res).catch(() => ({}));
                reject(new ApiError(errData.error?.message || "Request failed", res.status, errData.error?.code, errData.error?.details));
              } else {
                const successData = await parseApiResponse(res);
                resolve(successData.data);
              }
            })
            .catch(reject);
        });
      });
    }
    
    isRefreshing = true;
    try {
      const refreshRes = await fetch(getApiUrl("/api/auth/refresh"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      
      if (!refreshRes.ok) {
        throw new Error("Refresh token request failed");
      }
      
      const refreshPayload = await parseApiResponse(refreshRes);
      const newToken = refreshPayload.data.accessToken;
      
      tokenStore.setToken(newToken);
      isRefreshing = false;
      onRefreshed(newToken);
      
      headers.set("Authorization", `Bearer ${newToken}`);
      const retryResponse = await fetch(url, { ...options, headers });
      if (!retryResponse.ok) {
        const errData = await parseApiResponse(retryResponse).catch(() => ({}));
        throw new ApiError(
          errData.error?.message || "Request failed after refresh",
          retryResponse.status,
          errData.error?.code,
          errData.error?.details
        );
      }
      const successData = await parseApiResponse(retryResponse);
      return successData.data;
    } catch (refreshErr) {
      isRefreshing = false;
      refreshSubscribers = [];
      tokenStore.triggerAuthFailure();
      throw new ApiError("Session expired or unauthorized", 401, "UNAUTHORIZED");
    }
  }
  
  if (!response.ok) {
    const errData = await parseApiResponse(response).catch(() => ({}));
    throw new ApiError(
      errData.error?.message || "Network request failed",
      response.status,
      errData.error?.code,
      errData.error?.details
    );
  }
  
  const successData = await parseApiResponse(response);
  return successData.data;
}
