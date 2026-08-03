import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import 'dotenv/config'
import { execFileSync } from 'node:child_process'
import { createReadStream } from 'node:fs'
import { readdir } from 'node:fs/promises'
import path from 'node:path'

const getEnv = (...names) => {
  const value = names.map((name) => process.env[name]).find(Boolean)

  if (!value) throw new Error(`Missing environment variable: ${names.join(' or ')}`)

  return value
}

const bucket = getEnv('SUPABASE_S3_BUCKET', 'S3_BUCKET')
const endpoint = getEnv('SUPABASE_S3_ENDPOINT', 'S3_ENDPOINT')
const region = getEnv('SUPABASE_S3_REGION', 'S3_REGION')
const accessKeyId = getEnv('SUPABASE_S3_ACCESS_KEY_ID', 'ACCESSKEY_ID')
const secretAccessKey = getEnv('SUPABASE_S3_SECRET_ACCESS_KEY', 'SECRETACESS_KEY')
const databaseURL = getEnv('DATABASE_URL')
const localMediaDirectory = path.resolve('media')

const client = new S3Client({
  credentials: { accessKeyId, secretAccessKey },
  endpoint,
  forcePathStyle: true,
  region,
})

const contentTypeFor = (filename) => {
  const extension = path.extname(filename).toLowerCase()
  const contentTypes = {
    '.avif': 'image/avif',
    '.gif': 'image/gif',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
  }

  return contentTypes[extension] || 'application/octet-stream'
}

const databaseFilenames = new Set(
  execFileSync('psql', [databaseURL, '-At', '-c', 'SELECT filename FROM media WHERE filename IS NOT NULL;'], {
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean),
)

const localFilenames = await readdir(localMediaDirectory)
const missingLocalFiles = [...databaseFilenames].filter((filename) => !localFilenames.includes(filename))

if (missingLocalFiles.length) {
  throw new Error(`Stopped: ${missingLocalFiles.length} Payload media files are missing locally.`)
}

const uploads = [...databaseFilenames].map((filename) => ({
  filename,
  filepath: path.join(localMediaDirectory, filename),
  key: `media/${filename}`,
}))

let uploaded = 0
let skipped = 0
let completed = 0

const objectExists = async (key) => {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
    return true
  } catch (error) {
    if (error?.$metadata?.httpStatusCode === 404 || error?.name === 'NotFound') return false
    throw error
  }
}

const migrateOne = async ({ filename, filepath, key }) => {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      if (await objectExists(key)) {
        skipped += 1
        return
      }

      await client.send(
        new PutObjectCommand({
          Body: createReadStream(filepath),
          Bucket: bucket,
          ContentType: contentTypeFor(filename),
          Key: key,
        }),
      )
      uploaded += 1
      return
    } catch (error) {
      if (attempt === 3) throw error

      console.warn(`Retrying ${filename} (attempt ${attempt + 1}/3)`)
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000))
    }
  }
}

const workerCount = Math.min(Number(process.env.MIGRATION_CONCURRENCY || 2), uploads.length)
let nextIndex = 0

const worker = async () => {
  while (nextIndex < uploads.length) {
    const item = uploads[nextIndex]
    nextIndex += 1
    await migrateOne(item)
    completed += 1

    if (completed % 25 === 0 || completed === uploads.length) {
      console.log(`Processed ${completed}/${uploads.length} (${uploaded} uploaded, ${skipped} already present)`)
    }
  }
}

await Promise.all(Array.from({ length: workerCount }, worker))
console.log(`Migration complete: ${uploaded} uploaded, ${skipped} already present.`)
