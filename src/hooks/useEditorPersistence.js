
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  getEditorState,
  saveEditorState,
  copyEditorItems,
} from '../services/editorStateService'

// =====================================================
// CONFIGURATION
// =====================================================

const SAVE_DELAY = 800
const CACHE_PREFIX = 'philgeps-editor-draft-v2:'

const SECTIONS = [
  'technical_specs',
  'schedule_requirements',
  'bid_security',
  'omnibus',
  'contents',
  'editor_status',
]

// =====================================================
// HELPERS
// =====================================================

function isObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  )
}

// Remove itemNo because it is only used by the UI.
// Item numbers are calculated from array positions.

function removeItemNo(value) {
  if (Array.isArray(value)) {
    return value.map(removeItemNo)
  }

  if (!isObject(value)) {
    return value
  }

  const result = {}

  for (const [key, child] of Object.entries(value)) {
    if (key !== 'itemNo') {
      result[key] = removeItemNo(child)
    }
  }

  return result
}

function cleanSection(section, value) {
  return section === 'technical_specs'
    ? removeItemNo(value)
    : value
}

function cleanPatch(patch) {
  if (!isObject(patch)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(patch).map(([key, value]) => [
      key,
      cleanSection(key, value),
    ])
  )
}

function containsItemNo(value) {
  if (Array.isArray(value)) {
    return value.some(containsItemNo)
  }

  if (!isObject(value)) {
    return false
  }

  return Object.entries(value).some(
    ([key, child]) =>
      key === 'itemNo' || containsItemNo(child)
  )
}

// =====================================================
// LOCAL BACKUP
// =====================================================

function keyFor(projectId) {
  return `${CACHE_PREFIX}${projectId}`
}

function readLocal(projectId) {
  try {
    const raw = localStorage.getItem(
      keyFor(projectId)
    )

    if (!raw) {
      return null
    }

    const data = JSON.parse(raw)

    if (!isObject(data)) {
      return null
    }

    return {
      values: cleanPatch(data.values),
      pending: cleanPatch(data.pending),
    }
  } catch (error) {
    console.warn(
      'Cannot read local editor draft:',
      error
    )

    return null
  }
}

function writeLocal(ctx) {
  try {
    localStorage.setItem(
      keyFor(ctx.id),
      JSON.stringify({
        version: 4,

        values: cleanPatch(ctx.values),

        pending: cleanPatch({
          ...(ctx.savingPatch || {}),
          ...ctx.pending,
        }),

        updatedAt: new Date().toISOString(),
      })
    )
  } catch (error) {
    console.warn(
      'Cannot back up editor draft:',
      error
    )
  }
}

// =====================================================
// MAIN HOOK
// =====================================================

export default function useEditorPersistence(
  projectId,
  hydrate
) {
  // Prevent React Compiler from trying to
  // optimize this manually memoized hook.
  'use no memo'

  const [ready, setReady] = useState(false)

  const [loadError, setLoadError] =
    useState('')

  const [saveError, setSaveError] =
    useState('')

  const [status, setStatus] =
    useState('Loading...')

  const [
    sectionStatuses,
    setSectionStatuses,
  ] = useState({})

  const ctxRef = useRef(null)
  const hydrateRef = useRef(hydrate)

  useEffect(() => {
    hydrateRef.current = hydrate
  }, [hydrate])

  // ===================================================
  // SAVE TO SUPABASE
  // ===================================================

  const flush = useCallback(async () => {
    const ctx = ctxRef.current

    if (!ctx?.loaded) {
      return
    }

    clearTimeout(ctx.timer)
    ctx.timer = null

    // Do not run two save requests simultaneously.
    if (ctx.flight) {
      return ctx.flight
    }

    if (!Object.keys(ctx.pending).length) {
      return
    }

    const task = (async () => {
      while (Object.keys(ctx.pending).length) {
        const patch = cleanPatch(ctx.pending)

        ctx.pending = {}
        ctx.savingPatch = patch

        writeLocal(ctx)

        if (ctx.alive) {
          setStatus('Saving...')
          setSaveError('')

          setSectionStatuses((old) => ({
            ...old,
            ...Object.fromEntries(
              Object.keys(patch).map((key) => [
                key,
                'Saving...',
              ])
            ),
          }))
        }

        try {
          await saveEditorState(ctx.id, patch)
        } catch (error) {
          ctx.pending = cleanPatch({
            ...patch,
            ...ctx.pending,
          })

          ctx.savingPatch = null

          writeLocal(ctx)

          if (ctx.alive) {
            setStatus('Error saving')

            setSaveError(
              error?.message ||
                'Supabase save failed.'
            )

            setSectionStatuses((old) => ({
              ...old,
              ...Object.fromEntries(
                Object.keys(patch).map((key) => [
                  key,
                  'Error saving',
                ])
              ),
            }))
          }

          throw error
        }

        // Successfully saved.
        ctx.savingPatch = null

        writeLocal(ctx)

        if (ctx.alive) {
          setSaveError('')

          setSectionStatuses((old) => ({
            ...old,
            ...Object.fromEntries(
              Object.keys(patch).map((key) => [
                key,
                Object.hasOwn(ctx.pending, key)
                  ? 'Unsaved'
                  : 'Saved',
              ])
            ),
          }))
        }
      }

      if (ctx.alive) {
        setStatus('Saved')
      }
    })()

    ctx.flight = task

    try {
      await task
    } finally {
      if (ctx.flight === task) {
        ctx.flight = null
      }
    }
  }, [])

  // ===================================================
  // AUTO-SAVE TIMER
  // ===================================================

  const queueSave = useCallback(
    (ctx) => {
      if (!ctx.loaded || !ctx.alive) {
        return
      }

      clearTimeout(ctx.timer)

      ctx.timer = setTimeout(() => {
        ctx.timer = null

        if (ctxRef.current !== ctx) {
          return
        }

        void flush().catch((error) => {
          console.error(
            'Automatic save failed:',
            error
          )
        })
      }, SAVE_DELAY)
    },
    [flush]
  )

  // ===================================================
  // UPDATE EDITOR VALUES
  // ===================================================

  const change = useCallback(
    (section, value) => {
      const ctx = ctxRef.current

      if (!ctx?.loaded || !section) {
        return false
      }

      let copied

      try {
        if (section === 'technical_specs') {
          if (!Array.isArray(value)) {
            throw new Error(
              'Technical specifications must be an array.'
            )
          }

          // Preserve specifications, lines,
          // quantity, unit and compliance.
          // Remove invalid itemNo fields.

          copied = removeItemNo(
            JSON.parse(JSON.stringify(value))
          )
        } else {
          copied = copyEditorItems(
            value,
            section
          )
        }
      } catch (error) {
        setStatus('Error saving')

        setSaveError(
          error?.message ||
            'Invalid editor input.'
        )

        return false
      }

      ctx.values = {
        ...ctx.values,
        [section]: copied,
      }

      ctx.pending = {
        ...ctx.pending,
        [section]: copied,
      }

      // Back up locally immediately.
      writeLocal(ctx)

      setStatus('Unsaved')
      setSaveError('')

      setSectionStatuses((old) => ({
        ...old,
        [section]: 'Unsaved',
      }))

      queueSave(ctx)

      return true
    },
    [queueSave]
  )

  // ===================================================
  // MANUAL SAVE
  // ===================================================

  const save = useCallback(
    async (section, value) => {
      if (
        section !== undefined &&
        !change(section, value)
      ) {
        throw new Error(
          'Could not prepare editor input for saving.'
        )
      }

      await flush()
    },
    [change, flush]
  )

  // ===================================================
  // LOAD SAVED DATA
  // ===================================================

  useEffect(() => {
    const ctx = {
      id: String(projectId ?? ''),

      alive: true,
      loaded: false,

      values: {},
      pending: {},
      savingPatch: null,

      timer: null,
      flight: null,
    }

    ctxRef.current = ctx

    async function initialize() {
      await Promise.resolve()

      if (!ctx.alive) {
        return
      }

      setReady(false)
      setLoadError('')
      setSaveError('')
      setStatus('Loading...')

      if (!ctx.id) {
        setLoadError('Missing project ID.')
        setStatus('Load failed')
        return
      }

      // Retrieve local draft.
      const backup = readLocal(ctx.id)

      let remote = null
      let remoteError = null

      try {
        remote = await getEditorState(ctx.id)
      } catch (error) {
        remoteError = error
      }

      if (
        !ctx.alive ||
        ctxRef.current !== ctx
      ) {
        return
      }

      if (remoteError && !backup) {
        setLoadError(
          remoteError.message ||
            'Unable to load project.'
        )

        setStatus('Load failed')
        return
      }

      const remoteValues = isObject(remote)
        ? cleanPatch(remote)
        : {}

      const noRemote =
        !remote || !!remoteError

      const backupValues =
        backup?.values || {}

      const pending = {
        ...(backup?.pending || {}),
      }

      // Recover unsynced data if remote is
      // empty or temporarily unavailable.

      if (noRemote) {
        for (
          const [key, value] of
          Object.entries(backupValues)
        ) {
          if (!Object.hasOwn(pending, key)) {
            pending[key] = value
          }
        }
      } else if (
        remote?.technical_specs &&
        containsItemNo(
          remote.technical_specs
        ) &&
        !Object.hasOwn(
          pending,
          'technical_specs'
        )
      ) {
        // Migrate old technical specifications
        // containing unsupported itemNo.

        pending.technical_specs =
          remoteValues.technical_specs
      }

      ctx.values = cleanPatch({
        ...remoteValues,

        ...(noRemote
          ? backupValues
          : {}),

        ...pending,
      })

      ctx.pending = cleanPatch(pending)
      ctx.loaded = true

      writeLocal(ctx)

      // Restore saved values into the UI.
      try {
        hydrateRef.current?.(ctx.values)
      } catch (error) {
        ctx.loaded = false

        setLoadError(
          error?.message ||
            'Unable to restore inputs.'
        )

        setStatus('Load failed')
        return
      }

      setReady(true)

      setSectionStatuses(
        Object.fromEntries(
          SECTIONS.map((key) => [
            key,

            Object.hasOwn(
              ctx.pending,
              key
            )
              ? 'Unsaved'
              : ctx.values[key] != null
                ? 'Saved'
                : 'Unsaved',
          ])
        )
      )

      if (remoteError) {
        setStatus('Error saving')

        setSaveError(
          remoteError.message ||
            'Supabase unavailable.'
        )
      } else {
        setStatus(
          Object.keys(ctx.pending).length
            ? 'Unsaved'
            : remote
              ? 'Saved'
              : 'Unsaved'
        )

        if (
          Object.keys(ctx.pending).length
        ) {
          queueSave(ctx)
        }
      }
    }

    void initialize()

    return () => {
      ctx.alive = false

      clearTimeout(ctx.timer)

      if (ctx.loaded) {
        writeLocal(ctx)
      }
    }
  }, [projectId, queueSave])

  // ===================================================
  // BROWSER EVENTS
  // ===================================================

  useEffect(() => {
    function onOnline() {
      const ctx = ctxRef.current

      if (
        ctx?.loaded &&
        Object.keys(ctx.pending).length
      ) {
        void flush().catch(() => {})
      }
    }

    function onHidden() {
      if (
        document.visibilityState !==
        'hidden'
      ) {
        return
      }

      const ctx = ctxRef.current

      if (!ctx) {
        return
      }

      writeLocal(ctx)

      if (ctx.loaded) {
        void flush().catch(() => {})
      }
    }

    function onUnload(event) {
      const ctx = ctxRef.current

      if (!ctx) {
        return
      }

      writeLocal(ctx)

      if (
        Object.keys(ctx.pending).length ||
        ctx.savingPatch
      ) {
        event.preventDefault()
        event.returnValue = ''
      }
    }

    window.addEventListener(
      'online',
      onOnline
    )

    document.addEventListener(
      'visibilitychange',
      onHidden
    )

    window.addEventListener(
      'beforeunload',
      onUnload
    )

    return () => {
      window.removeEventListener(
        'online',
        onOnline
      )

      document.removeEventListener(
        'visibilitychange',
        onHidden
      )

      window.removeEventListener(
        'beforeunload',
        onUnload
      )
    }
  }, [flush])

  // ===================================================
  // EXISTING API
  // ===================================================

  return {
    ready,
    loadError,
    status,
    sectionStatuses,
    saveError,
    change,
    save,
    retry: flush,
  }
}
