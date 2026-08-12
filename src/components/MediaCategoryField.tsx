'use client'

import { useField } from '@payloadcms/ui'
import type { TextFieldClientComponent } from 'payload'
import { useEffect, useState } from 'react'

type CategoryResponse = {
  docs: { id: number | string; name: string }[]
}

export const MediaCategoryField: TextFieldClientComponent = ({ field, path }) => {
  const { setValue, value } = useField<string>({ path })
  const [categories, setCategories] = useState<CategoryResponse['docs']>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch('/api/categories?depth=0&limit=1000&sort=name', {
          credentials: 'same-origin',
        })

        if (!response.ok) return

        const result = (await response.json()) as CategoryResponse
        setCategories(result.docs)
      } finally {
        setIsLoading(false)
      }
    }

    void loadCategories()
  }, [])

  return (
    <div className="field-type text">
      <label className="field-label" htmlFor={path}>
        {typeof field.label === 'string' ? field.label : 'Category'}
      </label>
      <select
        disabled={isLoading || categories.length === 0}
        id={path}
        onChange={(event) => setValue(event.target.value)}
        value={value || ''}
      >
        <option value="">Uncategorized</option>
        {categories.map((category) => (
          <option key={category.id} value={category.name}>
            {category.name}
          </option>
        ))}
      </select>
      {isLoading ? (
        <p className="field-description">Loading categories…</p>
      ) : categories.length ? (
        <p className="field-description">
          Only categories created in Categories can be assigned.{' '}
          <a href="/admin/collections/categories">Manage categories</a>
        </p>
      ) : (
        <p className="field-description">
          <a href="/admin/collections/categories/create">Create a category</a> before assigning this image.
        </p>
      )}
    </div>
  )
}
