/**
 * CSContext - Simple CS Name Lock
 * Purpose: Lock CS name to avoid re-entering per transaction
 * Storage: sessionStorage (resets on tab close)
 * No PIN, No Auth, No Database
 */

import React, { createContext, useContext, useState, useEffect } from "react";

const CSContext = createContext(null);

const SESSION_KEY = "cs_lock_state";

export function CSProvider({ children }) {
  const [csName, setCSNameState] = useState(null);
  const [locked, setLocked] = useState(false);

  // Restore from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) {
        const { csName: savedName, locked: savedLocked } = JSON.parse(stored);
        setCSNameState(savedName);
        setLocked(savedLocked);
      }
    } catch (err) {
      console.error("Failed to restore CS state:", err);
    }
  }, []);

  // Persist to sessionStorage on change
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ csName, locked }));
    } catch (err) {
      console.error("Failed to save CS state:", err);
    }
  }, [csName, locked]);

  const setCSName = (name) => {
    setCSNameState(name);
  };

  const lock = () => {
    if (!csName) {
      throw new Error("Nama CS harus diisi sebelum dikunci");
    }
    setLocked(true);
  };

  const unlock = () => {
    setLocked(false);
  };

  const clear = () => {
    setCSNameState(null);
    setLocked(false);
    sessionStorage.removeItem(SESSION_KEY);
  };

  return (
    <CSContext.Provider
      value={{
        csName,
        locked,
        setCSName,
        lock,
        unlock,
        clear,
      }}
    >
      {children}
    </CSContext.Provider>
  );
}

export function useCS() {
  const context = useContext(CSContext);
  if (!context) {
    throw new Error("useCS must be used within CSProvider");
  }
  return context;
}
