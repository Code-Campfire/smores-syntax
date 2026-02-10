import { useEffect, useMemo, useState } from 'react'
import { Link as RouterLink, Route, Routes, useNavigate } from 'react-router-dom'
import { AppBar, Box, Button, Container, CssBaseline, Toolbar, Typography } from '@mui/material'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Profile from './pages/Profile'
import Register from './pages/Register'
import { ThemeContext } from './contexts/ThemeContext'

function Home() {
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const checkApi = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
        const response = await fetch(`${apiUrl}/health`)
        if (response.ok) {
          setIsConnected(true)
        } else {
          setIsConnected(false)
        }
      } catch (err) {
        setIsConnected(false)
      }
    }

    checkApi()
  }, [])

  return (
    <Box
      sx={{
        background: 'linear-gradient(180deg, #449454 0%, #3a7b46 45%, #2f5f37 100%)',
        color: 'white'
      }}
    >
      <Container maxWidth="md" sx={{ py: 6, textAlign: 'center' }}>
        <Typography
          variant="h3"
          sx={{
            fontWeight: 700,
            letterSpacing: 0.5,
            fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", "Lucida Grande", Arial, sans-serif'
          }}
        >
          Personal Budget Analyst
        </Typography>
        <Typography
          sx={{
            mt: 1,
            fontStyle: 'italic',
            fontSize: '1.1rem',
            color: 'rgba(255,255,255,0.85)'
          }}
        >
          One Small Step for Your Finances
          <br />
          One Giant Leap for your Freedom
        </Typography>

        <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            component={RouterLink}
            to="/login"
            variant="contained"
            sx={{
              px: 4,
              borderRadius: 999,
              backgroundColor: '#6d6d6d',
              '&:hover': { backgroundColor: '#5a5a5a' }
            }}
          >
            Sign In
          </Button>
          <Button
            component={RouterLink}
            to="/register"
            variant="contained"
            sx={{
              px: 4,
              borderRadius: 999,
              backgroundColor: '#6d6d6d',
              '&:hover': { backgroundColor: '#5a5a5a' }
            }}
          >
            Register Account
          </Button>
        </Box>
      </Container>

      <Box sx={{ backgroundColor: 'rgba(0,0,0,0.15)', py: 1.5 }}>
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'flex',
              gap: 2,
              justifyContent: 'center',
              flexWrap: 'wrap',
              fontSize: '0.85rem'
            }}
          >
            <Box component="span">Transaction Overviews</Box>
            <Box component="span">Spending Trends</Box>
            <Box component="span">Bill Payment Tracking</Box>
            <Box component="span">Goal Progression Measurements</Box>
          </Box>
        </Container>
      </Box>

      <Box sx={{ backgroundColor: '#2c5a33' }}>
        <Container sx={{ py: 4, textAlign: 'center' }}>
          <Typography sx={{ fontSize: '1.8rem', letterSpacing: 1 }}>
            Check Out Our Features!
          </Typography>
          <Box
            sx={{
              mt: 2,
              px: 2,
              py: 0.5,
              backgroundColor: isConnected ? '#2ecc71' : '#c0392b',
              color: 'white',
              borderRadius: 999,
              display: 'inline-block',
              fontSize: '0.8rem'
            }}
          >
            API {isConnected ? 'connected' : 'disconnected'}
          </Box>
        </Container>
      </Box>
    </Box>
  )
}

function App() {
  const navigate = useNavigate()
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(
    () => (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  )
  const hasToken = Boolean(localStorage.getItem('access_token'))

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    setThemeMode('light')
    localStorage.setItem('theme', 'light')
    navigate('/login')
  }

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: themeMode,
          background: {
            default: themeMode === 'dark' ? '#0b0d12' : '#f5f6f8',
            paper: themeMode === 'dark' ? '#141821' : '#ffffff'
          }
        }
      }),
    [themeMode]
  )

  const setTheme = (mode: 'light' | 'dark') => {
    setThemeMode(mode)
    localStorage.setItem('theme', mode)
  }

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      return
    }
    const fetchTheme = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
        const response = await fetch(`${apiUrl}/api/v1/users/me`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!response.ok) {
          return
        }
        const data = (await response.json()) as { theme?: 'light' | 'dark' }
        if (data.theme) {
          setTheme(data.theme)
        }
      } catch {
        // ignore theme sync failures
      }
    }
    fetchTheme()
  }, [])

  return (
    <ThemeContext.Provider value={{ theme: themeMode, setTheme }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ minHeight: '100vh', backgroundColor: 'background.default' }}>
          <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Toolbar sx={{ gap: 2 }}>
              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                Smore Budget
              </Typography>
              <Button component={RouterLink} to="/" color="inherit">
                Home
              </Button>
              <Button component={RouterLink} to="/dashboard" color="inherit">
                Dashboard
              </Button>
              <Button component={RouterLink} to="/profile" color="inherit">
                Profile
              </Button>
              {hasToken ? (
                <Button onClick={handleLogout} color="inherit">
                  Logout
                </Button>
              ) : (
                <Button component={RouterLink} to="/login" color="inherit">
                  Login
                </Button>
              )}
            </Toolbar>
          </AppBar>

          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Routes>
        </Box>
      </ThemeProvider>
    </ThemeContext.Provider>
  )
}

export default App
