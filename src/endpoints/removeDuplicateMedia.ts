import { createHash } from 'crypto'
import { readFile } from 'fs/promises'
import path from 'path'
import { APIError, type Endpoint } from 'payload'

export const removeDuplicateMedia: Endpoint = {
  path: '/maintenance/remove-duplicate-media',
  method: 'post',
  handler: async (req) => {
    if (!req.user) throw new APIError('Unauthorized', 401)

    const media = []
    let page = 1

    while (true) {
      const result = await req.payload.find({
        collection: 'media',
        depth: 0,
        limit: 100,
        page,
        req,
        overrideAccess: false,
        sort: 'id',
      })

      media.push(...result.docs)

      if (!result.hasNextPage) break
      page += 1
    }

    const mediaDirectory = path.resolve(process.cwd(), 'media')
    const originals = new Map<string, number | string>()
    const duplicateIDs: (number | string)[] = []
    let skippedMissingFiles = 0

    for (const item of media) {
      if (!item.filename) continue

      const filePath = path.resolve(mediaDirectory, item.filename)
      const relativePath = path.relative(mediaDirectory, filePath)

      if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        skippedMissingFiles += 1
        continue
      }

      try {
        const file = await readFile(filePath)
        const checksum = createHash('sha256').update(file).digest('hex')
        const originalID = originals.get(checksum)

        if (originalID) {
          duplicateIDs.push(item.id)
        } else {
          originals.set(checksum, item.id)
        }
      } catch {
        skippedMissingFiles += 1
      }
    }

    for (const id of duplicateIDs) {
      await req.payload.delete({
        collection: 'media',
        id,
        req,
        overrideAccess: false,
      })
    }

    return Response.json({
      deleted: duplicateIDs.length,
      scanned: media.length,
      skippedMissingFiles,
    })
  },
}
