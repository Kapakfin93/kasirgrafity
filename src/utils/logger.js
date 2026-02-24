/**
 * Environment-Aware Logger
 * DEBUG dan INFO hanya tampil di development.
 * WARN dan ERROR selalu tampil (production + development).
 */

const isDev = import.meta.env.DEV;

export const logger = {
  debug: (...args) => isDev && console.log(...args),
  info: (...args) => isDev && console.info(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};
