import { useState } from "react";
import type { AppTheme } from "../theme";
import "./PinEntryScreen.css";

const MAX_PIN_LENGTH = 6;
const MIN_PIN_LENGTH = 4;
const KEYPAD_DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"];

export interface PinEntryScreenProps {
  theme: AppTheme;
  title: string;
  subtitle?: string;
  onSubmit: (pin: string) => void | Promise<void>;
  loading?: boolean;
  error?: string | null;
}

/** Shared numeric PIN pad — TDD §5, Design Brief §7 ("PIN pad, 4-6 digits, masked dots"). */
export function PinEntryScreen({
  theme,
  title,
  subtitle,
  onSubmit,
  loading = false,
  error = null,
}: PinEntryScreenProps) {
  const [pin, setPin] = useState("");

  const handleDigit = (digit: string) => {
    if (loading || pin.length >= MAX_PIN_LENGTH) return;
    const next = pin + digit;
    setPin(next);
    if (next.length === MAX_PIN_LENGTH) {
      void onSubmit(next);
      setPin("");
    }
  };

  const handleBackspace = () => {
    if (loading) return;
    setPin((p) => p.slice(0, -1));
  };

  const handleEnter = () => {
    if (loading || pin.length < MIN_PIN_LENGTH) return;
    void onSubmit(pin);
    setPin("");
  };

  const canEnter = pin.length >= MIN_PIN_LENGTH && pin.length < MAX_PIN_LENGTH;

  return (
    <div className="pin-screen" data-theme={theme}>
      <div className="pin-screen__panel">
        <h1 className="pin-screen__title">{title}</h1>
        {subtitle && <p className="pin-screen__subtitle">{subtitle}</p>}

        <div className="pin-screen__dots" aria-hidden="true">
          {Array.from({ length: MAX_PIN_LENGTH }).map((_, i) => (
            <span key={i} className={`pin-screen__dot ${i < pin.length ? "is-filled" : ""}`} />
          ))}
        </div>

        <div className="pin-screen__status" role="status">
          {loading ? "Checking…" : error ?? " "}
        </div>

        <div className="pin-screen__keypad">
          {KEYPAD_DIGITS.map((key, i) => {
            if (key === "") return <div key={i} />;
            if (key === "back") {
              return (
                <button
                  key={i}
                  type="button"
                  className="pin-screen__key pin-screen__key--back"
                  onClick={handleBackspace}
                  disabled={loading || pin.length === 0}
                  aria-label="Backspace"
                >
                  ⌫
                </button>
              );
            }
            return (
              <button
                key={i}
                type="button"
                className="pin-screen__key"
                onClick={() => handleDigit(key)}
                disabled={loading}
              >
                {key}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="pin-screen__enter"
          onClick={handleEnter}
          disabled={!canEnter || loading}
        >
          Enter
        </button>
      </div>
    </div>
  );
}
