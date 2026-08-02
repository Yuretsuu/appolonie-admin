import { createHash } from 'crypto'
import { readFile } from 'fs/promises'
import path from 'path'
import { getPayload } from 'payload'

import config from '../src/payload.config'

const payload = await getPayload({ config })
const { docs } = await payload.find({
  collection: 'media',
  depth: 0,
  limit: 1000,
  overrideAccess: true,
  sort: 'id',
})
const seenChecksums = new Set(
  docs.flatMap((media) => (media.checksum ? [media.checksum] : [])),
)
let backfilled = 0
let duplicates = 0

for (const media of docs) {
  if (!media.filename) continue
  if (media.checksum) continue

  const file = await readFile(path.resolve(process.cwd(), 'media', media.filename))
  const checksum = createHash('sha256').update(file).digest('hex')

  if (seenChecksums.has(checksum)) {
    duplicates += 1
    continue
  }

  seenChecksums.add(checksum)

  await payload.update({
    collection: 'media',
    id: media.id,
    data: { checksum },
    overrideAccess: true,
  })
  backfilled += 1
}

console.log(
  JSON.stringify({
    recordsProcessed: docs.length,
    checksumsBackfilled: backfilled,
    existingDuplicatesPreserved: duplicates,
  }),
)
