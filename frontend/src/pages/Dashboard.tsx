import { useEffect, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  LinearProgress,
  Paper,
  Typography
} from '@mui/material'
import { format } from 'date-fns'
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'

type User = {
  full_name?: string | null
  username: string
}

type Bill = {
  id: number
  title: string
  amount: number | null
  due_date: string
}

type Goal = {
  id: number
  name: string
  target_amount: number
  deadline: string | null
  status: string
}

type GoalProgress = {
  current_amount: number
  progress_percentage: number
  remaining_amount: number
}

type Transaction = {
  id: number
  description: string | null
  transaction_date: string
  transaction_type: string
  amount: number
}

type CategoryDist = {
  category: string
  total: number
}

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD'
})

function Dashboard() {
  const [token] = useState(() => localStorage.getItem('access_token') || '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [user, setUser] = useState<User | null>(null)
  const [nextBill, setNextBill] = useState<Bill | null>(null)
  const [soonestGoal, setSoonestGoal] = useState<(Goal & GoalProgress) | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categoryData, setCategoryData] = useState<CategoryDist[]>([])

  useEffect(() => {
    if (!token) {
      setLoading(false)
      return
    }

    const headers = { Authorization: `Bearer ${token}` }

    const fetchAll = async () => {
      try {
        const [userRes, billsRes, goalsRes, txRes, analyticsRes] = await Promise.all([
          fetch(`${apiUrl}/api/v1/users/me`, { headers }),
          fetch(`${apiUrl}/api/v1/bills/upcoming/?days_ahead=30`, { headers }),
          fetch(`${apiUrl}/api/v1/goals/?status=active`, { headers }),
          fetch(`${apiUrl}/api/v1/transactions/?limit=5`, { headers }),
          fetch(`${apiUrl}/api/v1/analytics/category-distribution`, { headers })
        ])

        if (!userRes.ok) throw new Error('Failed to load user data.')

        const userData = (await userRes.json()) as User
        setUser(userData)

        if (billsRes.ok) {
          const bills = (await billsRes.json()) as Bill[]
          setNextBill(bills.length > 0 ? bills[0] : null)
        }

        if (goalsRes.ok) {
          const goals = (await goalsRes.json()) as Goal[]
          const withDeadline = goals
            .filter((g) => g.deadline)
            .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
          const nearest = withDeadline[0] ?? goals[0] ?? null

          if (nearest) {
            const progressRes = await fetch(
              `${apiUrl}/api/v1/goals/${nearest.id}/progress`,
              { headers }
            )
            if (progressRes.ok) {
              const progress = (await progressRes.json()) as GoalProgress
              setSoonestGoal({ ...nearest, ...progress })
            }
          }
        }

        if (txRes.ok) {
          const txData = (await txRes.json()) as Transaction[]
          setTransactions(txData)
        }

        if (analyticsRes.ok) {
          const analyticsData = (await analyticsRes.json()) as {
            category_distribution: CategoryDist[]
          }
          setCategoryData(analyticsData.category_distribution)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data.')
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
  }, [token])

  if (!token) {
    return (
      <Box sx={{ maxWidth: 900, mx: 'auto', px: { xs: 2, sm: 4 }, py: 6 }}>
        <Alert severity="warning">
          You must be logged in to view the dashboard.
          <Button component={RouterLink} to="/login" size="small" sx={{ ml: 2 }} variant="outlined">
            Go to login
          </Button>
        </Alert>
      </Box>
    )
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    )
  }

  const greeting = user?.full_name || user?.username || 'User'

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', px: { xs: 2, sm: 4, md: 6 }, py: { xs: 4, md: 6 } }}>
      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}

      <Typography variant="h4" sx={{ mb: 5, fontWeight: 600 }}>
        Hello <strong>{greeting}!</strong>
      </Typography>

      {/* Row 1: Quick Stats */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 4,
          mb: 4
        }}
      >
        {/* Next Upcoming Bill */}
        <Paper
          elevation={2}
          sx={{
            p: 4,
            borderTop: 4,
            borderColor: 'warning.main',
            borderRadius: 3
          }}
        >
          <Typography variant="overline" sx={{ letterSpacing: 1.5, color: 'text.secondary' }}>
            Next Upcoming Bill
          </Typography>
          {nextBill ? (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {nextBill.title}
              </Typography>
              <Typography variant="h4" sx={{ color: 'warning.dark', mt: 2, fontWeight: 700 }}>
                {nextBill.amount != null ? currency.format(nextBill.amount) : 'No amount set'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                Due {format(new Date(nextBill.due_date + 'T00:00:00'), 'MMMM d, yyyy')}
              </Typography>
            </Box>
          ) : (
            <Typography sx={{ color: 'text.secondary', fontStyle: 'italic', mt: 3 }}>
              No upcoming bills
            </Typography>
          )}
        </Paper>

        {/* Soonest Goal Achievement */}
        <Paper
          elevation={2}
          sx={{
            p: 4,
            borderTop: 4,
            borderColor: 'success.main',
            borderRadius: 3
          }}
        >
          <Typography variant="overline" sx={{ letterSpacing: 1.5, color: 'text.secondary' }}>
            Soonest Goal Achievement
          </Typography>
          {soonestGoal ? (
            <Box sx={{ mt: 3 }}>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {soonestGoal.name}
              </Typography>
              <Box sx={{ mt: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {currency.format(soonestGoal.current_amount)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {currency.format(soonestGoal.target_amount)}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(soonestGoal.progress_percentage, 100)}
                  sx={{
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: 'action.hover',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: 'success.main',
                      borderRadius: 6
                    }
                  }}
                />
              </Box>
              <Typography variant="body2" sx={{ mt: 2.5, color: 'text.secondary' }}>
                You raised {currency.format(soonestGoal.current_amount)}! Only{' '}
                {currency.format(soonestGoal.remaining_amount)} remaining!
              </Typography>
            </Box>
          ) : (
            <Typography sx={{ color: 'text.secondary', fontStyle: 'italic', mt: 3 }}>
              No active goals
            </Typography>
          )}
        </Paper>
      </Box>

      {/* Row 2: Transactions and Spending */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 4
        }}
      >
        {/* Last 5 Transactions */}
        <Paper elevation={2} sx={{ p: 4, borderRadius: 3 }}>
          <Typography variant="overline" sx={{ letterSpacing: 1.5, color: 'text.secondary' }}>
            Last 5 Transactions
          </Typography>
          {transactions.length > 0 ? (
            <Box component="ul" sx={{ listStyle: 'none', p: 0, mt: 2 }}>
              {transactions.map((tx, i) => (
                <Box component="li" key={tx.id}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      py: 1.5,
                      px: 1
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body1" sx={{ fontStyle: 'italic' }} noWrap>
                        {tx.description || 'No description'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {format(new Date(tx.transaction_date + 'T00:00:00'), 'MMM d, yyyy')}
                      </Typography>
                    </Box>
                    <Typography
                      variant="body1"
                      sx={{
                        fontWeight: 600,
                        color: tx.transaction_type === 'income' ? 'success.main' : 'error.main',
                        whiteSpace: 'nowrap',
                        ml: 3
                      }}
                    >
                      {tx.transaction_type === 'income' ? '+' : '-'}
                      {currency.format(tx.amount)}
                    </Typography>
                  </Box>
                  {i < transactions.length - 1 && <Divider />}
                </Box>
              ))}
            </Box>
          ) : (
            <Typography sx={{ color: 'text.secondary', fontStyle: 'italic', mt: 3 }}>
              No transactions yet
            </Typography>
          )}
        </Paper>

        {/* Spending by Category */}
        <Paper elevation={2} sx={{ p: 4, borderRadius: 3 }}>
          <Typography variant="overline" sx={{ letterSpacing: 1.5, color: 'text.secondary' }}>
            Spending by Category
          </Typography>
          {categoryData.length > 0 ? (
            <Box sx={{ mt: 3 }}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={categoryData} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                  <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v: number) => `$${v}`}
                    width={60}
                  />
                  <Tooltip
                    formatter={(value: number) => [currency.format(value), 'Total']}
                  />
                  <Bar dataKey="total" fill="#449454" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          ) : (
            <Typography sx={{ color: 'text.secondary', fontStyle: 'italic', mt: 3 }}>
              No spending data yet
            </Typography>
          )}
        </Paper>
      </Box>
    </Box>
  )
}

export default Dashboard
