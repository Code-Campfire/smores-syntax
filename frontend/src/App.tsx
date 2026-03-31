import { useEffect, useMemo, useState } from 'react'
import { Route, Routes, useNavigate } from 'react-router-dom'
import { Box, CssBaseline } from '@mui/material'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Profile from './pages/Profile'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Transactions from './pages/Transactions'
import Analytics from './pages/Analytics'
import Bills from './pages/Bills'
import Goals from './pages/Goals'
import Categories from './pages/Categories'
import Budgets from './pages/Budgets'
import Sidebar from './components/layout/Sidebar'
import { ThemeContext } from './contexts/ThemeContext'

function App() {
  const navigate = useNavigate()
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(
    () => (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  )
  const [hasToken, setHasToken] = useState(Boolean(localStorage.getItem('access_token')))
  const [sidebarOpen, setSidebarOpen] = useState(
    () => localStorage.getItem('sidebar_open') !== 'false'
  )

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    setHasToken(false)
    setThemeMode('light')
    localStorage.setItem('theme', 'light')
    navigate('/login')
  }

  const handleSidebarToggle = () => {
    setSidebarOpen((prev: boolean) => {
      const next = !prev
      localStorage.setItem('sidebar_open', String(next))
      return next
    })
  }

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: themeMode,
          background: {
            default: themeMode === 'dark' ? '#0b0d12' : '#f5f6f8',
            paper: themeMode === 'dark' ? '#141821' : '#ffffff',
          },
        },
      }),
    [themeMode]
  )

  const setTheme = (mode: 'light' | 'dark') => {
    setThemeMode(mode)
    localStorage.setItem('theme', mode)
  }

  // Sync theme from backend on load
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (!token) return
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    fetch(`${apiUrl}/api/v1/users/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { theme?: 'light' | 'dark' } | null) => {
        if (data?.theme) setTheme(data.theme)
      })
      .catch(() => {})
  }, [])

  // Keep hasToken in sync when login sets it externally
  useEffect(() => {
    const onStorage = () => setHasToken(Boolean(localStorage.getItem('access_token')))
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return (
    <ThemeContext.Provider value={{ theme: themeMode, setTheme }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: 'background.default' }}>
          {hasToken && (
            <Sidebar
              open={sidebarOpen}
              onToggle={handleSidebarToggle}
              onLogout={handleLogout}
            />
          )}
          <Box component="main" sx={{ flexGrow: 1, overflow: 'auto' }}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/bills" element={<Bills />} />
              <Route path="/goals" element={<Goals />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/budgets" element={<Budgets />} />
            </Routes>
          </Box>
        </Box>
      </ThemeProvider>
    </ThemeContext.Provider>
  )
}

export default App
