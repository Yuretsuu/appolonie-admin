// src/collections/Galleries.ts
import type { CollectionConfig } from 'payload'

export const Galleries: CollectionConfig = {
  slug: 'galleries',
  access: {
    read: () => true,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'updatedAt'],
  },
  labels: {
    singular: 'Gallery',
    plural: 'Galleries',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'photos',
      label: 'Images',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      displayPreview: true,
      admin: {
        description: 'Drag image files here to upload them. Drag the image cards to set their display order.',
      },
    },
    {
      name: 'folderUpload',
      type: 'ui',
      admin: {
        components: {
          Field: '/components/GalleryFolderUpload#GalleryFolderUpload',
        },
      },
    },
  ],
}
