import type { CollectionConfig } from 'payload'

export const ImageCategories: CollectionConfig = {
  slug: 'image-categories',
  dbName: 'image_categories',
  admin: {
    defaultColumns: ['image', 'category', 'createdAt'],
    hidden: true,
    useAsTitle: 'id',
  },
  access: {
    create: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
    read: () => true,
    update: ({ req }) => Boolean(req.user),
  },
  fields: [
    {
      name: 'image',
      type: 'relationship',
      relationTo: 'media',
      required: true,
      index: true,
    },
    {
      name: 'category',
      type: 'relationship',
      relationTo: 'categories',
      required: true,
      index: true,
    },
  ],
}
