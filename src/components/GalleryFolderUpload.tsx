'use client'

import { Button, useBulkUpload, useField, useModal } from '@payloadcms/ui'
import type { UIFieldClientComponent } from 'payload'
import { useEffect, useRef, useState } from 'react'

type UploadStatus = 'idle' | 'ready' | 'complete' | 'empty'

export const GalleryFolderUpload: UIFieldClientComponent = () => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [selection, setSelection] = useState<{ count: number; folderName: string }>()
  const [status, setStatus] = useState<UploadStatus>('idle')
  const { setValue, value } = useField<(number | string | { id?: number | string })[]>({ path: 'photos' })
  const {
    drawerSlug,
    setCollectionSlug,
    setInitialFiles,
    setMaxFiles,
    setOnSuccess,
    setSelectableCollections,
    successfullyUploaded,
  } = useBulkUpload()
  const { openModal } = useModal()

  useEffect(() => {
    inputRef.current?.setAttribute('webkitdirectory', '')
  }, [])

  useEffect(() => {
    if (successfullyUploaded && selection) setStatus('complete')
  }, [selection, successfullyUploaded])

  return (
    <div>
      <input
        accept="image/*"
        hidden
        multiple
        onChange={(event) => {
          const files = event.currentTarget.files

          if (!files?.length) return

          const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'))

          if (!imageFiles.length) {
            setStatus('empty')
            event.currentTarget.value = ''
            return
          }

          const uploadFiles = new DataTransfer()
          imageFiles.forEach((file) => uploadFiles.items.add(file))
          const folderName = imageFiles[0].webkitRelativePath.split('/')[0] || 'Selected folder'
          const existingPhotoIDs = Array.isArray(value)
            ? value
                .map((item) => {
                  if (typeof item === 'object' && item && 'id' in item) return item.id

                  return item
                })
                .filter((item): item is number | string => Boolean(item))
            : []

          setOnSuccess((uploadedForms) => {
            const uploadedPhotoIDs = uploadedForms.map((form) => form.doc.id as number | string)
            const mergedPhotoIDs = Array.from(new Set([...existingPhotoIDs, ...uploadedPhotoIDs]))

            setValue(mergedPhotoIDs)
          })

          setCollectionSlug('media')
          setInitialFiles(uploadFiles.files)
          setMaxFiles(0)
          setSelectableCollections(null)
          setSelection({ count: imageFiles.length, folderName })
          setStatus('ready')
          openModal(drawerSlug)
          event.currentTarget.value = ''
        }}
        ref={inputRef}
        type="file"
      />
      <Button buttonStyle="secondary" onClick={() => inputRef.current?.click()} size="small" type="button">
        Upload image folder
      </Button>
      {status === 'ready' && selection && (
        <p role="status">
          <strong>{selection.count} images selected from {selection.folderName}.</strong> Ready for review in
          the upload panel. Uploading starts when you save there.
        </p>
      )}
      {status === 'complete' && selection && (
        <p role="status">
          <strong>{selection.count} images uploaded.</strong> They have been added to this gallery.
        </p>
      )}
      {status === 'empty' && <p role="status">That folder does not contain any supported image files.</p>}
      {status === 'idle' && <p>Choose a folder to add all of its images to this gallery.</p>}
    </div>
  )
}
