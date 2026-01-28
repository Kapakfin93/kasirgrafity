/**
 * src/hooks/useAutoLock.js
 * (FIXED EXPORT)
 * Pastikan file ini memiliki 'export function useAutoLock'
 */
import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const PIN_SESSION_KEY = "owner_pin_verified";
const IDLE_LIMIT = 5 * 60 * 1000; // 5 Menit

// 👇 PERHATIKAN: TIDAK ADA KATA 'default' DISINI
export function useAutoLock() {
  const navigate = useNavigate();
  const timerRef = useRef(null);

  const lockSystem = useCallback(() => {
    const isVerified = sessionStorage.getItem(PIN_SESSION_KEY) === "true";
    if (isVerified) {
      sessionStorage.removeItem(PIN_SESSION_KEY);
      console.log("🔒 System Locked");
      navigate("/pos", { replace: true });
    }
  }, [navigate]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(lockSystem, IDLE_LIMIT);
  }, [lockSystem]);

  useEffect(() => {
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [resetTimer]);

  return { lockSystem };
}
