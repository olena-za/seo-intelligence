type FrontendEnv = {
  API_BASE_URL: string;
  AUTH_ENABLED: boolean;
};

function readEnv(): FrontendEnv {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

  try {
    new URL(apiUrl);
  } catch {
    throw new Error('NEXT_PUBLIC_API_URL must be a valid URL.');
  }

  return {
    API_BASE_URL: apiUrl,
    AUTH_ENABLED: process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true',
  };
}

export const env = readEnv();
export const API_BASE_URL = env.API_BASE_URL;
export const AUTH_ENABLED = env.AUTH_ENABLED;
