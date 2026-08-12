import { APIError, type Endpoint } from 'payload'

type BulkMediaRequest = {
  action?: 'category' | 'delete'
  categories?: Array<number | string>
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
      ? [...new Set(body.ids.map(Number).filter((id) => Number.isSafeInteger(id) && id > 0))]
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

    const categoryIDs = Array.isArray(body.categories)
      ? [...new Set(body.categories.map(Number).filter((id) => Number.isSafeInteger(id) && id > 0))]
      : []

    if (!categoryIDs.length) {
      throw new APIError('Choose at least one category before applying it.', 400)
    }

    const existingCategories = await req.payload.find({
      collection: 'categories',
      depth: 0,
      limit: categoryIDs.length,
      overrideAccess: false,
      req,
      user: req.user,
      where: {
        id: {
          in: categoryIDs,
        },
      },
    })

    if (existingCategories.totalDocs !== categoryIDs.length) {
      throw new APIError('One or more selected categories no longer exist.', 400)
    }

    const existingAssignments = await req.payload.find({
      collection: 'image-categories',
      depth: 0,
      limit: MAX_BULK_ITEMS,
      overrideAccess: false,
      req,
      user: req.user,
      where: {
        and: [
          {
            category: {
              in: categoryIDs,
            },
          },
          {
            image: {
              in: ids,
            },
          },
        ],
      },
    })

    const assignedPairs = new Set(
      existingAssignments.docs.map((assignment) => `${assignment.image}:${assignment.category}`),
    )
    const errors: { id: number | string; message: string }[] = []
    let processed = 0

    for (const image of ids) {
      for (const category of categoryIDs) {
        if (assignedPairs.has(`${image}:${category}`)) continue

        try {
          await req.payload.create({
            collection: 'image-categories',
            data: {
              category,
              image,
            },
            overrideAccess: false,
            req,
            user: req.user,
          })
          processed += 1
        } catch (error) {
          errors.push({
            id: image,
            message: error instanceof Error ? error.message : 'Unable to assign this image.',
          })
        }
      }
    }

    return Response.json(
      {
        errors,
        processed,
      },
      { status: errors.length ? 422 : 200 },
    )
  },
}
