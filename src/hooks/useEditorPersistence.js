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

const persistedSections = [
  'technical_specs',
  'schedule_requirements',
  'bid_security',
  'omnibus',
]

export default function useEditorPersistence(
  projectId,
  hydrate,
) {
  const [ready, setReady] =
    useState(false)

  const [
    loadError,
    setLoadError,
  ] = useState('')

  const [
    sectionStatuses,
    setSectionStatuses,
  ] = useState({})

  const [status, setStatus] =
    useState('Unsaved')

  const [
    saveError,
    setSaveError,
  ] = useState('')

  const state = useRef({
    pending: {},
    timer: null,
    flight: null,
    alive: false,
    loaded: false,
  })

  const hydrateRef =
    useRef(hydrate)

  useEffect(() => {
    hydrateRef.current = hydrate
  }, [hydrate])

  useEffect(() => {
    const current =
      state.current

    current.alive = true

    let cancelled = false

    getEditorState(projectId)
      .then((data) => {
        if (cancelled) return

        hydrateRef.current(data)

        current.loaded = true

        setReady(true)

        setStatus(
          data
            ? 'Saved'
            : 'Unsaved',
        )

        setSectionStatuses(
          Object.fromEntries(
            persistedSections.map((key) => [
              key,
              data?.[key] != null
                ? 'Saved'
                : 'Unsaved',
            ]),
          ),
        )
      })
      .catch((error) => {
        console.error(
          'Editor state load failed',
          error,
        )

        if (!cancelled) {
          setLoadError(
            error.message ||
              'Unable to load editor state.',
          )
        }
      })

    return () => {
      cancelled = true
      current.alive = false

      clearTimeout(
        current.timer,
      )
    }
  }, [projectId])

  const flush =
    useCallback(async () => {
      const current =
        state.current

      clearTimeout(
        current.timer,
      )

      if (!current.loaded) {
        throw new Error(
          'Editor state has not loaded.',
        )
      }

      while (current.flight) {
        await current.flight
      }

      if (
        !Object.keys(
          current.pending,
        ).length
      ) {
        return
      }

      const patch =
        current.pending

      current.pending = {}

      if (current.alive) {
        setStatus('Saving...')
        setSaveError('')

        setSectionStatuses(
          (previous) => ({
            ...previous,
            ...Object.fromEntries(
              Object.keys(patch).map((key) => [
                key,
                'Saving...',
              ]),
            ),
          }),
        )
      }

      current.flight =
        saveEditorState(
          projectId,
          patch,
        )

      try {
        await current.flight

        if (current.alive) {
          setStatus(
            Object.keys(
              current.pending,
            ).length
              ? 'Unsaved'
              : 'Saved',
          )

          setSectionStatuses(
            (previous) => ({
              ...previous,
              ...Object.fromEntries(
                Object.keys(patch).map((key) => [
                  key,
                  Object.hasOwn(
                    current.pending,
                    key,
                  )
                    ? 'Unsaved'
                    : 'Saved',
                ]),
              ),
            }),
          )
        }
      } catch (error) {
        current.pending = {
          ...patch,
          ...current.pending,
        }

        clearTimeout(
          current.timer,
        )

        console.error(
          'Editor state save failed',
          error,
        )

        if (current.alive) {
          setStatus(
            'Error saving',
          )

          setSectionStatuses(
            (previous) => ({
              ...previous,
              ...Object.fromEntries(
                Object.keys(patch).map((key) => [
                  key,
                  'Error saving',
                ]),
              ),
            }),
          )

          setSaveError(
            error.message ||
              'Unable to save editor state.',
          )
        }

        throw error
      } finally {
        current.flight = null
      }
    }, [projectId])

  const change =
    useCallback(
      (
        section,
        value,
      ) => {
        const current =
          state.current

        if (!current.loaded) {
          return
        }

        current.pending[
          section
        ] = copyEditorItems(
          value,
          section,
        )

        setStatus(
          'Unsaved',
        )

        setSectionStatuses(
          (previous) => ({
            ...previous,
            [section]:
              'Unsaved',
          }),
        )

        setSaveError('')

        clearTimeout(
          current.timer,
        )

        current.timer =
          setTimeout(() => {
            flush().catch(
              () => {},
            )
          }, 1000)
      },
      [flush],
    )

  const save =
    useCallback(
      (
        section,
        value,
      ) => {
        change(
          section,
          value,
        )

        return flush()
      },
      [change, flush],
    )

  useEffect(() => {
    const beforeUnload = (
      event,
    ) => {
      if (
        Object.keys(
          state.current.pending,
        ).length ||
        state.current.flight
      ) {
        event.preventDefault()
        event.returnValue =
          ''
      }
    }

    window.addEventListener(
      'beforeunload',
      beforeUnload,
    )

    return () =>
      window.removeEventListener(
        'beforeunload',
        beforeUnload,
      )
  }, [])

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