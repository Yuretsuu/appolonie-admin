import { APIError, type Endpoint } from 'payload'

type BulkMediaRequest = {
  action?: 'category' | 'delete'
  category?: string
  ids?: Array<number | string>
}

const MAX_BULK_ITEMS = 100

export const bulkMedia: Endpoint = {
  path: '/maintenance/bulk-media',
  method: 'post',
  handler: async (req) => {
    if (!req.user) throw new APIError('Unauthorized', 401)

    const body = (await req.json?.()) as BulkMediaRequest
    const action = body?.action
    const ids = Array.isArray(body?.ids)
      ? [...new Set(body.ids.filter((id) => typeof id === 'number' || typeof id === 'string'))]
      : []

    if (action !== 'category' && action !== 'delete') {
      throw new APIError('Choose a valid bulk action.', 400)
    }

    if (!ids.length || ids.length > MAX_BULK_ITEMS) {
      throw new APIError(`Select between 1 and ${MAX_BULK_ITEMS} images.`, 400)
    }

    const where = {
      id: {
        in: ids,
      },
    }

    if (action === 'delete') {
      const result = await req.payload.delete({
        collection: 'media',
        overrideAccess: false,
        req,
        user: req.user,
        where,
      })

      return Response.json(
        {
          errors: result.errors,
          processed: result.docs.length,
        },
        { status: result.errors.length ? 422 : 200 },
      )
    }

    const category = body.category?.trim()

    if (!category) throw new APIError('Choose a category before applying it.', 400)

    const existingCategory = await req.payload.find({
      collection: 'categories',
      depth: 0,
      limit: 1,
      overrideAccess: false,
      req,
      user: req.user,
      where: {
        name: {
          equals: category,
        },
      },
    })

    if (!existingCategory.totalDocs) {
      throw new APIError('Create this category in Categories before assigning photos to it.', 400)
    }

    const result = await req.payload.update({
      collection: 'media',
      context: {
        bulkCategoryValidated: true,
      },
      data: {
        category,
      },
      overrideAccess: false,
      req,
      user: req.user,
      where,
    })

    return Response.json(
      {
        errors: result.errors,
        processed: result.docs.length,
      },
      { status: result.errors.length ? 422 : 200 },
    )
  },
}
