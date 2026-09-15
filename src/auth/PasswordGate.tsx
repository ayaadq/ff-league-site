import { useState, type FormEvent } from 'react'
import { GATE_PASSWORD } from '../config'

export function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [value, setValue] = useState('')
  const [showError, setShowError] = useState(false)

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (value === GATE_PASSWORD) {
      onUnlock()
      return
    }
    setShowError(true)
    setValue('')
  }

  return (
    <main className="bg-marble fixed inset-0 flex items-center justify-center px-6">
      <div className="w-full max-w-sm px-10 py-12 text-center">
        <div className="bg-gold mx-auto mb-6 h-px w-16" aria-hidden="true" />

        <h1 className="font-display text-charcoal text-3xl">Trophy Room</h1>
        <p className="text-charcoal-soft mt-2 text-sm">Enter the password to continue.</p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-3" noValidate>
          <label htmlFor="gate-password" className="sr-only">
            Password
          </label>
          <input
            id="gate-password"
            name="password"
            type="password"
            autoComplete="off"
            autoFocus
            value={value}
            onChange={(event) => {
              setValue(event.target.value)
              setShowError(false)
            }}
            aria-invalid={showError}
            aria-describedby={showError ? 'gate-password-error' : undefined}
            className="border-charcoal/20 text-charcoal focus:border-gold border bg-white px-4 py-2 text-center focus:outline-none"
          />
          {showError && (
            <p id="gate-password-error" role="alert" className="text-charcoal-soft text-sm">
              Incorrect password.
            </p>
          )}
          <button
            type="submit"
            className="border-gold text-charcoal hover:bg-gold hover:text-marble mt-2 border px-4 py-2 text-sm tracking-widest uppercase transition-colors duration-300"
          >
            Enter
          </button>
        </form>

        <div className="bg-gold mx-auto mt-8 h-px w-16" aria-hidden="true" />
      </div>
    </main>
  )
}
