declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * Base URL for the API. Optional; defaults to "http://localhost:3001/api" when not set.
     */
    NEXT_PUBLIC_API_URL?: string;
  }
}
