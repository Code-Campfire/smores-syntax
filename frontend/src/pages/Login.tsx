import { useContext, useState } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { Alert, Box, Button, Container, TextField, Typography } from '@mui/material'
import { useForm } from 'react-hook-form'
import { ThemeContext } from '../contexts/ThemeContext'

type LoginValues = {
  email: string
  password: string
}

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function Login() {
  const navigate = useNavigate()
  const { setTheme } = useContext(ThemeContext)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { register, handleSubmit } = useForm<LoginValues>({
    defaultValues: { email: '', password: '' }
  })

  const onSubmit = async (values: LoginValues) => {
    setIsLoading(true)
    setError(null)
    try {
      const body = new URLSearchParams()
      body.set('username', values.email)
      body.set('password', values.password)

      const response = await fetch(`${apiUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        const message = data?.detail || 'Invalid credentials.'
        throw new Error(message)
      }

      const data = (await response.json()) as { access_token: string; token_type: string }
      localStorage.setItem('access_token', data.access_token)
      try {
        const profileResponse = await fetch(`${apiUrl}/api/v1/users/me`, {
          headers: { Authorization: `Bearer ${data.access_token}` }
        })
        if (profileResponse.ok) {
          const profile = (await profileResponse.json()) as { theme?: 'light' | 'dark' }
          if (profile.theme === 'dark' || profile.theme === 'light') {
            setTheme(profile.theme)
          }
        }
      } catch {
        // ignore theme sync failures
      }
      navigate('/profile')
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
            Sign In
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
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
              label="Email"
              type="email"
              placeholder="Email"
              InputLabelProps={{ shrink: true, sx: { color: 'black', fontWeight: 700 } }}
              {...register('email', { required: true })}
              sx={{
                width: 220,
                backgroundColor: '#e0e0e0',
                borderRadius: 1,
                '& .MuiInputBase-input': { color: '#1b1b1b' }
              }}
            />
            <TextField
              label="Password"
              type="password"
              placeholder="Password"
              InputLabelProps={{ shrink: true, sx: { color: 'black', fontWeight: 700 } }}
              {...register('password', { required: true })}
              sx={{
                width: 220,
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
              Sign In
            </Button>
          </Box>

          <Typography sx={{ mt: 2, fontSize: '0.9rem' }}>
            <Button
              component={RouterLink}
              to="/forgot-password"
              size="small"
              sx={{ textDecoration: 'underline', color: 'white' }}
            >
              Forgot Password?
            </Button>
          </Typography>

          <Typography sx={{ mt: 3, fontStyle: 'italic' }}>
            Not a User?{' '}
            <Button
              component={RouterLink}
              to="/register"
              size="small"
              sx={{ ml: 1, textDecoration: 'underline', color: 'white' }}
            >
              Register Here!
            </Button>
          </Typography>
        </Box>
      </Container>
    </Box>
  )
}

export default Login
