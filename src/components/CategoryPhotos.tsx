'use client'

import { Button, useDocumentInfo } from '@payloadcms/ui'
import type { UIFieldClientComponent } from 'payload'
import { useCallback, useEffect, useState } from 'react'

type CategoryDocument = {
  name: string
}

type MediaDocument = {
  filename?: null | string
  id: number | string
  url?: null | string
}

type MediaResponse = {
  docs: MediaDocument[]
  hasNextPage: boolean
  hasPrevPage: boolean
  page: number
  totalDocs: number
}

type ImageCategoryResponse = {
  docs: { image: number | string }[]
}

const PAGE_SIZE = 36

export const CategoryPhotos: UIFieldClientComponent = () => {
  const { id } = useDocumentInfo()
  const [categoryName, setCategoryName] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(Boolean(id))
  const [media, setMedia] = useState<MediaResponse>()
  const [page, setPage] = useState(1)

  const loadPhotos = useCallback(async () => {
    if (!id) return

    setIsLoading(true)
    setError('')

    try {
      const categoryResponse = await fetch(`/api/categories/${id}?depth=0`, {
        credentials: 'same-origin',
      })

      if (!categoryResponse.ok) throw new Error('Unable to load this category.')

      const category = (await categoryResponse.json()) as CategoryDocument
      const assignmentsSearch = new URLSearchParams({
        depth: '0',
        limit: '1000',
      })
      assignmentsSearch.set('where[category][equals]', String(id))

      const assignmentsResponse = await fetch(`/api/image-categories?${assignmentsSearch.toString()}`, {
        credentials: 'same-origin',
      })

      if (!assignmentsResponse.ok) throw new Error('Unable to load category assignments.')

      const assignments = (await assignmentsResponse.json()) as ImageCategoryResponse
      const imageIDs = assignments.docs.map((assignment) => String(assignment.image))

      if (!imageIDs.length) {
        setCategoryName(category.name)
        setMedia({ docs: [], hasNextPage: false, hasPrevPage: false, page: 1, totalDocs: 0 })
        return
      }

      const mediaSearch = new URLSearchParams({
        depth: '0',
        limit: String(PAGE_SIZE),
        page: String(page),
        sort: '-createdAt',
      })
      mediaSearch.set('where[id][in]', imageIDs.join(','))

      const mediaResponse = await fetch(`/api/media?${mediaSearch.toString()}`, {
        credentials: 'same-origin',
      })

      if (!mediaResponse.ok) throw new Error('Unable to load category photos.')

      setCategoryName(category.name)
      setMedia((await mediaResponse.json()) as MediaResponse)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load category photos.')
    } finally {
      setIsLoading(false)
    }
  }, [id, page])

  useEffect(() => {
    void loadPhotos()
  }, [loadPhotos])

  if (!id) {
    return (
      <section style={{ marginTop: 'var(--base)' }}>
        <h3>Photos in this category</h3>
        <p>Save the category first, then assign photos from Media.</p>
      </section>
    )
  }

  return (
    <section style={{ marginTop: 'var(--base)' }}>
      <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ marginBottom: '0.25rem' }}>Photos in this category</h3>
          <p style={{ margin: 0 }}>{media?.totalDocs ?? 0} assigned to {categoryName || 'this category'}</p>
        </div>
        <a href={`/admin/collections/media?category=${encodeURIComponent(String(id))}`}>Open Media organizer</a>
      </div>

      {error && <p role="alert">{error}</p>}
      {isLoading && <p role="status">Loading photos…</p>}

      {!isLoading && media?.totalDocs === 0 && <p>No photos have been added to this category yet.</p>}

      {!isLoading && media && media.docs.length > 0 && (
        <>
          <div
            style={{
              display: 'grid',
              gap: '0.65rem',
              gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
              marginTop: 'var(--base)',
            }}
          >
            {media.docs.map((item) => (
              <a
                href={`/admin/collections/media/${item.id}`}
                key={item.id}
                style={{
                  border: '1px solid var(--theme-elevation-200)',
                  borderRadius: 'var(--border-radius-s)',
                  color: 'inherit',
                  overflow: 'hidden',
                  padding: '0.35rem',
                  textDecoration: 'none',
                }}
              >
                {item.url ? (
                  <img alt="" loading="lazy" src={item.url} style={{ aspectRatio: '1', display: 'block', objectFit: 'cover', width: '100%' }} />
                ) : (
                  <div style={{ aspectRatio: '1', background: 'var(--theme-elevation-100)' }} />
                )}
                <span style={{ display: 'block', fontSize: '0.75rem', overflow: 'hidden', paddingTop: '0.35rem', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.filename || 'Untitled image'}
                </span>
              </a>
            ))}
          </div>
          <div style={{ alignItems: 'center', display: 'flex', gap: '0.75rem', justifyContent: 'space-between', marginTop: 'var(--base)' }}>
            <Button buttonStyle="secondary" disabled={!media.hasPrevPage} onClick={() => setPage((current) => current - 1)} size="small" type="button">
              Previous
            </Button>
            <span>Page {media.page}</span>
            <Button buttonStyle="secondary" disabled={!media.hasNextPage} onClick={() => setPage((current) => current + 1)} size="small" type="button">
              Next
            </Button>
          </div>
        </>
      )}
    </section>
  )
}
