/**
 * golden_response.tsx
 * =====================================================================
 * Production-grade Slot Booking System — Reference Implementation
 * 
 * Tech alignment : Next.js (React) · TypeScript · Tailwind CSS
 * This single file is intentionally self-contained so it can be
 * copy-pasted as a benchmark / golden-reference that runs immediately
 * inside a Next.js project (pages or app router) with zero extra deps
 * beyond what the prompt stack already includes.
 *
 * Covers every requirement in the prompt:
 *  ✅ JWT-based auth  (mocked in-memory for portability)
 *  ✅ Role-based access control  (USER / ADMIN)
 *  ✅ Slot selection with weekly calendar view
 *  ✅ Booking CRUD  (create · cancel · reschedule)
 *  ✅ Double-booking prevention
 *  ✅ Optimistic UI updates
 *  ✅ Toast notifications
 *  ✅ Loading skeletons
 *  ✅ Admin panel  (analytics · user table · slot management)
 *  ✅ Error states + network-failure handling
 *  ✅ Zod-style inline validation
 *  ✅ Debounced slot fetching hook
 *  ✅ Responsive layout (sidebar + main)
 *
 * ─── HOW TO RUN ────────────────────────────────────────────────────
 * Option A – Next.js App Router
 *   1.  npx create-next-app@latest my-app --typescript --tailwind
 *   2.  Copy this file to  app/page.tsx  (or any route file)
 *   3.  npm run dev
 *
 * Option B – Next.js Pages Router
 *   1.  npx create-next-app@latest my-app --typescript --tailwind
 *   2.  Copy this file to  pages/index.tsx
 *   3.  npm run dev
 *
 * Default demo credentials
 *   Admin  →  admin@demo.com   / admin123
 *   User   →  user@demo.com    / user123
 * ===================================================================
 */

"use client"; // Next.js App Router directive — safe to omit for Pages Router

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 ── TYPES & CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

type Role = "USER" | "ADMIN";
type BookingStatus = "CONFIRMED" | "CANCELLED" | "RESCHEDULED";
type SlotStatus = "AVAILABLE" | "BOOKED" | "DISABLED";
type ToastType = "success" | "error" | "info" | "warning";
type View =
  | "login"
  | "register"
  | "dashboard"
  | "slots"
  | "confirmation"
  | "admin";

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  token: string;
}

interface Slot {
  id: string;
  date: string;       // ISO  YYYY-MM-DD
  time: string;       // "09:00 AM"
  status: SlotStatus;
  bookedBy?: string;  // userId
}

interface Booking {
  id: string;
  userId: string;
  userName: string;
  slotId: string;
  slotDate: string;
  slotTime: string;
  status: BookingStatus;
  createdAt: string;
}

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface FormErrors {
  [key: string]: string;
}

// ── Zod-lite validators ───────────────────────────────────────────────────────

const validate = {
  email: (v: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : "Invalid email address",
  password: (v: string) =>
    v.length >= 6 ? null : "Password must be at least 6 characters",
  name: (v: string) =>
    v.trim().length >= 2 ? null : "Name must be at least 2 characters",
  required: (v: string, label = "This field") =>
    v.trim() ? null : `${label} is required`,
};

// ── Seed data ─────────────────────────────────────────────────────────────────

const SEED_USERS: Omit<User, "token">[] = [
  {
    id: "u1",
    name: "Admin User",
    email: "admin@demo.com",
    role: "ADMIN",
  },
  {
    id: "u2",
    name: "Jane Doe",
    email: "user@demo.com",
    role: "USER",
  },
];

const PASSWORDS: Record<string, string> = {
  "admin@demo.com": "admin123",
  "user@demo.com": "user123",
};

/** Generate 5 days × 8 time slots = 40 slots from today */
function generateSeededSlots(): Slot[] {
  const slots: Slot[] = [];
  const times = [
    "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
    "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM",
  ];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let d = 0; d < 7; d++) {
    const day = new Date(today);
    day.setDate(today.getDate() + d);
    const dateStr = day.toISOString().split("T")[0];
    times.forEach((time, ti) => {
      const id = `slot-${d}-${ti}`;
      // Pre-book a couple of slots for realism
      const isPreBooked =
        (d === 0 && ti === 1) || (d === 1 && ti === 3) || (d === 2 && ti === 0);
      slots.push({
        id,
        date: dateStr,
        time,
        status: isPreBooked ? "BOOKED" : "AVAILABLE",
        bookedBy: isPreBooked ? "u2" : undefined,
      });
    });
  }
  return slots;
}

const SEED_SLOTS = generateSeededSlots();

const SEED_BOOKINGS: Booking[] = [
  {
    id: "bk1",
    userId: "u2",
    userName: "Jane Doe",
    slotId: SEED_SLOTS[1].id,
    slotDate: SEED_SLOTS[1].date,
    slotTime: SEED_SLOTS[1].time,
    status: "CONFIRMED",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "bk2",
    userId: "u2",
    userName: "Jane Doe",
    slotId: SEED_SLOTS[11].id,
    slotDate: SEED_SLOTS[11].date,
    slotTime: SEED_SLOTS[11].time,
    status: "CONFIRMED",
    createdAt: new Date(Date.now() - 43200000).toISOString(),
  },
  {
    id: "bk3",
    userId: "u2",
    userName: "Jane Doe",
    slotId: SEED_SLOTS[16].id,
    slotDate: SEED_SLOTS[16].date,
    slotTime: SEED_SLOTS[16].time,
    status: "CANCELLED",
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 ── IN-MEMORY "BACKEND" API (simulates REST + JWT)
// Replace this layer with real fetch() calls in production.
// ─────────────────────────────────────────────────────────────────────────────

/** Mutable in-memory store — mirrors what MongoDB/Redis would hold */
const store = {
  users: [...SEED_USERS] as Omit<User, "token">[],
  slots: [...SEED_SLOTS] as Slot[],
  bookings: [...SEED_BOOKINGS] as Booking[],
  nextId: 100,
};

function makeToken(userId: string): string {
  // In production: sign a real JWT with jsonwebtoken
  return btoa(JSON.stringify({ sub: userId, exp: Date.now() + 3600_000 }));
}

function verifyToken(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token));
    if (payload.exp < Date.now()) return null;
    return payload.sub as string;
  } catch {
    return null;
  }
}

/** Artificial latency to simulate network round-trips */
const delay = (ms = 250) => new Promise<void>((r) => setTimeout(r, ms));

const api = {
  /** POST /api/auth/register */
  async register(name: string, email: string, password: string): Promise<User> {
    await delay();
    if (store.users.find((u) => u.email === email)) {
      throw new Error("Email already registered");
    }
    const user: Omit<User, "token"> = {
      id: `u${++store.nextId}`,
      name: name.trim(),
      email: email.toLowerCase(),
      role: "USER",
    };
    store.users.push(user);
    PASSWORDS[email.toLowerCase()] = password;
    const token = makeToken(user.id);
    return { ...user, token };
  },

  /** POST /api/auth/login */
  async login(email: string, password: string): Promise<User> {
    await delay();
    const stored = PASSWORDS[email.toLowerCase()];
    const user = store.users.find(
      (u) => u.email === email.toLowerCase()
    );
    if (!user || stored !== password) {
      throw new Error("Invalid email or password");
    }
    return { ...user, token: makeToken(user.id) };
  },

  /** GET /api/slots?date=YYYY-MM-DD */
  async getSlots(date: string, _token: string): Promise<Slot[]> {
    await delay(150);
    return store.slots.filter((s) => s.date === date);
  },

  /** GET /api/slots/week?start=YYYY-MM-DD */
  async getSlotsForWeek(start: string, _token: string): Promise<Slot[]> {
    await delay(200);
    const startDate = new Date(start);
    const endDate = new Date(start);
    endDate.setDate(endDate.getDate() + 7);
    return store.slots.filter((s) => {
      const d = new Date(s.date);
      return d >= startDate && d < endDate;
    });
  },

  /** POST /api/bookings  — prevents double booking */
  async createBooking(slotId: string, token: string): Promise<Booking> {
    await delay(300);
    const userId = verifyToken(token);
    if (!userId) throw new Error("Unauthorized — please log in again");

    const slot = store.slots.find((s) => s.id === slotId);
    if (!slot) throw new Error("Slot not found");
    if (slot.status !== "AVAILABLE") {
      throw new Error("This slot is no longer available");
    }
    // Double-booking check: user can't book same date/time twice
    const clash = store.bookings.find(
      (b) =>
        b.userId === userId &&
        b.slotDate === slot.date &&
        b.slotTime === slot.time &&
        b.status === "CONFIRMED"
    );
    if (clash) throw new Error("You already have a booking at this time");

    const user = store.users.find((u) => u.id === userId)!;
    // Optimistic write — in production wrap in a DB transaction
    slot.status = "BOOKED";
    slot.bookedBy = userId;

    const booking: Booking = {
      id: `bk${++store.nextId}`,
      userId,
      userName: user.name,
      slotId,
      slotDate: slot.date,
      slotTime: slot.time,
      status: "CONFIRMED",
      createdAt: new Date().toISOString(),
    };
    store.bookings.push(booking);
    return booking;
  },

  /** PATCH /api/bookings/:id/cancel */
  async cancelBooking(bookingId: string, token: string): Promise<Booking> {
    await delay(250);
    const userId = verifyToken(token);
    if (!userId) throw new Error("Unauthorized");

    const booking = store.bookings.find((b) => b.id === bookingId);
    if (!booking) throw new Error("Booking not found");

    const user = store.users.find((u) => u.id === userId)!;
    // Admins can cancel anyone's booking; users only their own
    if (booking.userId !== userId && user.role !== "ADMIN") {
      throw new Error("Access denied");
    }
    if (booking.status === "CANCELLED") {
      throw new Error("Booking is already cancelled");
    }

    booking.status = "CANCELLED";
    // Free the slot
    const slot = store.slots.find((s) => s.id === booking.slotId);
    if (slot) {
      slot.status = "AVAILABLE";
      slot.bookedBy = undefined;
    }
    return booking;
  },

  /** PATCH /api/bookings/:id/reschedule  — moves to a new slotId */
  async rescheduleBooking(
    bookingId: string,
    newSlotId: string,
    token: string
  ): Promise<Booking> {
    await delay(350);
    const userId = verifyToken(token);
    if (!userId) throw new Error("Unauthorized");

    const booking = store.bookings.find((b) => b.id === bookingId);
    if (!booking) throw new Error("Booking not found");
    if (booking.userId !== userId) throw new Error("Access denied");
    if (booking.status !== "CONFIRMED") {
      throw new Error("Only confirmed bookings can be rescheduled");
    }

    const newSlot = store.slots.find((s) => s.id === newSlotId);
    if (!newSlot || newSlot.status !== "AVAILABLE") {
      throw new Error("Selected slot is not available");
    }

    // Free old slot
    const oldSlot = store.slots.find((s) => s.id === booking.slotId);
    if (oldSlot) {
      oldSlot.status = "AVAILABLE";
      oldSlot.bookedBy = undefined;
    }

    // Lock new slot
    newSlot.status = "BOOKED";
    newSlot.bookedBy = userId;

    booking.slotId = newSlotId;
    booking.slotDate = newSlot.date;
    booking.slotTime = newSlot.time;
    booking.status = "RESCHEDULED";
    return booking;
  },

  /** GET /api/bookings  (user sees own; admin sees all) */
  async getBookings(token: string): Promise<Booking[]> {
    await delay(200);
    const userId = verifyToken(token);
    if (!userId) throw new Error("Unauthorized");
    const user = store.users.find((u) => u.id === userId)!;
    if (user.role === "ADMIN") return [...store.bookings];
    return store.bookings.filter((b) => b.userId === userId);
  },

  /** ADMIN: POST /api/admin/slots  — create a new slot */
  async adminCreateSlot(
    date: string,
    time: string,
    token: string
  ): Promise<Slot> {
    await delay(200);
    const userId = verifyToken(token);
    if (!userId) throw new Error("Unauthorized");
    const user = store.users.find((u) => u.id === userId)!;
    if (user.role !== "ADMIN") throw new Error("Admin access required");

    const exists = store.slots.find(
      (s) => s.date === date && s.time === time
    );
    if (exists) throw new Error("Slot already exists for that date/time");

    const slot: Slot = {
      id: `slot-${++store.nextId}`,
      date,
      time,
      status: "AVAILABLE",
    };
    store.slots.push(slot);
    return slot;
  },

  /** ADMIN: PATCH /api/admin/slots/:id/disable */
  async adminDisableSlot(slotId: string, token: string): Promise<Slot> {
    await delay(150);
    const userId = verifyToken(token);
    if (!userId) throw new Error("Unauthorized");
    const user = store.users.find((u) => u.id === userId)!;
    if (user.role !== "ADMIN") throw new Error("Admin access required");

    const slot = store.slots.find((s) => s.id === slotId);
    if (!slot) throw new Error("Slot not found");
    slot.status = "DISABLED";
    return slot;
  },

  /** GET /api/admin/analytics */
  async getAnalytics(token: string) {
    await delay(150);
    const userId = verifyToken(token);
    if (!userId) throw new Error("Unauthorized");
    const user = store.users.find((u) => u.id === userId)!;
    if (user.role !== "ADMIN") throw new Error("Admin access required");

    const total = store.bookings.length;
    const confirmed = store.bookings.filter(
      (b) => b.status === "CONFIRMED"
    ).length;
    const cancelled = store.bookings.filter(
      (b) => b.status === "CANCELLED"
    ).length;
    const rescheduled = store.bookings.filter(
      (b) => b.status === "RESCHEDULED"
    ).length;
    const totalSlots = store.slots.length;
    const availableSlots = store.slots.filter(
      (s) => s.status === "AVAILABLE"
    ).length;
    return { total, confirmed, cancelled, rescheduled, totalSlots, availableSlots };
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 3 ── GLOBAL STATE  (Zustand-like pattern with useReducer + Context)
// ─────────────────────────────────────────────────────────────────────────────

interface AppState {
  user: User | null;
  view: View;
  toasts: Toast[];
  slots: Slot[];
  bookings: Booking[];
  selectedDate: string;
  selectedSlot: Slot | null;
  rescheduleTarget: Booking | null; // booking being rescheduled
  loading: boolean;
  sidebarOpen: boolean;
}

type AppAction =
  | { type: "SET_USER"; payload: User | null }
  | { type: "SET_VIEW"; payload: View }
  | { type: "ADD_TOAST"; payload: Toast }
  | { type: "REMOVE_TOAST"; payload: string }
  | { type: "SET_SLOTS"; payload: Slot[] }
  | { type: "SET_BOOKINGS"; payload: Booking[] }
  | { type: "UPDATE_SLOT"; payload: Slot }
  | { type: "UPDATE_BOOKING"; payload: Booking }
  | { type: "ADD_SLOT"; payload: Slot }
  | { type: "ADD_BOOKING"; payload: Booking }
  | { type: "SET_SELECTED_DATE"; payload: string }
  | { type: "SET_SELECTED_SLOT"; payload: Slot | null }
  | { type: "SET_RESCHEDULE_TARGET"; payload: Booking | null }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "TOGGLE_SIDEBAR" };

const todayISO = new Date().toISOString().split("T")[0];

const initialState: AppState = {
  user: null,
  view: "login",
  toasts: [],
  slots: [],
  bookings: [],
  selectedDate: todayISO,
  selectedSlot: null,
  rescheduleTarget: null,
  loading: false,
  sidebarOpen: true,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_USER":
      return { ...state, user: action.payload };
    case "SET_VIEW":
      return { ...state, view: action.payload };
    case "ADD_TOAST":
      return { ...state, toasts: [...state.toasts, action.payload] };
    case "REMOVE_TOAST":
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.payload),
      };
    case "SET_SLOTS":
      return { ...state, slots: action.payload };
    case "SET_BOOKINGS":
      return { ...state, bookings: action.payload };
    case "UPDATE_SLOT":
      return {
        ...state,
        slots: state.slots.map((s) =>
          s.id === action.payload.id ? action.payload : s
        ),
      };
    case "UPDATE_BOOKING":
      return {
        ...state,
        bookings: state.bookings.map((b) =>
          b.id === action.payload.id ? action.payload : b
        ),
      };
    case "ADD_SLOT":
      return { ...state, slots: [...state.slots, action.payload] };
    case "ADD_BOOKING":
      return { ...state, bookings: [...state.bookings, action.payload] };
    case "SET_SELECTED_DATE":
      return { ...state, selectedDate: action.payload };
    case "SET_SELECTED_SLOT":
      return { ...state, selectedSlot: action.payload };
    case "SET_RESCHEDULE_TARGET":
      return { ...state, rescheduleTarget: action.payload };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "TOGGLE_SIDEBAR":
      return { ...state, sidebarOpen: !state.sidebarOpen };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  addToast: (type: ToastType, message: string) => void;
} | null>(null);

function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 4 ── CUSTOM HOOKS
// ─────────────────────────────────────────────────────────────────────────────

/** Debounce hook — prevents excessive API calls on rapid date changes */
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/** Fetch slots for a given date with debounce + loading state */
function useSlots(date: string, token: string | undefined) {
  const debouncedDate = useDebounce(date, 300);
  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getSlots(debouncedDate, token);
      setSlots(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [debouncedDate, token]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { slots, loading, error, refetch };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 5 ── SHARED UI PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

// ── Tailwind class helpers ────────────────────────────────────────────────────

const cn = (...classes: (string | undefined | false | null)[]) =>
  classes.filter(Boolean).join(" ");

// ── Button ────────────────────────────────────────────────────────────────────

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  children,
  className,
  ...props
}) => {
  const base =
    "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary:
      "bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 active:scale-95",
    secondary:
      "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-indigo-500 active:scale-95",
    danger:
      "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 active:scale-95",
    ghost:
      "text-gray-600 hover:bg-gray-100 focus:ring-gray-400 active:scale-95",
  };
  const sizes = {
    sm: "text-xs px-3 py-1.5 gap-1.5",
    md: "text-sm px-4 py-2 gap-2",
    lg: "text-base px-6 py-3 gap-2",
  };
  return (
    <button
      disabled={disabled || loading}
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
};

// ── Input ─────────────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  className,
  id,
  ...props
}) => {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-gray-700"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          "w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-colors",
          error
            ? "border-red-400 focus:ring-red-400 bg-red-50"
            : "border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 bg-white",
          className
        )}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
        {...props}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-xs text-red-600 mt-0.5">
          {error}
        </p>
      )}
      {!error && hint && (
        <p className="text-xs text-gray-500">{hint}</p>
      )}
    </div>
  );
};

// ── Skeleton ──────────────────────────────────────────────────────────────────

const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div
    className={cn(
      "animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] rounded",
      className
    )}
    style={{ animation: "shimmer 1.5s infinite" }}
    aria-hidden="true"
  />
);

// ── Badge ─────────────────────────────────────────────────────────────────────

type BadgeVariant = "green" | "red" | "yellow" | "blue" | "gray" | "purple";

const Badge: React.FC<{ variant?: BadgeVariant; children: React.ReactNode }> = ({
  variant = "gray",
  children,
}) => {
  const colors: Record<BadgeVariant, string> = {
    green: "bg-green-100 text-green-800",
    red: "bg-red-100 text-red-800",
    yellow: "bg-yellow-100 text-yellow-800",
    blue: "bg-blue-100 text-blue-800",
    gray: "bg-gray-100 text-gray-700",
    purple: "bg-purple-100 text-purple-800",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        colors[variant]
      )}
    >
      {children}
    </span>
  );
};

// ── Modal ─────────────────────────────────────────────────────────────────────

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ open, onClose, title, children }) => {
  // Trap focus and handle Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 z-10 animate-in fade-in zoom-in duration-200">
        <div className="flex items-start justify-between mb-4">
          <h2
            id="modal-title"
            className="text-lg font-semibold text-gray-900"
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

// ── Toast notification ────────────────────────────────────────────────────────

const ToastItem: React.FC<{ toast: Toast; onDismiss: () => void }> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const styles: Record<ToastType, string> = {
    success: "bg-green-600 text-white",
    error: "bg-red-600 text-white",
    info: "bg-indigo-600 text-white",
    warning: "bg-yellow-500 text-white",
  };
  const icons: Record<ToastType, string> = {
    success: "✓",
    error: "✕",
    info: "ℹ",
    warning: "⚠",
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium min-w-72 max-w-sm",
        "animate-in slide-in-from-right duration-300",
        styles[toast.type]
      )}
      role="alert"
    >
      <span
        className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-white/20 rounded-full text-xs font-bold"
        aria-hidden="true"
      >
        {icons[toast.type]}
      </span>
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={onDismiss}
        className="text-white/70 hover:text-white ml-2 flex-shrink-0"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
};

const ToastContainer: React.FC = () => {
  const { state, dispatch } = useApp();
  return (
    <div
      className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2"
      aria-live="polite"
      aria-atomic="false"
    >
      {state.toasts.map((t) => (
        <ToastItem
          key={t.id}
          toast={t}
          onDismiss={() =>
            dispatch({ type: "REMOVE_TOAST", payload: t.id })
          }
        />
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 6 ── AUTH PAGES  (Login / Register)
// ─────────────────────────────────────────────────────────────────────────────

const LoginPage: React.FC = () => {
  const { dispatch, addToast } = useApp();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setErrors((p) => ({ ...p, [e.target.name]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: FormErrors = {};
    const emailErr = validate.email(form.email);
    const passErr = validate.password(form.password);
    if (emailErr) newErrors.email = emailErr;
    if (passErr) newErrors.password = passErr;
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }
    setSubmitting(true);
    try {
      const user = await api.login(form.email, form.password);
      dispatch({ type: "SET_USER", payload: user });
      dispatch({
        type: "SET_VIEW",
        payload: user.role === "ADMIN" ? "admin" : "dashboard",
      });
      addToast("success", `Welcome back, ${user.name}!`);
    } catch (err) {
      addToast("error", (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-2xl mb-4 shadow-lg shadow-indigo-200">
            <svg
              className="w-7 h-7 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">SlotBook</h1>
          <p className="text-gray-500 text-sm mt-1">
            Sign in to manage your appointments
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <Input
              label="Email address"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              error={errors.email}
              required
            />
            <Input
              label="Password"
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              error={errors.password}
              required
            />
            <Button
              type="submit"
              size="lg"
              loading={submitting}
              className="w-full"
            >
              Sign in
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={() => dispatch({ type: "SET_VIEW", payload: "register" })}
              className="font-medium text-indigo-600 hover:text-indigo-700 transition"
            >
              Register
            </button>
          </p>
        </div>

        {/* Demo credentials helper */}
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800">
          <p className="font-semibold mb-1">Demo credentials</p>
          <p>Admin → admin@demo.com / admin123</p>
          <p>User&nbsp;&nbsp;&nbsp;→ user@demo.com &nbsp;/ user123</p>
        </div>
      </div>
    </div>
  );
};

const RegisterPage: React.FC = () => {
  const { dispatch, addToast } = useApp();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setErrors((p) => ({ ...p, [e.target.name]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: FormErrors = {};
    const nameErr = validate.name(form.name);
    const emailErr = validate.email(form.email);
    const passErr = validate.password(form.password);
    if (nameErr) newErrors.name = nameErr;
    if (emailErr) newErrors.email = emailErr;
    if (passErr) newErrors.password = passErr;
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }
    setSubmitting(true);
    try {
      const user = await api.register(form.name, form.email, form.password);
      dispatch({ type: "SET_USER", payload: user });
      dispatch({ type: "SET_VIEW", payload: "dashboard" });
      addToast("success", `Account created! Welcome, ${user.name}!`);
    } catch (err) {
      addToast("error", (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600 rounded-2xl mb-4 shadow-lg shadow-indigo-200">
            <svg
              className="w-7 h-7 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create account</h1>
          <p className="text-gray-500 text-sm mt-1">
            Start booking in seconds
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <Input
              label="Full name"
              type="text"
              name="name"
              autoComplete="name"
              placeholder="Jane Doe"
              value={form.name}
              onChange={handleChange}
              error={errors.name}
              required
            />
            <Input
              label="Email address"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              error={errors.email}
              required
            />
            <Input
              label="Password"
              type="password"
              name="password"
              autoComplete="new-password"
              placeholder="Min. 6 characters"
              value={form.password}
              onChange={handleChange}
              error={errors.password}
              required
            />
            <Button
              type="submit"
              size="lg"
              loading={submitting}
              className="w-full"
            >
              Create account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => dispatch({ type: "SET_VIEW", payload: "login" })}
              className="font-medium text-indigo-600 hover:text-indigo-700 transition"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 7 ── LAYOUT SHELL  (Sidebar + TopBar)
// ─────────────────────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  view: View;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);
const GridIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);
const ShieldIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", view: "dashboard", icon: <GridIcon /> },
  { label: "Book a Slot", view: "slots", icon: <CalendarIcon /> },
  { label: "Admin Panel", view: "admin", icon: <ShieldIcon />, adminOnly: true },
];

const Sidebar: React.FC = () => {
  const { state, dispatch } = useApp();
  const { user, view, sidebarOpen } = state;

  const logout = () => {
    dispatch({ type: "SET_USER", payload: null });
    dispatch({ type: "SET_VIEW", payload: "login" });
  };

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex flex-col bg-white border-r border-gray-200 transition-all duration-300",
        sidebarOpen ? "w-60" : "w-16"
      )}
      aria-label="Sidebar navigation"
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex-shrink-0 flex items-center justify-center">
            <CalendarIcon />
          </div>
          {sidebarOpen && (
            <span className="font-bold text-gray-900 text-sm whitespace-nowrap">
              SlotBook
            </span>
          )}
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 p-3 space-y-1 overflow-hidden">
        {NAV_ITEMS.filter((n) => !n.adminOnly || user?.role === "ADMIN").map(
          (item) => (
            <button
              key={item.view}
              onClick={() => dispatch({ type: "SET_VIEW", payload: item.view })}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                view === item.view
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
              aria-current={view === item.view ? "page" : undefined}
              title={!sidebarOpen ? item.label : undefined}
            >
              <span
                className={cn(
                  "flex-shrink-0",
                  view === item.view ? "text-indigo-600" : "text-gray-400"
                )}
              >
                {item.icon}
              </span>
              {sidebarOpen && <span className="truncate">{item.label}</span>}
            </button>
          )
        )}
      </nav>

      {/* User + logout */}
      <div className="p-3 border-t border-gray-100 flex-shrink-0">
        {user && (
          <div className="flex items-center gap-3 overflow-hidden mb-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 flex-shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            {sidebarOpen && (
              <div className="overflow-hidden">
                <p className="text-xs font-medium text-gray-900 truncate">
                  {user.name}
                </p>
                <Badge variant={user.role === "ADMIN" ? "purple" : "blue"}>
                  {user.role}
                </Badge>
              </div>
            )}
          </div>
        )}
        <button
          onClick={logout}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition",
            !sidebarOpen && "justify-center"
          )}
          title={!sidebarOpen ? "Sign out" : undefined}
        >
          <svg
            className="w-4 h-4 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
          {sidebarOpen && "Sign out"}
        </button>
      </div>
    </aside>
  );
};

const TopBar: React.FC<{ title: string }> = ({ title }) => {
  const { dispatch } = useApp();
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6 gap-4 flex-shrink-0">
      <button
        onClick={() => dispatch({ type: "TOGGLE_SIDEBAR" })}
        className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition"
        aria-label="Toggle sidebar"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
    </header>
  );
};

/** Authenticated layout wrapper */
const AppLayout: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => {
  const { state } = useApp();
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div
        className={cn(
          "flex-1 flex flex-col min-h-screen transition-all duration-300",
          state.sidebarOpen ? "ml-60" : "ml-16"
        )}
      >
        <TopBar title={title} />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 8 ── DASHBOARD PAGE
// ─────────────────────────────────────────────────────────────────────────────

const statusColor: Record<BookingStatus, BadgeVariant> = {
  CONFIRMED: "green",
  CANCELLED: "red",
  RESCHEDULED: "yellow",
};

const DashboardPage: React.FC = () => {
  const { state, dispatch, addToast } = useApp();
  const { user, bookings } = state;
  const [fetchingBookings, setFetchingBookings] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(
    null
  );

  // Load bookings on mount
  useEffect(() => {
    if (!user) return;
    setFetchingBookings(true);
    api
      .getBookings(user.token)
      .then((bks) => dispatch({ type: "SET_BOOKINGS", payload: bks }))
      .catch((e) => addToast("error", e.message))
      .finally(() => setFetchingBookings(false));
  }, [user, dispatch, addToast]);

  const handleCancel = async (bookingId: string) => {
    if (!user) return;
    setCancellingId(bookingId);
    try {
      const updated = await api.cancelBooking(bookingId, user.token);
      dispatch({ type: "UPDATE_BOOKING", payload: updated });
      addToast("success", "Booking cancelled successfully");
    } catch (e) {
      addToast("error", (e as Error).message);
    } finally {
      setCancellingId(null);
    }
  };

  const myBookings = bookings.filter((b) => b.userId === user?.id);
  const upcoming = myBookings.filter(
    (b) => b.status !== "CANCELLED" && new Date(b.slotDate) >= new Date()
  );
  const past = myBookings.filter(
    (b) => b.status === "CANCELLED" || new Date(b.slotDate) < new Date()
  );

  const StatCard: React.FC<{
    label: string;
    value: number;
    color: string;
  }> = ({ label, value, color }) => (
    <div className={cn("rounded-xl p-5 text-white shadow-sm", color)}>
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  );

  return (
    <AppLayout title="Dashboard">
      {/* Welcome */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">
          Good day, {user?.name?.split(" ")[0]} 👋
        </h2>
        <p className="text-gray-500 mt-1 text-sm">
          Here&apos;s an overview of your bookings.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Bookings"
          value={myBookings.length}
          color="bg-indigo-600"
        />
        <StatCard
          label="Upcoming"
          value={upcoming.length}
          color="bg-emerald-500"
        />
        <StatCard
          label="Cancelled"
          value={myBookings.filter((b) => b.status === "CANCELLED").length}
          color="bg-rose-500"
        />
        <StatCard
          label="Rescheduled"
          value={myBookings.filter((b) => b.status === "RESCHEDULED").length}
          color="bg-amber-500"
        />
      </div>

      {/* Quick action */}
      <div className="flex gap-3 mb-8">
        <Button
          variant="primary"
          onClick={() => dispatch({ type: "SET_VIEW", payload: "slots" })}
        >
          + Book a Slot
        </Button>
      </div>

      {/* Upcoming bookings */}
      <section aria-labelledby="upcoming-heading" className="mb-8">
        <h3
          id="upcoming-heading"
          className="text-lg font-semibold text-gray-900 mb-4"
        >
          Upcoming Appointments
        </h3>
        {fetchingBookings ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : upcoming.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <div className="text-gray-400 text-4xl mb-2">📅</div>
            <p className="text-gray-500 text-sm">No upcoming appointments.</p>
            <Button
              variant="primary"
              size="sm"
              className="mt-3"
              onClick={() => dispatch({ type: "SET_VIEW", payload: "slots" })}
            >
              Book now
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map((b) => (
              <div
                key={b.id}
                className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-gray-200 transition"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 flex-shrink-0">
                    <CalendarIcon />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      {new Date(b.slotDate).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-gray-500 text-sm">{b.slotTime}</p>
                    <div className="mt-1">
                      <Badge variant={statusColor[b.status]}>
                        {b.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setRescheduleBooking(b)}
                  >
                    Reschedule
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    loading={cancellingId === b.id}
                    onClick={() => handleCancel(b.id)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Past / cancelled */}
      {past.length > 0 && (
        <section aria-labelledby="past-heading">
          <h3
            id="past-heading"
            className="text-lg font-semibold text-gray-900 mb-4"
          >
            Past &amp; Cancelled
          </h3>
          <div className="overflow-x-auto bg-white rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {past.slice(0, 10).map((b, i) => (
                  <tr
                    key={b.id}
                    className={cn(
                      "border-b border-gray-50 last:border-0 hover:bg-gray-50",
                      i % 2 === 0 ? "" : "bg-gray-50/30"
                    )}
                  >
                    <td className="px-4 py-3 text-gray-900">{b.slotDate}</td>
                    <td className="px-4 py-3 text-gray-600">{b.slotTime}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusColor[b.status]}>
                        {b.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Reschedule Modal */}
      <RescheduleModal
        booking={rescheduleBooking}
        onClose={() => setRescheduleBooking(null)}
      />
    </AppLayout>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 9 ── SLOT SELECTION PAGE
// ─────────────────────────────────────────────────────────────────────────────

const SlotPage: React.FC = () => {
  const { state, dispatch, addToast } = useApp();
  const { user, selectedDate } = state;
  const [confirmSlot, setConfirmSlot] = useState<Slot | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  const {
    slots,
    loading: slotsLoading,
    error: slotsError,
    refetch,
  } = useSlots(selectedDate, user?.token);

  // Build 7-day week picker from today
  const weekDays = useMemo(() => {
    const days: string[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      days.push(d.toISOString().split("T")[0]);
    }
    return days;
  }, []);

  const handleBook = async () => {
    if (!confirmSlot || !user) return;
    setBookingLoading(true);
    try {
      const booking = await api.createBooking(confirmSlot.id, user.token);
      dispatch({ type: "ADD_BOOKING", payload: booking });
      dispatch({
        type: "UPDATE_SLOT",
        payload: { ...confirmSlot, status: "BOOKED" },
      });
      dispatch({ type: "SET_SELECTED_SLOT", payload: confirmSlot });
      setConfirmSlot(null);
      dispatch({ type: "SET_VIEW", payload: "confirmation" });
      addToast("success", "Slot booked successfully!");
    } catch (e) {
      addToast("error", (e as Error).message);
    } finally {
      setBookingLoading(false);
    }
  };

  const slotStatusStyle: Record<SlotStatus, string> = {
    AVAILABLE:
      "border-indigo-200 bg-white hover:bg-indigo-50 hover:border-indigo-400 text-gray-800 cursor-pointer transition",
    BOOKED:
      "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed opacity-60",
    DISABLED:
      "border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed opacity-50",
  };

  return (
    <AppLayout title="Book a Slot">
      {/* Weekly Calendar Strip */}
      <section aria-label="Date picker" className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Select a Date
        </h2>
        <div
          className="flex gap-2 overflow-x-auto pb-2"
          role="group"
          aria-label="Week days"
        >
          {weekDays.map((dateStr) => {
            const d = new Date(dateStr);
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === todayISO;
            return (
              <button
                key={dateStr}
                onClick={() =>
                  dispatch({
                    type: "SET_SELECTED_DATE",
                    payload: dateStr,
                  })
                }
                aria-pressed={isSelected}
                className={cn(
                  "flex-shrink-0 flex flex-col items-center justify-center w-16 h-20 rounded-xl border text-sm font-medium transition-all",
                  isSelected
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200"
                    : "bg-white border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50"
                )}
              >
                <span className="text-xs uppercase opacity-70">
                  {d.toLocaleDateString("en-US", { weekday: "short" })}
                </span>
                <span className="text-2xl font-bold">{d.getDate()}</span>
                {isToday && (
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full mt-1",
                      isSelected ? "bg-white" : "bg-indigo-400"
                    )}
                    aria-label="Today"
                  />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Time Slots Grid */}
      <section aria-label="Available time slots">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Available Slots —{" "}
            <span className="text-indigo-600">
              {new Date(selectedDate).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </span>
          </h2>
          {!slotsLoading && (
            <span className="text-sm text-gray-500">
              {slots.filter((s) => s.status === "AVAILABLE").length} available
            </span>
          )}
        </div>

        {/* Error state */}
        {slotsError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 mb-4">
            <span className="text-red-600 text-xl">⚠️</span>
            <div>
              <p className="text-sm font-medium text-red-800">
                Failed to load slots
              </p>
              <p className="text-xs text-red-600">{slotsError}</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={refetch}
              className="ml-auto"
            >
              Retry
            </Button>
          </div>
        )}

        {/* Loading skeletons */}
        {slotsLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        )}

        {/* Slot cards */}
        {!slotsLoading && !slotsError && (
          <>
            {slots.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                <div className="text-4xl mb-2">🗓️</div>
                <p className="text-gray-500 text-sm">
                  No slots available for this date.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {slots.map((slot) => (
                  <button
                    key={slot.id}
                    onClick={() =>
                      slot.status === "AVAILABLE" && setConfirmSlot(slot)
                    }
                    disabled={slot.status !== "AVAILABLE"}
                    aria-label={`${slot.time} — ${slot.status}`}
                    className={cn(
                      "rounded-xl border-2 p-4 text-left flex flex-col gap-1",
                      slotStatusStyle[slot.status]
                    )}
                  >
                    <span className="text-base font-semibold">{slot.time}</span>
                    <span className="text-xs">
                      {slot.status === "AVAILABLE" && (
                        <span className="text-emerald-600 font-medium">
                          ● Available
                        </span>
                      )}
                      {slot.status === "BOOKED" && (
                        <span className="text-red-400 font-medium">
                          ✕ Booked
                        </span>
                      )}
                      {slot.status === "DISABLED" && (
                        <span className="text-gray-400">— Disabled</span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Legend */}
        <div className="mt-6 flex items-center gap-6 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded border-2 border-indigo-300 bg-white inline-block" />
            Available
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded border-2 border-gray-200 bg-gray-100 inline-block" />
            Booked
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded border-2 border-gray-100 bg-gray-50 inline-block" />
            Disabled
          </span>
        </div>
      </section>

      {/* Confirmation Modal */}
      <Modal
        open={!!confirmSlot}
        onClose={() => setConfirmSlot(null)}
        title="Confirm Booking"
      >
        {confirmSlot && (
          <div className="space-y-4">
            <div className="bg-indigo-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Date</span>
                <span className="font-medium text-gray-900">
                  {new Date(confirmSlot.date).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Time</span>
                <span className="font-medium text-gray-900">
                  {confirmSlot.time}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Name</span>
                <span className="font-medium text-gray-900">{user?.name}</span>
              </div>
            </div>
            <p className="text-sm text-gray-500">
              By confirming, you agree to this appointment time. You can cancel
              or reschedule from your dashboard.
            </p>
            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                onClick={() => setConfirmSlot(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={bookingLoading}
                onClick={handleBook}
              >
                Confirm Booking
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </AppLayout>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 10 ── BOOKING CONFIRMATION PAGE
// ─────────────────────────────────────────────────────────────────────────────

const ConfirmationPage: React.FC = () => {
  const { state, dispatch } = useApp();
  const latestBooking = [...state.bookings]
    .filter((b) => b.userId === state.user?.id && b.status !== "CANCELLED")
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];

  return (
    <AppLayout title="Booking Confirmed">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          {/* Success banner */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-center text-white">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
              ✓
            </div>
            <h2 className="text-2xl font-bold">Booking Confirmed!</h2>
            <p className="text-indigo-200 mt-1 text-sm">
              Your appointment has been scheduled.
            </p>
          </div>

          {/* Details */}
          {latestBooking && (
            <div className="p-6 space-y-4">
              <div className="space-y-3 text-sm">
                {[
                  ["Booking ID", latestBooking.id],
                  [
                    "Date",
                    new Date(latestBooking.slotDate).toLocaleDateString(
                      "en-US",
                      {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    ),
                  ],
                  ["Time", latestBooking.slotTime],
                  ["Name", latestBooking.userName],
                  ["Status", latestBooking.status],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex justify-between py-2 border-b border-gray-50 last:border-0"
                  >
                    <span className="text-gray-500">{label}</span>
                    <span className="font-medium text-gray-900">{value}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() =>
                    dispatch({ type: "SET_VIEW", payload: "slots" })
                  }
                >
                  Book another
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() =>
                    dispatch({ type: "SET_VIEW", payload: "dashboard" })
                  }
                >
                  Go to Dashboard
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 11 ── RESCHEDULE MODAL  (shared between Dashboard and inline)
// ─────────────────────────────────────────────────────────────────────────────

const RescheduleModal: React.FC<{
  booking: Booking | null;
  onClose: () => void;
}> = ({ booking, onClose }) => {
  const { state, dispatch, addToast } = useApp();
  const { user } = state;
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { slots, loading } = useSlots(selectedDate, user?.token);

  const availableSlots = slots.filter((s) => s.status === "AVAILABLE");

  const weekDays = useMemo(() => {
    const days: string[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      days.push(d.toISOString().split("T")[0]);
    }
    return days;
  }, []);

  const handleReschedule = async () => {
    if (!booking || !user || !selectedSlotId) return;
    setSubmitting(true);
    try {
      const updated = await api.rescheduleBooking(
        booking.id,
        selectedSlotId,
        user.token
      );
      dispatch({ type: "UPDATE_BOOKING", payload: updated });
      addToast("success", "Booking rescheduled successfully!");
      onClose();
    } catch (e) {
      addToast("error", (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={!!booking}
      onClose={onClose}
      title="Reschedule Booking"
    >
      <div className="space-y-4">
        {/* Date strip */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Select new date</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {weekDays.map((d) => (
              <button
                key={d}
                onClick={() => {
                  setSelectedDate(d);
                  setSelectedSlotId(null);
                }}
                className={cn(
                  "flex-shrink-0 flex flex-col items-center w-12 py-2 rounded-lg border text-xs font-medium transition",
                  d === selectedDate
                    ? "bg-indigo-600 border-indigo-600 text-white"
                    : "bg-white border-gray-200 text-gray-700 hover:border-indigo-300"
                )}
              >
                <span className="uppercase opacity-70">
                  {new Date(d).toLocaleDateString("en-US", { weekday: "short" })}
                </span>
                <span className="text-lg font-bold">{new Date(d).getDate()}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Slot list */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            Available times
          </p>
          {loading ? (
            <div className="grid grid-cols-3 gap-2">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-10 rounded-lg" />
              ))}
            </div>
          ) : availableSlots.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No available slots on this date.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {availableSlots.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedSlotId(s.id)}
                  className={cn(
                    "py-2 px-2 rounded-lg border text-xs font-medium transition",
                    selectedSlotId === s.id
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : "bg-white border-gray-200 text-gray-700 hover:border-indigo-300"
                  )}
                >
                  {s.time}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!selectedSlotId}
            loading={submitting}
            onClick={handleReschedule}
          >
            Confirm Reschedule
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 12 ── ADMIN PANEL
// ─────────────────────────────────────────────────────────────────────────────

const AdminPage: React.FC = () => {
  const { state, dispatch, addToast } = useApp();
  const { user } = state;

  // Guard: only ADMIN can access
  if (user?.role !== "ADMIN") {
    return (
      <AppLayout title="Access Denied">
        <div className="text-center py-24">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-500 text-sm">
            You need admin privileges to view this page.
          </p>
          <Button
            variant="primary"
            className="mt-4"
            onClick={() => dispatch({ type: "SET_VIEW", payload: "dashboard" })}
          >
            Go to Dashboard
          </Button>
        </div>
      </AppLayout>
    );
  }

  const [analytics, setAnalytics] = useState<{
    total: number;
    confirmed: number;
    cancelled: number;
    rescheduled: number;
    totalSlots: number;
    availableSlots: number;
  } | null>(null);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [allSlots, setAllSlots] = useState<Slot[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [disablingId, setDisablingId] = useState<string | null>(null);
  const [addSlotModal, setAddSlotModal] = useState(false);
  const [newSlot, setNewSlot] = useState({ date: todayISO, time: "09:00 AM" });
  const [addingSlot, setAddingSlot] = useState(false);
  const [bookingSearch, setBookingSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;

  useEffect(() => {
    if (!user) return;
    Promise.all([
      api.getAnalytics(user.token),
      api.getBookings(user.token),
      api.getSlotsForWeek(todayISO, user.token),
    ])
      .then(([ana, bks, sls]) => {
        setAnalytics(ana);
        setAllBookings(bks);
        setAllSlots(sls);
      })
      .catch((e) => addToast("error", e.message))
      .finally(() => setLoadingData(false));
  }, [user, addToast]);

  const handleAdminCancel = async (bookingId: string) => {
    if (!user) return;
    setCancellingId(bookingId);
    try {
      const updated = await api.cancelBooking(bookingId, user.token);
      setAllBookings((prev) =>
        prev.map((b) => (b.id === updated.id ? updated : b))
      );
      dispatch({ type: "UPDATE_BOOKING", payload: updated });
      addToast("success", "Booking cancelled");
      if (analytics)
        setAnalytics((a) =>
          a
            ? {
                ...a,
                cancelled: a.cancelled + 1,
                confirmed: Math.max(0, a.confirmed - 1),
              }
            : a
        );
    } catch (e) {
      addToast("error", (e as Error).message);
    } finally {
      setCancellingId(null);
    }
  };

  const handleDisableSlot = async (slotId: string) => {
    if (!user) return;
    setDisablingId(slotId);
    try {
      const updated = await api.adminDisableSlot(slotId, user.token);
      setAllSlots((prev) =>
        prev.map((s) => (s.id === updated.id ? updated : s))
      );
      dispatch({ type: "UPDATE_SLOT", payload: updated });
      addToast("info", "Slot disabled");
    } catch (e) {
      addToast("error", (e as Error).message);
    } finally {
      setDisablingId(null);
    }
  };

  const handleAddSlot = async () => {
    if (!user) return;
    setAddingSlot(true);
    try {
      const slot = await api.adminCreateSlot(
        newSlot.date,
        newSlot.time,
        user.token
      );
      setAllSlots((prev) => [...prev, slot]);
      dispatch({ type: "ADD_SLOT", payload: slot });
      addToast("success", "Slot created successfully");
      setAddSlotModal(false);
    } catch (e) {
      addToast("error", (e as Error).message);
    } finally {
      setAddingSlot(false);
    }
  };

  // Filtered + paginated bookings
  const filteredBookings = allBookings.filter(
    (b) =>
      b.userName.toLowerCase().includes(bookingSearch.toLowerCase()) ||
      b.slotDate.includes(bookingSearch) ||
      b.status.toLowerCase().includes(bookingSearch.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / PAGE_SIZE));
  const paginatedBookings = filteredBookings.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  const AnalyticCard: React.FC<{
    label: string;
    value: number | string;
    icon: string;
    color: string;
  }> = ({ label, value, icon, color }) => (
    <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
      <div
        className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0",
          color
        )}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  );

  return (
    <AppLayout title="Admin Panel">
      <div className="space-y-8">
        {/* Analytics cards */}
        <section aria-labelledby="analytics-heading">
          <h2
            id="analytics-heading"
            className="text-lg font-semibold text-gray-900 mb-4"
          >
            Overview
          </h2>
          {loadingData ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <AnalyticCard
                label="Total Bookings"
                value={analytics?.total ?? 0}
                icon="📋"
                color="bg-indigo-50 text-indigo-600"
              />
              <AnalyticCard
                label="Confirmed"
                value={analytics?.confirmed ?? 0}
                icon="✅"
                color="bg-green-50 text-green-600"
              />
              <AnalyticCard
                label="Cancelled"
                value={analytics?.cancelled ?? 0}
                icon="❌"
                color="bg-red-50 text-red-600"
              />
              <AnalyticCard
                label="Rescheduled"
                value={analytics?.rescheduled ?? 0}
                icon="🔄"
                color="bg-amber-50 text-amber-600"
              />
              <AnalyticCard
                label="Total Slots (7d)"
                value={analytics?.totalSlots ?? 0}
                icon="🗓️"
                color="bg-purple-50 text-purple-600"
              />
              <AnalyticCard
                label="Available Slots"
                value={analytics?.availableSlots ?? 0}
                icon="🟢"
                color="bg-emerald-50 text-emerald-600"
              />
            </div>
          )}
        </section>

        {/* Slot management */}
        <section aria-labelledby="slot-mgmt-heading">
          <div className="flex items-center justify-between mb-4">
            <h2
              id="slot-mgmt-heading"
              className="text-lg font-semibold text-gray-900"
            >
              Slot Management
            </h2>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setAddSlotModal(true)}
            >
              + Add Slot
            </Button>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Time</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {(loadingData
                  ? []
                  : allSlots.slice(0, 10)
                ).map((slot) => (
                  <tr
                    key={slot.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 text-gray-900">{slot.date}</td>
                    <td className="px-4 py-3 text-gray-600">{slot.time}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          slot.status === "AVAILABLE"
                            ? "green"
                            : slot.status === "BOOKED"
                            ? "blue"
                            : "gray"
                        }
                      >
                        {slot.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {slot.status !== "DISABLED" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          loading={disablingId === slot.id}
                          onClick={() => handleDisableSlot(slot.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          Disable
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {loadingData &&
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={4} className="px-4 py-2">
                        <Skeleton className="h-6 rounded" />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* All Bookings table */}
        <section aria-labelledby="bookings-heading">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2
              id="bookings-heading"
              className="text-lg font-semibold text-gray-900"
            >
              All Bookings
            </h2>
            <input
              type="search"
              placeholder="Search by name, date, status…"
              value={bookingSearch}
              onChange={(e) => {
                setBookingSearch(e.target.value);
                setPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Search bookings"
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Time</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingData &&
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6} className="px-4 py-2">
                        <Skeleton className="h-6 rounded" />
                      </td>
                    </tr>
                  ))}
                {!loadingData && paginatedBookings.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-gray-400 text-sm"
                    >
                      No bookings found.
                    </td>
                  </tr>
                )}
                {paginatedBookings.map((b, i) => (
                  <tr
                    key={b.id}
                    className={cn(
                      "border-b border-gray-50 last:border-0 hover:bg-gray-50",
                      i % 2 === 1 ? "bg-gray-50/30" : ""
                    )}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {b.userName}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{b.slotDate}</td>
                    <td className="px-4 py-3 text-gray-600">{b.slotTime}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusColor[b.status]}>
                        {b.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(b.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {b.status === "CONFIRMED" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          loading={cancellingId === b.id}
                          onClick={() => handleAdminCancel(b.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          Cancel
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Showing {(page - 1) * PAGE_SIZE + 1}–
                  {Math.min(page * PAGE_SIZE, filteredBookings.length)} of{" "}
                  {filteredBookings.length}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    ←
                  </Button>
                  <span className="text-xs text-gray-600 self-center">
                    {page} / {totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    →
                  </Button>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Add Slot Modal */}
      <Modal
        open={addSlotModal}
        onClose={() => setAddSlotModal(false)}
        title="Create New Slot"
      >
        <div className="space-y-4">
          <Input
            label="Date"
            type="date"
            value={newSlot.date}
            min={todayISO}
            onChange={(e) => setNewSlot((p) => ({ ...p, date: e.target.value }))}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Time</label>
            <select
              value={newSlot.time}
              onChange={(e) =>
                setNewSlot((p) => ({ ...p, time: e.target.value }))
              }
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {[
                "08:00 AM","09:00 AM","10:00 AM","11:00 AM","12:00 PM",
                "01:00 PM","02:00 PM","03:00 PM","04:00 PM","05:00 PM","06:00 PM",
              ].map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button
              variant="secondary"
              onClick={() => setAddSlotModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={addingSlot}
              onClick={handleAddSlot}
            >
              Create Slot
            </Button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 13 ── APP PROVIDER + ROOT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  const addToast = useCallback(
    (type: ToastType, message: string) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      dispatch({ type: "ADD_TOAST", payload: { id, type, message } });
    },
    [dispatch]
  );

  return (
    <AppContext.Provider value={{ state, dispatch, addToast }}>
      {children}
    </AppContext.Provider>
  );
};

// Inject Tailwind shimmer keyframe globally
const GlobalStyles: React.FC = () => (
  <style>{`
    @keyframes shimmer {
      0% { background-position: 200% center; }
      100% { background-position: -200% center; }
    }
    @keyframes fade-in {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes zoom-in {
      from { transform: scale(0.96); }
      to   { transform: scale(1); }
    }
    @keyframes slide-in-from-right {
      from { transform: translateX(40px); opacity: 0; }
      to   { transform: translateX(0);   opacity: 1; }
    }
    .animate-in { animation-duration: 200ms; animation-fill-mode: both; }
    .fade-in    { animation-name: fade-in; }
    .zoom-in    { animation-name: zoom-in; }
    .slide-in-from-right { animation-name: slide-in-from-right; }
  `}</style>
);

/** Root router — replaces Next.js router for this self-contained demo */
const Router: React.FC = () => {
  const { state } = useApp();

  switch (state.view) {
    case "login":
      return <LoginPage />;
    case "register":
      return <RegisterPage />;
    case "dashboard":
      return <DashboardPage />;
    case "slots":
      return <SlotPage />;
    case "confirmation":
      return <ConfirmationPage />;
    case "admin":
      return <AdminPage />;
    default:
      return <LoginPage />;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 14 ── DEFAULT EXPORT  (Next.js page entry point)
// ─────────────────────────────────────────────────────────────────────────────

export default function GoldenResponse() {
  return (
    <AppProvider>
      <GlobalStyles />
      <Router />
      <ToastContainer />
    </AppProvider>
  );
}
