import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Galleries } from './collections/Galleries'
import { removeDuplicateMedia } from './endpoints/removeDuplicateMedia'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const storageBucket = process.env.SUPABASE_S3_BUCKET || process.env.S3_BUCKET
const storageEndpoint = process.env.SUPABASE_S3_ENDPOINT || process.env.S3_ENDPOINT
const storageRegion = process.env.SUPABASE_S3_REGION || process.env.S3_REGION
const storageAccessKey = process.env.SUPABASE_S3_ACCESS_KEY_ID || process.env.ACCESSKEY_ID
const storageSecretKey = process.env.SUPABASE_S3_SECRET_ACCESS_KEY || process.env.SECRETACESS_KEY

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
  collections: [Users, Media, Galleries],
  editor: lexicalEditor(),
  endpoints: [removeDuplicateMedia],
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || '',
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
