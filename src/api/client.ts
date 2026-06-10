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

const BASE_URL = (import.meta as any).env.VITE_API_URL || "";

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
  const url = `${BASE_URL}${endpoint}`;
  
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
                const errData = await res.json().catch(() => ({}));
                reject(new ApiError(errData.error?.message || "Request failed", res.status, errData.error?.code, errData.error?.details));
              } else {
                const successData = await res.json().catch(() => ({}));
                resolve(successData.data);
              }
            })
            .catch(reject);
        });
      });
    }
    
    isRefreshing = true;
    try {
      const refreshRes = await fetch(`${BASE_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      
      if (!refreshRes.ok) {
        throw new Error("Refresh token request failed");
      }
      
      const refreshPayload = await refreshRes.json();
      const newToken = refreshPayload.data.accessToken;
      
      tokenStore.setToken(newToken);
      isRefreshing = false;
      onRefreshed(newToken);
      
      headers.set("Authorization", `Bearer ${newToken}`);
      const retryResponse = await fetch(url, { ...options, headers });
      if (!retryResponse.ok) {
        const errData = await retryResponse.json().catch(() => ({}));
        throw new ApiError(
          errData.error?.message || "Request failed after refresh",
          retryResponse.status,
          errData.error?.code,
          errData.error?.details
        );
      }
      const successData = await retryResponse.json().catch(() => ({}));
      return successData.data;
    } catch (refreshErr) {
      isRefreshing = false;
      refreshSubscribers = [];
      tokenStore.triggerAuthFailure();
      throw new ApiError("Session expired or unauthorized", 401, "UNAUTHORIZED");
    }
  }
  
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new ApiError(
      errData.error?.message || "Network request failed",
      response.status,
      errData.error?.code,
      errData.error?.details
    );
  }
  
  const successData = await response.json().catch(() => ({}));
  return successData.data;
}
