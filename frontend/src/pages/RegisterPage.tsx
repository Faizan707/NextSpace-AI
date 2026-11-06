import { useState } from 'react'
import type { FormEvent } from 'react'
import { FiHome, FiUser } from 'react-icons/fi'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { CountrySelect, type CountryOption } from '../components/CountrySelect'
import { Alert, AuthCard, Button, Input } from '../components/ui'
import { useAuthStore } from '../stores/authStore'

function UserIcon() {
  return <FiUser size={20} aria-hidden />
}

function BuildingIcon() {
  return <FiHome size={20} aria-hidden />
}

export function RegisterPage() {
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)
  const loading = useAuthStore((s) => s.loading)
  const error = useAuthStore((s) => s.error)
  const register = useAuthStore((s) => s.register)
  const clearError = useAuthStore((s) => s.clearError)

  const [step, setStep] = useState<1 | 2>(1)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [employeeCount, setEmployeeCount] = useState(10)
  const [city, setCity] = useState('')
  const [country, setCountry] = useState<CountryOption | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  if (token) return <Navigate to="/app" replace />

  function goNext(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    clearError()
    setStep(2)
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    clearError()
    setFormError(null)

    if (!country) {
      setFormError('Please select a country')
      return
    }

    const fullName = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ')
    const location = city.trim() ? `${city.trim()}, ${country.label}` : country.label

    try {
      await register({
        email,
        password,
        full_name: fullName || undefined,
        company: {
          name: companyName,
          employee_count: employeeCount,
          location,
        },
      })
      navigate('/app')
    } catch {
      /* store holds message */
    }
  }

  return (
    <AuthCard
      wide
      icon={step === 1 ? <UserIcon /> : <BuildingIcon />}
      title={step === 1 ? 'Personal Details' : 'Company Details'}
      subtitle={
        step === 1
          ? 'Tell us about yourself so we can personalize your experience'
          : 'Set up your company workspace and location'
      }
      footer={
        <>
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-accent">
            Sign in
          </Link>
        </>
      }
    >
      <div className="mb-5 flex gap-2">
        {[1, 2].map((n) => (
          <span
            key={n}
            className={
              n <= step
                ? 'h-1.5 flex-1 rounded-full bg-accent'
                : 'h-1.5 flex-1 rounded-full bg-line'
            }
          />
        ))}
      </div>

      {error || formError ? <Alert className="mb-4">{error || formError || ''}</Alert> : null}

      {step === 1 ? (
        <form className="grid gap-4" onSubmit={goNext}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="first-name"
              name="given-name"
              label="First Name"
              autoComplete="given-name"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="John"
            />
            <Input
              id="last-name"
              name="family-name"
              label="Last Name"
              autoComplete="family-name"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Doe"
            />
          </div>
          <Input
            id="email"
            name="email"
            type="email"
            label="Email"
            autoComplete="username"
            spellCheck={false}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
          <Input
            id="new-password"
            name="password"
            type="password"
            label="Password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
          <div className="mt-2 grid grid-cols-[1fr_1.35fr] gap-3">
            <Button type="button" variant="secondary" disabled>
              ← Back
            </Button>
            <Button type="submit">Continue</Button>
          </div>
        </form>
      ) : (
        <form className="grid gap-4" onSubmit={onSubmit}>
          <Input
            id="company-name"
            name="organization"
            label="Company Name"
            autoComplete="organization"
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="NextSpace Labs"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="employee-count"
              name="employee_count"
              type="number"
              label="Team Size"
              min={1}
              required
              value={employeeCount}
              onChange={(e) => setEmployeeCount(Number(e.target.value))}
            />
            <Input
              id="city"
              name="address-level2"
              label="City / Area"
              autoComplete="address-level2"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Karachi"
            />
          </div>
          <CountrySelect value={country} onChange={setCountry} required />
          <div className="mt-2 grid grid-cols-[1fr_1.35fr] gap-3">
            <Button type="button" variant="secondary" onClick={() => setStep(1)}>
              ← Back
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating…' : 'Create workspace'}
            </Button>
          </div>
        </form>
      )}
    </AuthCard>
  )
}
