import { ApiError } from "./client.ts";

type LocalUser = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  password: string;
  role: "CITIZEN";
  ward: string | null;
  district: string | null;
  aadhaarVerified: boolean;
};

type LocalComplaint = {
  id: string;
  trackingId: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string | null;
  priority: string;
  status: string;
  address: string | null;
  latitude?: number;
  longitude?: number;
  aiSummary: string;
  createdAt: string;
  updatedAt: string;
  media: any[];
  statusUpdates: any[];
  feedback: any | null;
  assignedOfficer: any | null;
};

const USERS_KEY = "smarttrack.local.users";
const CURRENT_USER_KEY = "smarttrack.local.currentUserId";
const OTP_KEY_PREFIX = "smarttrack.local.otp.";
const COMPLAINTS_KEY = "smarttrack.local.complaints";
const NOTIFICATIONS_KEY = "smarttrack.local.notifications";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

async function readBody(options: RequestInit) {
  if (!options.body || options.body instanceof FormData) {
    return {};
  }

  return JSON.parse(String(options.body));
}

function publicUser(user: LocalUser) {
  const { password, ...safeUser } = user;
  return safeUser;
}

function getUsers() {
  return readJson<LocalUser[]>(USERS_KEY, []);
}

function saveUsers(users: LocalUser[]) {
  writeJson(USERS_KEY, users);
}

function getComplaints() {
  return readJson<LocalComplaint[]>(COMPLAINTS_KEY, []);
}

function saveComplaints(complaints: LocalComplaint[]) {
  writeJson(COMPLAINTS_KEY, complaints);
}

function createToken(userId: string) {
  return `local-demo-token-${userId}`;
}

function getCurrentUser() {
  const currentUserId = localStorage.getItem(CURRENT_USER_KEY);
  if (!currentUserId) {
    return null;
  }

  return getUsers().find((user) => user.id === currentUserId) || null;
}

function requireCurrentUser() {
  const user = getCurrentUser();
  if (!user) {
    throw new ApiError("Please sign in again.", 401, "UNAUTHORIZED");
  }

  return user;
}

function responseForAuth(user: LocalUser) {
  localStorage.setItem(CURRENT_USER_KEY, user.id);
  return {
    user: publicUser(user),
    accessToken: createToken(user.id),
    refreshToken: createToken(user.id),
  };
}

function withDetailFields(complaint: LocalComplaint) {
  return {
    ...complaint,
    media: complaint.media || [],
    statusUpdates: complaint.statusUpdates || [],
    feedback: complaint.feedback || null,
    assignedOfficer: complaint.assignedOfficer || null,
  };
}

export async function handleLocalNativeRequest(endpoint: string, options: RequestInit = {}) {
  const url = new URL(endpoint, "https://smarttrack.local");
  const method = (options.method || "GET").toUpperCase();
  const pathname = url.pathname;

  if (pathname === "/api/auth/register" && method === "POST") {
    const body = await readBody(options);
    const users = getUsers();
    const existing = users.find((user) => user.phone === body.phone || (body.email && user.email === body.email));
    if (existing) {
      throw new ApiError("A member with this phone number or email is already registered", 400, "ALREADY_REGISTERED");
    }

    const user: LocalUser = {
      id: `local-user-${Date.now()}`,
      name: body.name,
      phone: body.phone,
      email: body.email || null,
      password: body.password,
      role: "CITIZEN",
      ward: body.ward || null,
      district: body.district || null,
      aadhaarVerified: false,
    };

    users.push(user);
    saveUsers(users);
    return responseForAuth(user);
  }

  if (pathname === "/api/auth/send-otp" && method === "POST") {
    const body = await readBody(options);
    const code = "123456";
    localStorage.setItem(`${OTP_KEY_PREFIX}${body.phone}`, code);
    return {
      message: "Demo OTP generated locally.",
      phone: body.phone,
      devNote: `Demo OTP code: ${code}`,
    };
  }

  if (pathname === "/api/auth/verify-otp" && method === "POST") {
    const body = await readBody(options);
    const storedCode = localStorage.getItem(`${OTP_KEY_PREFIX}${body.phone}`);
    if (body.code !== "123456" && body.code !== storedCode) {
      throw new ApiError("Incorrect authentication code or expired credentials", 400, "INVALID_OTP");
    }

    const users = getUsers();
    const userIndex = users.findIndex((user) => user.phone === body.phone);
    if (userIndex >= 0) {
      users[userIndex] = { ...users[userIndex], aadhaarVerified: true };
      saveUsers(users);
    }

    return { message: "Phone number verified successfully.", phone: body.phone };
  }

  if (pathname === "/api/auth/login" && method === "POST") {
    const body = await readBody(options);
    const user = getUsers().find((item) => {
      const matchesIdentifier = body.email ? item.email === body.email : item.phone === body.phone;
      return matchesIdentifier && item.password === body.password;
    });

    if (!user) {
      throw new ApiError("Invalid phone, email, or security credentials", 401, "INVALID_CREDENTIALS");
    }

    return responseForAuth(user);
  }

  if (pathname === "/api/auth/refresh" && method === "POST") {
    const user = getCurrentUser();
    if (!user) {
      throw new ApiError("Session expired: Refresh token missing", 401, "REFRESH_TOKEN_REQUIRED");
    }

    return {
      accessToken: createToken(user.id),
      refreshToken: createToken(user.id),
    };
  }

  if (pathname === "/api/auth/me" && method === "GET") {
    return { user: publicUser(requireCurrentUser()) };
  }

  if (pathname === "/api/auth/logout" && method === "POST") {
    localStorage.removeItem(CURRENT_USER_KEY);
    return { message: "Authenticated session has safely terminated." };
  }

  if (pathname === "/api/auth/profile" && method === "PATCH") {
    const body = await readBody(options);
    const currentUser = requireCurrentUser();
    const users = getUsers();
    const userIndex = users.findIndex((user) => user.id === currentUser.id);
    const updatedUser = {
      ...users[userIndex],
      ...body,
      password: body.password || users[userIndex].password,
    };
    users[userIndex] = updatedUser;
    saveUsers(users);
    return { message: "Profile updated locally.", user: publicUser(updatedUser) };
  }

  if (pathname === "/api/complaints" && method === "GET") {
    requireCurrentUser();
    const complaints = getComplaints();
    return {
      complaints,
      pagination: {
        total: complaints.length,
        page: Number(url.searchParams.get("page") || 1),
        limit: Number(url.searchParams.get("limit") || complaints.length || 10),
        pages: Math.max(1, Math.ceil(complaints.length / Number(url.searchParams.get("limit") || 10))),
      },
    };
  }

  if (pathname === "/api/complaints" && method === "POST") {
    requireCurrentUser();
    const body = await readBody(options);
    const now = new Date().toISOString();
    const complaint: LocalComplaint = {
      id: `local-complaint-${Date.now()}`,
      trackingId: `TN-${Math.floor(10000 + Math.random() * 90000)}`,
      title: body.title,
      description: body.description,
      category: body.category,
      subcategory: body.subcategory || null,
      priority: body.priority,
      status: "OPEN",
      address: body.address || null,
      latitude: body.latitude,
      longitude: body.longitude,
      aiSummary: "Local demo complaint saved on this device. Connect a deployed backend for live officer routing.",
      createdAt: now,
      updatedAt: now,
      media: [],
      statusUpdates: [{
        id: `local-status-${Date.now()}`,
        status: "OPEN",
        note: "Complaint created locally on this device.",
        createdAt: now,
        updatedBy: { name: "SmartTrack Demo", role: "SYSTEM" },
      }],
      feedback: null,
      assignedOfficer: null,
    };
    const complaints = [complaint, ...getComplaints()];
    saveComplaints(complaints);
    return complaint;
  }

  const complaintDetailMatch = pathname.match(/^\/api\/complaints\/([^/]+)$/);
  if (complaintDetailMatch && method === "GET") {
    requireCurrentUser();
    const complaint = getComplaints().find((item) => item.id === complaintDetailMatch[1]);
    if (!complaint) {
      throw new ApiError("Record not found", 404, "NOT_FOUND");
    }
    return withDetailFields(complaint);
  }

  const trackMatch = pathname.match(/^\/api\/complaints\/track\/([^/]+)$/);
  if (trackMatch && method === "GET") {
    const complaint = getComplaints().find((item) => item.trackingId === trackMatch[1]);
    if (!complaint) {
      throw new ApiError("Record not found", 404, "NOT_FOUND");
    }
    return withDetailFields(complaint);
  }

  const mediaMatch = pathname.match(/^\/api\/complaints\/([^/]+)\/media$/);
  if (mediaMatch && method === "POST") {
    requireCurrentUser();
    return {
      id: `local-media-${Date.now()}`,
      complaintId: mediaMatch[1],
      url: "",
      type: "LOCAL",
      createdAt: new Date().toISOString(),
    };
  }

  if (pathname === "/api/notifications" && method === "GET") {
    requireCurrentUser();
    return { notifications: readJson<any[]>(NOTIFICATIONS_KEY, []) };
  }

  const notificationMatch = pathname.match(/^\/api\/notifications\/([^/]+)\/read$/);
  if (notificationMatch && method === "PATCH") {
    requireCurrentUser();
    const notifications = readJson<any[]>(NOTIFICATIONS_KEY, []);
    const updated = notifications.map((item) => item.id === notificationMatch[1] ? { ...item, read: true } : item);
    writeJson(NOTIFICATIONS_KEY, updated);
    return updated.find((item) => item.id === notificationMatch[1]) || { id: notificationMatch[1], read: true };
  }

  throw new ApiError("This demo APK action requires a deployed backend API.", 503, "LOCAL_NATIVE_UNSUPPORTED");
}
