import { postgresAdapter } from '@payloadcms/db-postgres'
import { resendAdapter } from '@payloadcms/email-resend'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Categories } from './collections/Categories'
import { Media } from './collections/Media'
import { Galleries } from './collections/Galleries'
import { ImageCategories } from './collections/ImageCategories'
import { bulkMedia } from './endpoints/bulkMedia'
import { removeDuplicateMedia } from './endpoints/removeDuplicateMedia'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const storageBucket = process.env.SUPABASE_S3_BUCKET || process.env.S3_BUCKET
const storageEndpoint = process.env.SUPABASE_S3_ENDPOINT || process.env.S3_ENDPOINT
const storageRegion = process.env.SUPABASE_S3_REGION || process.env.S3_REGION
const storageAccessKey = process.env.SUPABASE_S3_ACCESS_KEY_ID || process.env.ACCESSKEY_ID
const storageSecretKey = process.env.SUPABASE_S3_SECRET_ACCESS_KEY || process.env.SECRETACESS_KEY
const emailFrom = process.env.EMAIL_FROM || 'Apollonie Admin <admin@apollonie.ca>'
const emailFromMatch = emailFrom.match(/^\s*(.*?)\s*<([^<>]+)>\s*$/)
const emailFromName = emailFromMatch?.[1] || 'Apollonie Admin'
const emailFromAddress = emailFromMatch?.[2] || emailFrom

export default buildConfig({
  admin: {
    user: Users.slug,
    components: {
      graphics: {
        Icon: '/components/AdminIcon',
        Logo: '/components/AdminLogo',
      },
    },
    importMap: {
      baseDir: path.resolve(dirname),
    },
    meta: {
      titleSuffix: ' - Apollonie',
    },
  },
  cors: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'https://apollonie.ca',
    'https://www.apollonie.ca',
    'http://127.0.0.1:5173',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
  ],
  collections: [Users, Categories, Media, Galleries, ImageCategories],
  editor: lexicalEditor(),
  email: resendAdapter({
    apiKey: process.env.RESEND_API_KEY || '',
    defaultFromAddress: emailFromAddress,
    defaultFromName: emailFromName,
  }),
  endpoints: [bulkMedia, removeDuplicateMedia],
  secret: process.env.PAYLOAD_SECRET || '',
  serverURL: process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      allowExitOnIdle: true,
      application_name: 'apollonie-admin',
      connectionString: process.env.DATABASE_URL || '',
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 5_000,
      keepAlive: true,
      // Payload may need one connection for initialization and another for a query.
      // Keep this well below pg's default of 10 for serverless Vercel instances.
      max: 2,
      // Recycle connections periodically in case a serverless instance remains warm.
      maxUses: 500,
    },
  }),
  sharp,
  plugins: [
    s3Storage({
      enabled: Boolean(storageBucket),
      collections: {
        media: {
          prefix: 'media',
        },
      },
      bucket: storageBucket!,
      config: {
        credentials: {
          accessKeyId: storageAccessKey!,
          secretAccessKey: storageSecretKey!,
        },
        endpoint: storageEndpoint,
        forcePathStyle: true,
        region: storageRegion,
      },
    }),
  ],
})
