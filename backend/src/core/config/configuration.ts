export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  corsOrigins: process.env.CORS_ORIGINS ?? 'http://localhost:3001',
  authEnabled: process.env.AUTH_ENABLED === 'true',
  jwtSecret: process.env.JWT_SECRET ?? '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  databaseUrl: process.env.DATABASE_URL ?? '',
  openAiApiKey: process.env.OPENAI_API_KEY ?? '',
  dataForSeoLogin:
    process.env.DATAFORSEO_LOGIN ?? process.env.DATAFORSEO_API_KEY ?? '',
  dataForSeoPassword:
    process.env.DATAFORSEO_PASSWORD ?? process.env.DATAFORSEO_API_SECRET ?? '',
  serpMaxConcurrentRequests: parseInt(
    process.env.SERP_MAX_CONCURRENT_REQUESTS ?? '3',
    10,
  ),
  serpRequestDelayMs: parseInt(process.env.SERP_REQUEST_DELAY_MS ?? '300', 10),
  firecrawlApiKey: process.env.FIRECRAWL_API_KEY ?? '',
  supabaseProjectUrl: process.env.SUPABASE_PROJECT_URL ?? '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
});
