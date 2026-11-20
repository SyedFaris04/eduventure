import { useEffect } from 'react'
import { useGame } from '../../game/store'
import { BoardPanel } from './BoardPanel'

// ?place=qa_camp opens that board (the hidden QA board is always built).
const place = new URLSearchParams(location.search).get('place') ?? undefined

/** Development-only (/dev/board): a camp board for the signed-in player without walking to it (end-to-end tests). */
export default function BoardLab() {
  useEffect(() => useGame.setState({ board: true }), [])
  return (
    <main className="fixed inset-0 bg-[#5fb3d9]">
      <BoardPanel place={place} />
    </main>
  )
}
