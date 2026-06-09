import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  CORS_ORIGINS: Joi.string().default('http://localhost:3001'),
  AUTH_ENABLED: Joi.boolean().default(true),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
  DATABASE_URL: Joi.string().uri().required(),
  OPENAI_API_KEY: Joi.string().required(),
  DATAFORSEO_LOGIN: Joi.string().required(),
  DATAFORSEO_PASSWORD: Joi.string().required(),
  DATAFORSEO_API_KEY: Joi.string().optional(),
  DATAFORSEO_API_SECRET: Joi.string().optional(),
  SERP_MAX_CONCURRENT_REQUESTS: Joi.number()
    .integer()
    .min(1)
    .max(20)
    .default(3),
  SERP_REQUEST_DELAY_MS: Joi.number().integer().min(0).default(300),
  FIRECRAWL_API_KEY: Joi.string().required(),
  SUPABASE_PROJECT_URL: Joi.string().uri().optional().allow(''),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().optional().allow(''),
});
