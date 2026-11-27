import { useEffect, useRef, type RefObject } from 'react'
import { basicSetup, EditorView } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { python } from '@codemirror/lang-python'
import { javascript } from '@codemirror/lang-javascript'
import { cpp } from '@codemirror/lang-cpp'
import type { CodeLang } from './academyApi'

export type EditorApi = { insert(text: string): void }

const theme = EditorView.theme({
  '&': { fontSize: '16px', borderRadius: '14px', backgroundColor: '#1f2433', color: '#f4f1ea' }, // 16px stops phones zooming in
  '.cm-content': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace', padding: '10px 0', caretColor: '#ffcf4d' },
  '.cm-gutters': { backgroundColor: '#181c28', color: '#8a8fa3', border: 'none', borderRadius: '14px 0 0 14px' },
  '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: '#2a3043' },
  '&.cm-focused': { outline: '3px solid #ffcf4d' },
  '.cm-cursor': { borderLeftColor: '#ffcf4d', borderLeftWidth: '2px' },
})

/** CodeMirror 6 with coloured code. Loaded only with the lesson page, never with the first page. */
export default function CodeEditor({ value, onChange, language, readOnly = false, label, apiRef }: { value: string; onChange?: (v: string) => void; language: CodeLang; readOnly?: boolean; label: string; apiRef?: RefObject<EditorApi | null> }) {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)
  const change = useRef(onChange)
  change.current = onChange

  useEffect(() => {
    const v = new EditorView({
      parent: host.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          basicSetup,
          language === 'python' ? python() : language === 'cpp' ? cpp() : javascript(),
          theme,
          EditorView.lineWrapping,
          EditorState.readOnly.of(readOnly),
          EditorView.editable.of(!readOnly),
          EditorView.contentAttributes.of({ 'aria-label': label, autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false' }),
          EditorView.updateListener.of((u) => u.docChanged && change.current?.(u.state.doc.toString())),
        ],
      }),
    })
    view.current = v
    if (apiRef)
      apiRef.current = {
        insert(text) {
          v.dispatch(v.state.replaceSelection(text))
          v.focus()
        },
      }
    return () => {
      v.destroy()
      view.current = null
    }
    // The editor is created once per step; outside changes to `value` are synced below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, readOnly, label])

  useEffect(() => {
    const v = view.current
    if (v && v.state.doc.toString() !== value) v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: value } })
  }, [value])

  return <div ref={host} className="min-h-24 overflow-hidden rounded-[14px] border-[3px] border-wood-dark" />
}
