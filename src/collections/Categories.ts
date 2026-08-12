import type { CollectionConfig } from 'payload'

export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'updatedAt'],
  },
  labels: {
    plural: 'Categories',
    singular: 'Category',
  },
  access: {
    read: () => true,
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      unique: true,
      hooks: {
        beforeValidate: [({ value }) => (typeof value === 'string' ? value.trim() : value)],
      },
    },
    {
      name: 'photosPreview',
      type: 'ui',
      admin: {
        components: {
          Field: '/components/CategoryPhotos#CategoryPhotos',
        },
      },
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation, originalDoc, req }) => {
        const oldName = originalDoc?.name
        const newName = typeof data?.name === 'string' ? data.name.trim() : undefined

        if (operation !== 'update' || !oldName || !newName || oldName === newName) return data

        await req.payload.update({
          collection: 'media',
          context: { allowCategoryRename: true },
          data: { category: newName },
          overrideAccess: false,
          req,
          where: {
            category: {
              equals: oldName,
            },
          },
        })

        return {
          ...data,
          name: newName,
        }
      },
    ],
    beforeDelete: [
      async ({ id, req }) => {
        const category = await req.payload.findByID({
          collection: 'categories',
          depth: 0,
          id,
          overrideAccess: false,
          req,
        })

        await req.payload.update({
          collection: 'media',
          data: { category: '' },
          overrideAccess: false,
          req,
          where: {
            category: {
              equals: category.name,
            },
          },
        })
      },
    ],
  },
}
