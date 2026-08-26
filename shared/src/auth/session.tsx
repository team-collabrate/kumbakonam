import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { signInAnonymously } from "firebase/auth";
import { getFirebaseAuth } from "../firebase";
import { findUserByPinHash } from "../services";
import type { SessionUser, UserRole } from "../types";
import { useLanguage } from "../i18n";
import { hashPin, isValidPinFormat } from "./pinHash";

const MESSAGES = {
  connectFailed: {
    en: "Can't reach the server. Check your connection and try again.",
    ta: "சர்வரை அணுக முடியவில்லை. உங்கள் இணைப்பைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.",
  },
  pinFormat: {
    en: "PIN must be 4 digits.",
    ta: "பின் எண் 4 இலக்கங்களாக இருக்க வேண்டும்.",
  },
  incorrectPin: {
    en: "Incorrect PIN.",
    ta: "பின் எண் தவறு.",
  },
  loginFailed: {
    en: "Something went wrong. Please try again.",
    ta: "ஏதோ தவறு நடந்தது. மீண்டும் முயற்சிக்கவும்.",
  },
} as const;

/** Per TDD §5 / 03_User_Flow §4 — re-prompt after this much inactivity. */
export const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

const ACTIVITY_EVENTS: Array<keyof WindowEventMap> = [
  "pointerdown",
  "keydown",
  "touchstart",
];

export interface SessionContextValue {
  /** null until anonymous auth completes; login is disabled until then. */
  ready: boolean;
  sessionUser: SessionUser | null;
  loading: boolean;
  error: string | null;
  login: (pin: string) => Promise<void>;
  logout: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export interface SessionProviderProps {
  children: ReactNode;
  /** Restricts PIN login to a single role — Worker app only accepts `worker`, Owner app only `owner`. */
  expectedRole: UserRole;
}

export function SessionProvider({ children, expectedRole }: SessionProviderProps) {
  const { language } = useLanguage();
  const languageRef = useRef(language);
  languageRef.current = language;
  const [ready, setReady] = useState(false);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Anonymous sign-in gates Firestore reads per firestore.rules — must
  // complete before a PIN lookup query is allowed to run. Runs once on
  // mount regardless of later language changes (languageRef avoids
  // re-triggering sign-in just because the toggle was flipped).
  useEffect(() => {
    const auth = getFirebaseAuth();
    if (auth.currentUser) {
      setReady(true);
      return;
    }
    signInAnonymously(auth)
      .then(() => setReady(true))
      .catch((err: unknown) => {
        console.error("Anonymous sign-in failed", err);
        setError(MESSAGES.connectFailed[languageRef.current]);
      });
  }, []);

  const logout = useCallback(() => {
    setSessionUser(null);
    setError(null);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const login = useCallback(
    async (pin: string) => {
      if (!isValidPinFormat(pin)) {
        setError(MESSAGES.pinFormat[language]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const pinHash = await hashPin(pin);
        const user = await findUserByPinHash(pinHash, expectedRole);
        if (!user) {
          setError(MESSAGES.incorrectPin[language]);
          return;
        }
        setSessionUser(user);
      } catch (err) {
        console.error("PIN login failed", err);
        setError(MESSAGES.loginFailed[language]);
      } finally {
        setLoading(false);
      }
    },
    [expectedRole, language],
  );

  // Inactivity timeout — resets on any user interaction while logged in.
  useEffect(() => {
    if (!sessionUser) return;

    const resetTimer = () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(logout, INACTIVITY_TIMEOUT_MS);
    };

    resetTimer();
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, resetTimer));
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, resetTimer));
    };
  }, [sessionUser, logout]);

  return (
    <SessionContext.Provider value={{ ready, sessionUser, loading, error, login, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}
