export const getApiBaseUrl = (): string => {
  // In Node (SSR) process exists; in the browser it's undefined.
  // Guard against "process is not defined" by checking the type first.
  if (typeof process !== "undefined" && process?.env?.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL as string;
  }
  // Fallback default used during local development.
  return "http://localhost:3001/api";
};
