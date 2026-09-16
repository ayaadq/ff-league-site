/** A slow band of display type travelling across the page, used to break
 * up the run of data sections (the reference site's repeated statement
 * lines).
 *
 * The content is rendered twice inside a track that translates by exactly
 * -50%: when the first copy has fully exited, the second sits precisely
 * where the first began, so the wrap is invisible and the loop needs no
 * measurement or JS. The duplicate is aria-hidden — a screen reader
 * should hear the phrase once, not twice.
 *
 * Gold is used at display size here, which SPEC.md §5.1 allows (it bans
 * gold for text below 24px and for anything that must be read); this is
 * decorative, well above that threshold, and the page never depends on
 * it being legible. */
export function Marquee({ text, className = '' }: { text: string; className?: string }) {
  const copy = (
    <span className="flex shrink-0 items-center">
      {[0, 1, 2].map((i) => (
        <span key={i} className="flex items-center">
          <span className="font-display text-gold-bright/70 px-8 text-4xl whitespace-nowrap sm:text-5xl">
            {text}
          </span>
          <span
            aria-hidden="true"
            className="bg-gold-bright/40 h-1.5 w-1.5 shrink-0 rounded-full"
          />
        </span>
      ))}
    </span>
  )

  return (
    <div className={`relative overflow-hidden py-10 ${className}`}>
      {/* The phrase reaches a screen reader exactly once. The visible
          track repeats it six times — three to fill the width, doubled
          again for the loop — which is right for the eye and absurd for
          the ear, so the whole track is hidden from the a11y tree and
          this carries the content instead. */}
      <span className="sr-only">{text}</span>
      <div aria-hidden="true" className="animate-marquee flex w-max">
        {copy}
        {copy}
      </div>
      {/* Feather both ends into the marble so the type emerges and exits
          rather than being sliced off at the viewport edge. */}
      <div
        aria-hidden="true"
        className="from-marble pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r to-transparent sm:w-28"
      />
      <div
        aria-hidden="true"
        className="from-marble pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l to-transparent sm:w-28"
      />
    </div>
  )
}
