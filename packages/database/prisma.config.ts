import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!url) {
  throw new Error('❌ Neither DIRECT_URL nor DATABASE_URL is set in .env');
}

export default defineConfig({
  schema: './prisma/schema.prisma',
  migrations: {
    path: './prisma/migrations',
  },
  datasource: {
    url,
  },
});