import { Component, type ReactNode } from 'react'

/** Catches a failed dynamic import so one missing chunk degrades instead
 * of blanking the page.
 *
 * The failure this exists for is a deploy landing while someone has the
 * site open: their tab holds the old index.html, so a lazy import asks
 * for the old chunk hash, which no longer exists. React's Suspense does
 * not help — it handles pending, not rejected — so without a boundary
 * the rejection propagates and unmounts the whole tree. A blank page for
 * every visitor who happened to be reading during a deploy.
 *
 * Rendering nothing is the right degrade here: both call sites wrap a 3D
 * canvas that sits inside a fixed-height scroll track, so the layout is
 * unchanged and the entire page still works without it. A reload picks
 * up the new index.html and the canvas returns. */
export class ChunkErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    // Worth a console line: a chunk failure is invisible otherwise, since
    // the page carries on looking fine minus its scene.
    console.warn('Scene chunk failed to load; continuing without it.', error)
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}
