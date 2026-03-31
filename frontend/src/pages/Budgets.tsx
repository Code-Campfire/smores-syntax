import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { Edit, Delete } from '@mui/icons-material'
import { Controller, useForm } from 'react-hook-form'

type BudgetWithCategory = {
  id: number
  user_id: number
  year: number
  month: number
  category_id: number | null
  amount: number
  spent: number
  remaining: number
  percentage_used: number
  category_name: string | null
  created_at: string
  updated_at: string
}

type Category = {
  id: number
  name: string
  type: 'income' | 'expense'
  is_active: boolean
}

type AddBudgetFormValues = {
  category_id: string
  amount: string
}

type EditBudgetFormValues = {
  amount: string
}

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function Budgets() {
  const [token] = useState(() => localStorage.getItem('access_token') || '')
  const [budgets, setBudgets] = useState<BudgetWithCategory[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedBudget, setSelectedBudget] = useState<BudgetWithCategory | null>(null)

  const { register, handleSubmit, reset, control } = useForm<AddBudgetFormValues>({
    defaultValues: { category_id: '', amount: '' },
  })

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
  } = useForm<EditBudgetFormValues>({
    defaultValues: { amount: '' },
  })

  const loadBudgets = useCallback(
    async (year: number, month: number) => {
      setIsLoading(true)
      setError(null)
      try {
        const res = await fetch(`${apiUrl}/api/v1/budgets/month?year=${year}&month=${month}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          const data = await res.json().catch(() => null)
          throw new Error(data?.detail || 'Failed to load budgets.')
        }
        setBudgets(await res.json())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load budgets.')
      } finally {
        setIsLoading(false)
      }
    },
    [token]
  )

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/categories/`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setCategories(await res.json())
    } catch {
      // non-critical
    }
  }, [token])

  useEffect(() => {
    loadBudgets(selectedYear, selectedMonth)
  }, [loadBudgets, selectedYear, selectedMonth])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  const totalBudgeted = budgets.reduce((sum, b) => sum + b.amount, 0)
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0)
  const totalRemaining = budgets.reduce((sum, b) => sum + b.remaining, 0)

  const onSubmit = async (values: AddBudgetFormValues) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        year: selectedYear,
        month: selectedMonth,
        amount: parseFloat(values.amount),
      }
      if (values.category_id) body.category_id = parseInt(values.category_id)

      const res = await fetch(`${apiUrl}/api/v1/budgets/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.detail || 'Failed to create budget.')
      }
      reset()
      setDialogOpen(false)
      setSuccess('Budget created.')
      loadBudgets(selectedYear, selectedMonth)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create budget.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditDialog = (budget: BudgetWithCategory) => {
    setSelectedBudget(budget)
    resetEdit({ amount: String(budget.amount) })
    setEditDialogOpen(true)
  }

  const onUpdate = async (values: EditBudgetFormValues) => {
    if (!selectedBudget) return
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`${apiUrl}/api/v1/budgets/${selectedBudget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: parseFloat(values.amount) }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.detail || 'Failed to update budget.')
      }
      setEditDialogOpen(false)
      setSelectedBudget(null)
      setSuccess('Budget updated.')
      loadBudgets(selectedYear, selectedMonth)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update budget.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openDeleteDialog = (budget: BudgetWithCategory) => {
    setSelectedBudget(budget)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!selectedBudget) return
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`${apiUrl}/api/v1/budgets/${selectedBudget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.detail || 'Failed to delete budget.')
      }
      setDeleteDialogOpen(false)
      setSelectedBudget(null)
      setSuccess('Budget deleted.')
      loadBudgets(selectedYear, selectedMonth)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete budget.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const progressColor = (pct: number): 'success' | 'warning' | 'error' => {
    if (pct >= 100) return 'error'
    if (pct >= 80) return 'warning'
    return 'success'
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Budgets</Typography>
        <Button variant="contained" onClick={() => { reset(); setDialogOpen(true) }}>
          Add Budget
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}

      {/* Month/Year Picker */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Month</InputLabel>
          <Select
            value={selectedMonth}
            label="Month"
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
          >
            {MONTHS.map((m, i) => (
              <MenuItem key={i + 1} value={i + 1}>{m}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="Year"
          type="number"
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          inputProps={{ min: 2000, max: 2100 }}
          sx={{ width: 110 }}
        />
      </Box>

      {/* Summary */}
      {!isLoading && budgets.length > 0 && (
        <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
          {[
            { label: 'Total Budgeted', value: totalBudgeted, color: 'text.primary' },
            { label: 'Total Spent', value: totalSpent, color: totalSpent > totalBudgeted ? 'error.main' : 'text.primary' },
            { label: 'Total Remaining', value: totalRemaining, color: totalRemaining < 0 ? 'error.main' : 'success.main' },
          ].map(({ label, value, color }) => (
            <Paper key={label} sx={{ p: 2, flex: 1, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">{label}</Typography>
              <Typography variant="h6" sx={{ color }}>${value.toFixed(2)}</Typography>
            </Paper>
          ))}
        </Box>
      )}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : budgets.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No budgets set for {MONTHS[selectedMonth - 1]} {selectedYear}.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Category</TableCell>
                <TableCell align="right">Budgeted</TableCell>
                <TableCell align="right">Spent</TableCell>
                <TableCell align="right">Remaining</TableCell>
                <TableCell sx={{ minWidth: 200 }}>Usage</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {budgets.map((budget) => (
                <TableRow key={budget.id}>
                  <TableCell>{budget.category_name || 'Uncategorized'}</TableCell>
                  <TableCell align="right">${budget.amount.toFixed(2)}</TableCell>
                  <TableCell align="right">${budget.spent.toFixed(2)}</TableCell>
                  <TableCell align="right" sx={{ color: budget.remaining < 0 ? 'error.main' : 'success.main' }}>
                    ${budget.remaining.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(budget.percentage_used, 100)}
                        color={progressColor(budget.percentage_used)}
                        sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                      />
                      <Typography variant="caption" sx={{ whiteSpace: 'nowrap' }}>
                        {budget.percentage_used.toFixed(0)}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openEditDialog(budget)}>
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => openDeleteDialog(budget)} color="error">
                      <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add Budget — {MONTHS[selectedMonth - 1]} {selectedYear}</DialogTitle>
        <DialogContent>
          <Box
            component="form"
            id="add-budget-form"
            onSubmit={handleSubmit(onSubmit)}
            sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}
          >
            <FormControl fullWidth>
              <InputLabel>Category (optional)</InputLabel>
              <Controller
                name="category_id"
                control={control}
                render={({ field }) => (
                  <Select {...field} label="Category (optional)">
                    <MenuItem value="">Uncategorized</MenuItem>
                    {categories.filter((c) => c.is_active).map((c) => (
                      <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>
                    ))}
                  </Select>
                )}
              />
            </FormControl>
            <TextField
              label="Budgeted Amount"
              type="number"
              required
              fullWidth
              inputProps={{ step: '0.01', min: '0.01' }}
              {...register('amount', { required: true })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button type="submit" form="add-budget-form" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          Edit Budget — {selectedBudget?.category_name || 'Uncategorized'}
        </DialogTitle>
        <DialogContent>
          <Box
            component="form"
            id="edit-budget-form"
            onSubmit={handleSubmitEdit(onUpdate)}
            sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}
          >
            <TextField
              label="Budgeted Amount"
              type="number"
              required
              fullWidth
              inputProps={{ step: '0.01', min: '0.01' }}
              {...registerEdit('amount', { required: true })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button type="submit" form="edit-budget-form" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Budget</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the budget for{' '}
            <strong>{selectedBudget?.category_name || 'Uncategorized'}</strong> in{' '}
            {MONTHS[(selectedBudget?.month ?? 1) - 1]} {selectedBudget?.year}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}

export default Budgets
