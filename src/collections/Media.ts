import { createHash } from 'crypto'
import { ValidationError, type CollectionConfig } from 'payload'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    components: {
      beforeList: [
        '/components/MediaOrganizer#MediaOrganizer',
        '/components/RemoveDuplicateMediaButton#RemoveDuplicateMediaButton',
      ],
    },
  },
  access: {
    read: () => true,
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
    },
    {
      name: 'categoryAssignments',
      type: 'join',
      collection: 'image-categories',
      on: 'image',
      admin: {
        description: 'Categories assigned to this image.',
      },
    },
    {
      name: 'checksum',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        hidden: true,
      },
      access: {
        read: ({ req }) => Boolean(req.user),
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        if (operation !== 'create' || !req.file?.data) return data

        const checksum = createHash('sha256').update(req.file.data).digest('hex')
        const existing = await req.payload.find({
          collection: 'media',
          req,
          depth: 0,
          limit: 1,
          where: {
            checksum: {
              equals: checksum,
            },
          },
        })

        if (existing.totalDocs) {
          throw new ValidationError({
            collection: 'media',
            errors: [
              {
                message: 'This image has already been uploaded.',
                path: 'file',
              },
            ],
            req,
          })
        }

        return {
          ...data,
          checksum,
        }
      },
    ],
  },
  upload: true,
}
