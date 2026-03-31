import { useLocation, Link as RouterLink } from 'react-router-dom'
import {
  AccountBalance as AccountBalanceIcon,
  BarChart as BarChartIcon,
  ChevronLeft as ChevronLeftIcon,
  Dashboard as DashboardIcon,
  EventNote as EventNoteIcon,
  Flag as FlagIcon,
  Label as LabelIcon,
  Logout as LogoutIcon,
  Menu as MenuIcon,
  Person as PersonIcon,
  ReceiptLong as ReceiptLongIcon,
} from '@mui/icons-material'
import {
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material'

const DRAWER_WIDTH = 240
const DRAWER_COLLAPSED_WIDTH = 64

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/', icon: <DashboardIcon /> },
  { label: 'Transactions', path: '/transactions', icon: <ReceiptLongIcon /> },
  { label: 'Analytics', path: '/analytics', icon: <BarChartIcon /> },
  { label: 'Bills', path: '/bills', icon: <EventNoteIcon /> },
  { label: 'Goals', path: '/goals', icon: <FlagIcon /> },
  { label: 'Categories', path: '/categories', icon: <LabelIcon /> },
  { label: 'Budgets', path: '/budgets', icon: <AccountBalanceIcon /> },
]

type SidebarProps = {
  open: boolean
  onToggle: () => void
  onLogout: () => void
}

function Sidebar({ open, onToggle, onLogout }: SidebarProps) {
  const location = useLocation()
  const theme = useTheme()

  const drawerSx = {
    width: open ? DRAWER_WIDTH : DRAWER_COLLAPSED_WIDTH,
    flexShrink: 0,
    whiteSpace: 'nowrap',
    '& .MuiDrawer-paper': {
      width: open ? DRAWER_WIDTH : DRAWER_COLLAPSED_WIDTH,
      overflowX: 'hidden',
      transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: open
          ? theme.transitions.duration.enteringScreen
          : theme.transitions.duration.leavingScreen,
      }),
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      borderRight: 1,
      borderColor: 'divider',
    },
  }

  return (
    <Drawer variant="permanent" sx={drawerSx}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: open ? 'space-between' : 'center',
          px: open ? 2 : 0,
          py: 1.5,
          minHeight: 56,
        }}
      >
        {open && (
          <Typography variant="h6" fontWeight={700} noWrap sx={{ color: 'primary.main' }}>
            Ledgr
          </Typography>
        )}
        <IconButton onClick={onToggle} size="small">
          {open ? <ChevronLeftIcon /> : <MenuIcon />}
        </IconButton>
      </Box>

      <Divider />

      {/* Nav items */}
      <List sx={{ flexGrow: 1, pt: 1 }}>
        {NAV_ITEMS.map(({ label, path, icon }) => {
          const active = location.pathname === path
          return (
            <ListItem key={path} disablePadding sx={{ display: 'block' }}>
              <Tooltip title={open ? '' : label} placement="right" arrow>
                <ListItemButton
                  component={RouterLink}
                  to={path}
                  selected={active}
                  sx={{
                    minHeight: 48,
                    justifyContent: open ? 'initial' : 'center',
                    px: 2.5,
                    borderRadius: 1,
                    mx: 0.5,
                    '&.Mui-selected': {
                      backgroundColor: 'primary.main',
                      color: 'primary.contrastText',
                      '& .MuiListItemIcon-root': { color: 'primary.contrastText' },
                      '&:hover': { backgroundColor: 'primary.dark' },
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: open ? 2 : 'auto',
                      justifyContent: 'center',
                      color: active ? 'inherit' : 'text.secondary',
                    }}
                  >
                    {icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={label}
                    sx={{ opacity: open ? 1 : 0, transition: 'opacity 0.2s' }}
                  />
                </ListItemButton>
              </Tooltip>
            </ListItem>
          )
        })}
      </List>

      <Divider />

      {/* Bottom: Profile + Logout */}
      <List sx={{ pb: 1 }}>
        <ListItem disablePadding sx={{ display: 'block' }}>
          <Tooltip title={open ? '' : 'Profile'} placement="right" arrow>
            <ListItemButton
              component={RouterLink}
              to="/profile"
              selected={location.pathname === '/profile'}
              sx={{
                minHeight: 48,
                justifyContent: open ? 'initial' : 'center',
                px: 2.5,
                borderRadius: 1,
                mx: 0.5,
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  '& .MuiListItemIcon-root': { color: 'primary.contrastText' },
                  '&:hover': { backgroundColor: 'primary.dark' },
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: open ? 2 : 'auto',
                  justifyContent: 'center',
                  color: location.pathname === '/profile' ? 'inherit' : 'text.secondary',
                }}
              >
                <PersonIcon />
              </ListItemIcon>
              <ListItemText primary="Profile" sx={{ opacity: open ? 1 : 0, transition: 'opacity 0.2s' }} />
            </ListItemButton>
          </Tooltip>
        </ListItem>

        <ListItem disablePadding sx={{ display: 'block' }}>
          <Tooltip title={open ? '' : 'Logout'} placement="right" arrow>
            <ListItemButton
              onClick={onLogout}
              sx={{
                minHeight: 48,
                justifyContent: open ? 'initial' : 'center',
                px: 2.5,
                borderRadius: 1,
                mx: 0.5,
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: open ? 2 : 'auto',
                  justifyContent: 'center',
                  color: 'text.secondary',
                }}
              >
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText primary="Logout" sx={{ opacity: open ? 1 : 0, transition: 'opacity 0.2s' }} />
            </ListItemButton>
          </Tooltip>
        </ListItem>
      </List>
    </Drawer>
  )
}

export default Sidebar
