import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Chip,
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

type Goal = {
  id: number
  user_id: number
  name: string
  target_amount: number
  deadline: string | null
  status: 'active' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
}

type GoalWithProgress = Goal & {
  current_amount: number
  progress_percentage: number
  remaining_amount: number
}

type GoalFormValues = {
  name: string
  target_amount: string
  deadline: string
  status: string
}

type StatusFilter = 'all' | 'active' | 'completed' | 'cancelled'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const STATUS_OPTIONS = ['active', 'completed', 'cancelled']

function Goals() {
  const [token] = useState(() => localStorage.getItem('access_token') || '')
  const [goals, setGoals] = useState<GoalWithProgress[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<GoalWithProgress | null>(null)

  const { register, handleSubmit, reset, control } = useForm<GoalFormValues>({
    defaultValues: { name: '', target_amount: '', deadline: '', status: 'active' },
  })

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    control: controlEdit,
  } = useForm<GoalFormValues>({
    defaultValues: { name: '', target_amount: '', deadline: '', status: 'active' },
  })

  const loadGoals = useCallback(
    async (filter: StatusFilter) => {
      setIsLoading(true)
      setError(null)
      try {
        let url = `${apiUrl}/api/v1/goals/`
        if (filter !== 'all') url += `?status=${filter}`

        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) {
          const data = await res.json().catch(() => null)
          throw new Error(data?.detail || 'Failed to load goals.')
        }
        const baseGoals: Goal[] = await res.json()

        // Fetch progress for each goal in parallel
        const progressResults = await Promise.allSettled(
          baseGoals.map((g) =>
            fetch(`${apiUrl}/api/v1/goals/${g.id}/progress`, {
              headers: { Authorization: `Bearer ${token}` },
            }).then((r) => r.json())
          )
        )

        const goalsWithProgress: GoalWithProgress[] = baseGoals.map((g, i) => {
          const result = progressResults[i]
          if (result.status === 'fulfilled') return result.value as GoalWithProgress
          return { ...g, current_amount: 0, progress_percentage: 0, remaining_amount: g.target_amount }
        })

        setGoals(goalsWithProgress)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load goals.')
      } finally {
        setIsLoading(false)
      }
    },
    [token]
  )

  useEffect(() => {
    loadGoals(statusFilter)
  }, [loadGoals, statusFilter])

  const onSubmit = async (values: GoalFormValues) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        name: values.name,
        target_amount: parseFloat(values.target_amount),
        status: values.status || 'active',
      }
      if (values.deadline) body.deadline = values.deadline

      const res = await fetch(`${apiUrl}/api/v1/goals/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.detail || 'Failed to create goal.')
      }
      reset()
      setDialogOpen(false)
      setSuccess('Goal created.')
      loadGoals(statusFilter)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create goal.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditDialog = (goal: GoalWithProgress) => {
    setSelectedGoal(goal)
    resetEdit({
      name: goal.name,
      target_amount: String(goal.target_amount),
      deadline: goal.deadline || '',
      status: goal.status,
    })
    setEditDialogOpen(true)
  }

  const onUpdate = async (values: GoalFormValues) => {
    if (!selectedGoal) return
    setIsSubmitting(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {}
      if (values.name) body.name = values.name
      if (values.target_amount) body.target_amount = parseFloat(values.target_amount)
      if (values.status) body.status = values.status
      if (values.deadline) body.deadline = values.deadline

      const res = await fetch(`${apiUrl}/api/v1/goals/${selectedGoal.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.detail || 'Failed to update goal.')
      }
      setEditDialogOpen(false)
      setSelectedGoal(null)
      setSuccess('Goal updated.')
      loadGoals(statusFilter)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update goal.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openDeleteDialog = (goal: GoalWithProgress) => {
    setSelectedGoal(goal)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!selectedGoal) return
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`${apiUrl}/api/v1/goals/${selectedGoal.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.detail || 'Failed to delete goal.')
      }
      setDeleteDialogOpen(false)
      setSelectedGoal(null)
      setSuccess('Goal deleted.')
      loadGoals(statusFilter)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete goal.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr + 'T00:00:00').toLocaleDateString()
  }

  const statusColor = (status: string): 'success' | 'default' | 'error' => {
    if (status === 'active') return 'success'
    if (status === 'cancelled') return 'error'
    return 'default'
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Goals</Typography>
        <Button variant="contained" onClick={() => { reset(); setDialogOpen(true) }}>
          Add Goal
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

      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        {(['all', 'active', 'completed', 'cancelled'] as StatusFilter[]).map((s) => (
          <Chip
            key={s}
            label={s.charAt(0).toUpperCase() + s.slice(1)}
            onClick={() => setStatusFilter(s)}
            color={statusFilter === s ? 'primary' : 'default'}
            variant={statusFilter === s ? 'filled' : 'outlined'}
          />
        ))}
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : goals.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No goals found.</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Target</TableCell>
                <TableCell>Saved</TableCell>
                <TableCell sx={{ minWidth: 180 }}>Progress</TableCell>
                <TableCell>Deadline</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {goals.map((goal) => (
                <TableRow key={goal.id}>
                  <TableCell>{goal.name}</TableCell>
                  <TableCell>${goal.target_amount.toFixed(2)}</TableCell>
                  <TableCell>${goal.current_amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(goal.progress_percentage, 100)}
                        sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                        color={goal.progress_percentage >= 100 ? 'success' : 'primary'}
                      />
                      <Typography variant="caption" sx={{ whiteSpace: 'nowrap' }}>
                        {goal.progress_percentage.toFixed(0)}%
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{formatDate(goal.deadline)}</TableCell>
                  <TableCell>
                    <Chip
                      label={goal.status}
                      size="small"
                      color={statusColor(goal.status)}
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openEditDialog(goal)}>
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => openDeleteDialog(goal)} color="error">
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
        <DialogTitle>Add Goal</DialogTitle>
        <DialogContent>
          <Box component="form" id="add-goal-form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="Name" required fullWidth {...register('name', { required: true })} />
            <TextField
              label="Target Amount"
              type="number"
              required
              fullWidth
              inputProps={{ step: '0.01', min: '0.01' }}
              {...register('target_amount', { required: true })}
            />
            <TextField
              label="Deadline (optional)"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              {...register('deadline')}
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select {...field} label="Status">
                    {STATUS_OPTIONS.map((s) => (
                      <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>
                        {s}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button type="submit" form="add-goal-form" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Goal</DialogTitle>
        <DialogContent>
          <Box component="form" id="edit-goal-form" onSubmit={handleSubmitEdit(onUpdate)} sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="Name" required fullWidth {...registerEdit('name', { required: true })} />
            <TextField
              label="Target Amount"
              type="number"
              required
              fullWidth
              inputProps={{ step: '0.01', min: '0.01' }}
              {...registerEdit('target_amount', { required: true })}
            />
            <TextField
              label="Deadline (optional)"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              {...registerEdit('deadline')}
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Controller
                name="status"
                control={controlEdit}
                render={({ field }) => (
                  <Select {...field} label="Status">
                    {STATUS_OPTIONS.map((s) => (
                      <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>
                        {s}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button type="submit" form="edit-goal-form" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Goal</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{selectedGoal?.name}</strong>? This cannot be undone.
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

export default Goals
