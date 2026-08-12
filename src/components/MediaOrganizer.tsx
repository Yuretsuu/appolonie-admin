'use client'

import { Button } from '@payloadcms/ui'
import { useCallback, useEffect, useMemo, useState } from 'react'

type MediaDocument = {
  category?: null | string
  filename?: null | string
  id: number | string
  mimeType?: null | string
  url?: null | string
}

type MediaResponse = {
  docs: MediaDocument[]
  hasNextPage: boolean
  hasPrevPage: boolean
  page: number
  totalDocs: number
}

type CategoryResponse = {
  docs: { id: number | string; name: string }[]
}

type FilterMode = 'include' | 'exclude'
type ViewMode = 'gallery' | 'list'

const PAGE_SIZE = 48

export const MediaOrganizer = () => {
  const [category, setCategory] = useState('')
  const [categoryOptions, setCategoryOptions] = useState<CategoryResponse['docs']>([])
  const [error, setError] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterMode, setFilterMode] = useState<FilterMode>('include')
  const [isLoading, setIsLoading] = useState(true)
  const [isWorking, setIsWorking] = useState(false)
  const [media, setMedia] = useState<MediaResponse>()
  const [page, setPage] = useState(1)
  const [selectedIDs, setSelectedIDs] = useState<Set<string>>(() => new Set())
  const [view, setView] = useState<ViewMode>('gallery')

  const loadMedia = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const search = new URLSearchParams({
        depth: '0',
        limit: String(PAGE_SIZE),
        page: String(page),
        sort: '-createdAt',
      })

      if (filterCategory) {
        search.set(`where[category][${filterMode === 'include' ? 'equals' : 'not_equals'}]`, filterCategory)
      }

      const response = await fetch(`/api/media?${search.toString()}`, {
        credentials: 'same-origin',
      })

      if (!response.ok) throw new Error('Unable to load images.')

      setMedia((await response.json()) as MediaResponse)
      setSelectedIDs(new Set())
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load images.')
    } finally {
      setIsLoading(false)
    }
  }, [filterCategory, filterMode, page])

  useEffect(() => {
    void loadMedia()
  }, [loadMedia])

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch('/api/categories?depth=0&limit=100&sort=name', {
          credentials: 'same-origin',
        })

        if (!response.ok) return

        const result = (await response.json()) as CategoryResponse
        setCategoryOptions(result.docs)
      } catch {
        // Category suggestions are optional; assigning a category still works.
      }
    }

    void loadCategories()
  }, [])

  useEffect(() => {
    const requestedCategory = new URLSearchParams(window.location.search).get('category')

    if (requestedCategory) setFilterCategory(requestedCategory)
  }, [])

  const selectedCount = selectedIDs.size
  const selectedLabel = `${selectedCount} image${selectedCount === 1 ? '' : 's'} selected`
  const categories = useMemo(
    () => [...categoryOptions].sort((a, b) => a.name.localeCompare(b.name)),
    [categoryOptions],
  )

  const toggleSelection = (id: MediaDocument['id']) => {
    const key = String(id)
    setSelectedIDs((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const runBulkAction = async (action: 'category' | 'delete') => {
    if (!selectedCount) return

    if (action === 'delete') {
      const confirmed = window.confirm(
        `Delete ${selectedLabel}? This removes the media records and their stored image files.`,
      )

      if (!confirmed) return
    }

    if (action === 'category' && !category.trim()) {
      setError('Choose a category before applying it.')
      return
    }

    setIsWorking(true)
    setError('')

    try {
      const selected = [...selectedIDs]
      const responses = await Promise.all(
        selected.map((id) =>
          fetch(`/api/media/${id}`, {
            body: action === 'category' ? JSON.stringify({ category: category.trim() }) : undefined,
            credentials: 'same-origin',
            headers: action === 'category' ? { 'Content-Type': 'application/json' } : undefined,
            method: action === 'category' ? 'PATCH' : 'DELETE',
          }),
        ),
      )

      if (responses.some((response) => !response.ok)) {
        throw new Error('Some selected images could not be updated. Please try again.')
      }

      setCategory('')
      await loadMedia()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Unable to update the selected images.')
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <section
      style={{
        border: '1px solid var(--theme-elevation-200)',
        borderRadius: 'var(--border-radius-m)',
        marginBottom: 'var(--base)',
        padding: 'var(--base)',
      }}
    >
      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          justifyContent: 'space-between',
          marginBottom: 'var(--base)',
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Media organizer</h2>
          <p style={{ margin: '0.3rem 0 0' }}>
            Right-click an image, or use its checkbox, to select multiple images for a category or deletion.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button buttonStyle={view === 'gallery' ? 'primary' : 'secondary'} onClick={() => setView('gallery')} size="small" type="button">
            Gallery
          </Button>
          <Button buttonStyle={view === 'list' ? 'primary' : 'secondary'} onClick={() => setView('list')} size="small" type="button">
            List
          </Button>
        </div>
      </div>

      <div
        style={{
          alignItems: 'end',
          background: 'var(--theme-elevation-50)',
          border: '1px solid var(--theme-elevation-150)',
          borderRadius: 'var(--border-radius-s)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: 'var(--base)',
          padding: '0.75rem',
        }}
      >
        <label style={{ display: 'grid', gap: '0.3rem' }}>
          <span>Category filter</span>
          <select
            onChange={(event) => {
              setFilterCategory(event.target.value)
              setPage(1)
            }}
            value={filterCategory}
          >
            <option value="">All photos</option>
            {categories.map((existingCategory) => (
              <option key={existingCategory.id} value={existingCategory.name}>
                {existingCategory.name}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: 'grid', gap: '0.3rem' }}>
          <span>Show photos that</span>
          <select
            disabled={!filterCategory}
            onChange={(event) => {
              setFilterMode(event.target.value as FilterMode)
              setPage(1)
            }}
            value={filterMode}
          >
            <option value="include">Include this category</option>
            <option value="exclude">Exclude this category</option>
          </select>
        </label>
        {filterCategory && (
          <Button
            buttonStyle="secondary"
            onClick={() => {
              setFilterCategory('')
              setFilterMode('include')
              setPage(1)
            }}
            size="small"
            type="button"
          >
            Clear filter
          </Button>
        )}
        <a href="/admin/collections/categories">Manage categories</a>
      </div>

      {selectedCount > 0 && (
        <div
          style={{
            alignItems: 'center',
            background: 'var(--theme-elevation-100)',
            borderRadius: 'var(--border-radius-s)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            marginBottom: 'var(--base)',
            padding: '0.75rem',
          }}
        >
          <strong>{selectedLabel}</strong>
          <select
            aria-label="Category for selected images"
            onChange={(event) => setCategory(event.target.value)}
            value={category}
          >
            <option value="">Choose a category</option>
            {categories.map((existingCategory) => (
              <option key={existingCategory.id} value={existingCategory.name}>
                {existingCategory.name}
              </option>
            ))}
          </select>
          <Button buttonStyle="primary" disabled={isWorking || !category} onClick={() => void runBulkAction('category')} size="small" type="button">
            Add to category
          </Button>
          <Button buttonStyle="secondary" disabled={isWorking} onClick={() => void runBulkAction('delete')} size="small" type="button">
            Delete selected
          </Button>
          <Button buttonStyle="secondary" disabled={isWorking} onClick={() => setSelectedIDs(new Set())} size="small" type="button">
            Clear selection
          </Button>
        </div>
      )}

      {error && <p role="alert">{error}</p>}
      {isLoading && <p role="status">Loading images…</p>}

      {!isLoading && media && (
        <>
          {view === 'gallery' ? (
            <div
              style={{
                display: 'grid',
                gap: '0.75rem',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
              }}
            >
              {media.docs.map((item) => {
                const selected = selectedIDs.has(String(item.id))

                return (
                  <article
                    key={item.id}
                    onContextMenu={(event) => {
                      event.preventDefault()
                      toggleSelection(item.id)
                    }}
                    style={{
                      border: selected ? '2px solid var(--theme-success-500)' : '1px solid var(--theme-elevation-200)',
                      borderRadius: 'var(--border-radius-s)',
                      overflow: 'hidden',
                      padding: '0.45rem',
                    }}
                  >
                    <label style={{ cursor: 'pointer', display: 'block' }}>
                      <input
                        aria-label={`Select ${item.filename || 'image'}`}
                        checked={selected}
                        onChange={() => toggleSelection(item.id)}
                        type="checkbox"
                      />
                      {item.url ? (
                        <img
                          alt=""
                          loading="lazy"
                          src={item.url}
                          style={{ aspectRatio: '1', display: 'block', marginTop: '0.35rem', objectFit: 'cover', width: '100%' }}
                        />
                      ) : (
                        <div style={{ aspectRatio: '1', background: 'var(--theme-elevation-100)', marginTop: '0.35rem' }} />
                      )}
                      <span style={{ display: 'block', fontSize: '0.78rem', marginTop: '0.45rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.filename || 'Untitled image'}
                      </span>
                      <span style={{ display: 'block', fontSize: '0.74rem', opacity: 0.7 }}>
                        {item.category || 'Uncategorized'}
                      </span>
                    </label>
                  </article>
                )
              })}
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.35rem' }}>
              {media.docs.map((item) => {
                const selected = selectedIDs.has(String(item.id))

                return (
                  <div
                    key={item.id}
                    onContextMenu={(event) => {
                      event.preventDefault()
                      toggleSelection(item.id)
                    }}
                    style={{
                      alignItems: 'center',
                      background: selected ? 'var(--theme-elevation-100)' : 'transparent',
                      border: '1px solid var(--theme-elevation-200)',
                      borderRadius: 'var(--border-radius-s)',
                      display: 'grid',
                      gap: '0.75rem',
                      gridTemplateColumns: 'auto 3rem minmax(0, 1fr) minmax(8rem, 0.5fr)',
                      padding: '0.45rem',
                    }}
                  >
                    <input
                      aria-label={`Select ${item.filename || 'image'}`}
                      checked={selected}
                      onChange={() => toggleSelection(item.id)}
                      type="checkbox"
                    />
                    {item.url ? (
                      <img alt="" loading="lazy" src={item.url} style={{ height: '3rem', objectFit: 'cover', width: '3rem' }} />
                    ) : (
                      <div style={{ background: 'var(--theme-elevation-100)', height: '3rem', width: '3rem' }} />
                    )}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.filename || 'Untitled image'}</span>
                    <span>{item.category || 'Uncategorized'}</span>
                  </div>
                )
              })}
            </div>
          )}

          <div style={{ alignItems: 'center', display: 'flex', gap: '0.75rem', justifyContent: 'space-between', marginTop: 'var(--base)' }}>
            <Button buttonStyle="secondary" disabled={!media.hasPrevPage || isWorking} onClick={() => setPage((current) => current - 1)} size="small" type="button">
              Previous
            </Button>
            <span>
              Page {media.page} · {media.totalDocs} images
            </span>
            <Button buttonStyle="secondary" disabled={!media.hasNextPage || isWorking} onClick={() => setPage((current) => current + 1)} size="small" type="button">
              Next
            </Button>
          </div>
        </>
      )}
    </section>
  )
}
