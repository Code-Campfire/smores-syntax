import { useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { Alert, Box, Button, Container, TextField, Typography } from '@mui/material'
import { useForm } from 'react-hook-form'

type RegisterValues = {
  firstName: string
  lastName: string
  username?: string
  email: string
  password: string
}

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const normalizeUsername = (value: string) => {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, '.')
    .replace(/\.+/g, '.')
    .replace(/^\.|\.$/g, '')
  return cleaned || 'user'
}

function Register() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { register, handleSubmit } = useForm<RegisterValues>({
    defaultValues: { firstName: '', lastName: '', username: '', email: '', password: '' }
  })

  const onSubmit = async (values: RegisterValues) => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const fullName = `${values.firstName} ${values.lastName}`.trim()
      const emailPrefix = values.email.split('@')[0] || ''
      const usernameSeed =
        values.username?.trim() || `${values.firstName}.${values.lastName}`.trim() || emailPrefix
      const username = normalizeUsername(usernameSeed || emailPrefix)

      const response = await fetch(`${apiUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          email: values.email,
          full_name: fullName || null,
          password: values.password
        })
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        const message = data?.detail || 'Failed to register user.'
        throw new Error(message)
      }

      setSuccess('Registration completed. Redirecting to login...')
      setTimeout(() => {
        navigate('/login')
      }, 1200)
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Unknown error.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 64px)',
        background: 'radial-gradient(circle at 20% 20%, #8dbb5f 0%, #4f7a39 45%, #2b4b2a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        py: 6
      }}
    >
      <Container maxWidth="xs">
        <Box
          sx={{
            textAlign: 'center',
            color: 'white',
            fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", "Lucida Grande", Arial, sans-serif'
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.6)',
              mx: 'auto',
              mb: 2,
              display: 'grid',
              placeItems: 'center',
              fontWeight: 700
            }}
          >
            PB
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Ledgr
          </Typography>
          <Typography sx={{ mb: 4, opacity: 0.9 }}>
            Register a new account
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={handleSubmit(onSubmit)}
            sx={{
              display: 'grid',
              gap: 2,
              alignItems: 'center',
              justifyItems: 'center'
            }}
          >
            <TextField
              label="First Name"
              type="text"
              placeholder="Example: John"
              InputLabelProps={{ shrink: true, sx: { color: 'black', fontWeight: 700 } }}
              {...register('firstName', { required: true })}
              sx={{
                width: '100%',
                backgroundColor: '#e0e0e0',
                borderRadius: 1,
                '& .MuiInputBase-input': { color: '#1b1b1b' }
              }}
            />
            <TextField
              label="Last Name"
              type="text"
              placeholder="Example: Doe"
              InputLabelProps={{ shrink: true, sx: { color: 'black', fontWeight: 700 } }}
              {...register('lastName', { required: true })}
              sx={{
                width: '100%',
                backgroundColor: '#e0e0e0',
                borderRadius: 1,
                '& .MuiInputBase-input': { color: '#1b1b1b' }
              }}
            />
            <TextField
              label="Username (optional)"
              type="text"
              placeholder="Example: john.doe"
              InputLabelProps={{ shrink: true, sx: { color: 'black', fontWeight: 700 } }}
              {...register('username')}
              sx={{
                width: '100%',
                backgroundColor: '#e0e0e0',
                borderRadius: 1,
                '& .MuiInputBase-input': { color: '#1b1b1b' }
              }}
            />
            <TextField
              label="Email"
              type="email"
              placeholder="Example: example@email.com"
              InputLabelProps={{ shrink: true, sx: { color: 'black', fontWeight: 700 } }}
              {...register('email', { required: true })}
              sx={{
                width: '100%',
                backgroundColor: '#e0e0e0',
                borderRadius: 1,
                '& .MuiInputBase-input': { color: '#1b1b1b' }
              }}
            />
            <TextField
              label="Password"
              type="password"
              placeholder="Enter your password"
              InputLabelProps={{ shrink: true, sx: { color: 'black', fontWeight: 700 } }}
              {...register('password', { required: true, minLength: 8 })}
              sx={{
                width: '100%',
                backgroundColor: '#e0e0e0',
                borderRadius: 1,
                '& .MuiInputBase-input': { color: '#1b1b1b' }
              }}
            />
            <Button
              type="submit"
              variant="contained"
              disabled={isLoading}
              sx={{
                mt: 1,
                px: 4,
                borderRadius: 999,
                backgroundColor: 'primary.main',
                '&:hover': { backgroundColor: '#5a5a5a' }
              }}
            >
              Register
            </Button>
          </Box>

          <Typography sx={{ mt: 3, fontStyle: 'italic' }}>
            Already have an account?{' '}
            <Button
              component={RouterLink}
              to="/login"
              size="small"
              sx={{ ml: 1, textDecoration: 'underline', color: 'white' }}
            >
              Sign In
            </Button>
          </Typography>
        </Box>
      </Container>
    </Box>
  )
}

export default Register
