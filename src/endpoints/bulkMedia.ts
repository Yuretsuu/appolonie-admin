import { APIError, type Endpoint } from 'payload'

type BulkMediaRequest = {
  action?: 'category' | 'delete'
  category?: number | string
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

    const category = Number(body.category)

    if (!Number.isSafeInteger(category) || category <= 0) {
      throw new APIError('Choose a category before applying it.', 400)
    }

    const existingCategory = await req.payload.findByID({
      collection: 'categories',
      depth: 0,
      id: category,
      overrideAccess: false,
      req,
      user: req.user,
    })

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
              equals: existingCategory.id,
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

    const assignedImageIDs = new Set(existingAssignments.docs.map((assignment) => String(assignment.image)))
    const errors: { id: number | string; message: string }[] = []
    let processed = 0

    for (const image of ids) {
      if (assignedImageIDs.has(String(image))) continue

      try {
        await req.payload.create({
          collection: 'image-categories',
          data: {
            category: existingCategory.id,
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

    return Response.json(
      {
        errors,
        processed,
      },
      { status: errors.length ? 422 : 200 },
    )
  },
}
