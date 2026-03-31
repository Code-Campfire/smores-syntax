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
import { Edit, Delete, CheckCircle } from '@mui/icons-material'
import { Controller, useForm } from 'react-hook-form'

type Bill = {
  id: number
  user_id: number
  title: string
  amount: number | null
  due_date: string
  recurrence: string
  last_paid_date: string | null
  created_at: string
  updated_at: string
}

type BillFormValues = {
  title: string
  amount: string
  due_date: string
  recurrence: string
  last_paid_date: string
}

type FilterTab = 'all' | 'upcoming' | 'overdue'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const RECURRENCE_OPTIONS = ['none', 'daily', 'weekly', 'monthly', 'yearly']

function Bills() {
  const [token] = useState(() => localStorage.getItem('access_token') || '')
  const [bills, setBills] = useState<Bill[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [filterTab, setFilterTab] = useState<FilterTab>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null)

  const { register, handleSubmit, reset, control } = useForm<BillFormValues>({
    defaultValues: {
      title: '',
      amount: '',
      due_date: new Date().toISOString().slice(0, 10),
      recurrence: 'none',
      last_paid_date: '',
    },
  })

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    control: controlEdit,
  } = useForm<BillFormValues>({
    defaultValues: {
      title: '',
      amount: '',
      due_date: '',
      recurrence: 'none',
      last_paid_date: '',
    },
  })

  const loadBills = useCallback(
    async (tab: FilterTab) => {
      setIsLoading(true)
      setError(null)
      try {
        let url = `${apiUrl}/api/v1/bills/`
        if (tab === 'upcoming') url = `${apiUrl}/api/v1/bills/upcoming/?days_ahead=7`
        if (tab === 'overdue') url = `${apiUrl}/api/v1/bills/overdue/`

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) {
          const data = await res.json().catch(() => null)
          throw new Error(data?.detail || 'Failed to load bills.')
        }
        const data = await res.json()
        setBills(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load bills.')
      } finally {
        setIsLoading(false)
      }
    },
    [token]
  )

  useEffect(() => {
    loadBills(filterTab)
  }, [loadBills, filterTab])

  const onSubmit = async (values: BillFormValues) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        title: values.title,
        due_date: values.due_date,
        recurrence: values.recurrence || 'none',
      }
      if (values.amount) body.amount = parseFloat(values.amount)
      if (values.last_paid_date) body.last_paid_date = values.last_paid_date

      const res = await fetch(`${apiUrl}/api/v1/bills/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.detail || 'Failed to create bill.')
      }
      reset()
      setDialogOpen(false)
      setSuccess('Bill created.')
      loadBills(filterTab)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create bill.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditDialog = (bill: Bill) => {
    setSelectedBill(bill)
    resetEdit({
      title: bill.title,
      amount: bill.amount != null ? String(bill.amount) : '',
      due_date: bill.due_date,
      recurrence: bill.recurrence || 'none',
      last_paid_date: bill.last_paid_date || '',
    })
    setEditDialogOpen(true)
  }

  const onUpdate = async (values: BillFormValues) => {
    if (!selectedBill) return
    setIsSubmitting(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {}
      if (values.title) body.title = values.title
      if (values.due_date) body.due_date = values.due_date
      if (values.recurrence) body.recurrence = values.recurrence
      if (values.amount) body.amount = parseFloat(values.amount)
      if (values.last_paid_date) body.last_paid_date = values.last_paid_date

      const res = await fetch(`${apiUrl}/api/v1/bills/${selectedBill.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.detail || 'Failed to update bill.')
      }
      setEditDialogOpen(false)
      setSelectedBill(null)
      setSuccess('Bill updated.')
      loadBills(filterTab)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update bill.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openDeleteDialog = (bill: Bill) => {
    setSelectedBill(bill)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!selectedBill) return
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`${apiUrl}/api/v1/bills/${selectedBill.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.detail || 'Failed to delete bill.')
      }
      setDeleteDialogOpen(false)
      setSelectedBill(null)
      setSuccess('Bill deleted.')
      loadBills(filterTab)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete bill.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const markPaid = async (bill: Bill) => {
    setError(null)
    try {
      const res = await fetch(`${apiUrl}/api/v1/bills/${bill.id}/mark-paid`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.detail || 'Failed to mark bill as paid.')
      }
      setSuccess(`"${bill.title}" marked as paid.`)
      loadBills(filterTab)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark bill as paid.')
    }
  }

  const isOverdue = (bill: Bill) => {
    return new Date(bill.due_date) < new Date(new Date().toISOString().slice(0, 10))
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr + 'T00:00:00').toLocaleDateString()
  }

  const formatAmount = (amount: number | null) => {
    if (amount == null) return '—'
    return `$${amount.toFixed(2)}`
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Bills</Typography>
        <Button variant="contained" onClick={() => { reset(); setDialogOpen(true) }}>
          Add Bill
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
        {(['all', 'upcoming', 'overdue'] as FilterTab[]).map((tab) => (
          <Chip
            key={tab}
            label={tab.charAt(0).toUpperCase() + tab.slice(1)}
            onClick={() => setFilterTab(tab)}
            color={filterTab === tab ? 'primary' : 'default'}
            variant={filterTab === tab ? 'filled' : 'outlined'}
          />
        ))}
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : bills.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">No bills found.</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Amount</TableCell>
                <TableCell>Due Date</TableCell>
                <TableCell>Recurrence</TableCell>
                <TableCell>Last Paid</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {bills.map((bill) => (
                <TableRow
                  key={bill.id}
                  sx={isOverdue(bill) ? { backgroundColor: 'error.light', '&:hover': { backgroundColor: 'error.light' } } : undefined}
                >
                  <TableCell>{bill.title}</TableCell>
                  <TableCell>{formatAmount(bill.amount)}</TableCell>
                  <TableCell>{formatDate(bill.due_date)}</TableCell>
                  <TableCell sx={{ textTransform: 'capitalize' }}>{bill.recurrence || 'none'}</TableCell>
                  <TableCell>{formatDate(bill.last_paid_date)}</TableCell>
                  <TableCell>
                    {isOverdue(bill) ? (
                      <Chip label="Overdue" color="error" size="small" />
                    ) : (
                      <Chip label="Upcoming" color="success" size="small" />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                      <Button
                        size="small"
                        startIcon={<CheckCircle />}
                        onClick={() => markPaid(bill)}
                        color="success"
                      >
                        Mark Paid
                      </Button>
                      <IconButton size="small" onClick={() => openEditDialog(bill)}>
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => openDeleteDialog(bill)} color="error">
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add Bill</DialogTitle>
        <DialogContent>
          <Box component="form" id="add-bill-form" onSubmit={handleSubmit(onSubmit)} sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Title"
              required
              fullWidth
              {...register('title', { required: true })}
            />
            <TextField
              label="Amount"
              type="number"
              fullWidth
              inputProps={{ step: '0.01', min: '0' }}
              {...register('amount')}
            />
            <TextField
              label="Due Date"
              type="date"
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
              {...register('due_date', { required: true })}
            />
            <FormControl fullWidth>
              <InputLabel>Recurrence</InputLabel>
              <Controller
                name="recurrence"
                control={control}
                render={({ field }) => (
                  <Select {...field} label="Recurrence">
                    {RECURRENCE_OPTIONS.map((opt) => (
                      <MenuItem key={opt} value={opt} sx={{ textTransform: 'capitalize' }}>
                        {opt}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
            </FormControl>
            <TextField
              label="Last Paid Date"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              {...register('last_paid_date')}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button type="submit" form="add-bill-form" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Bill</DialogTitle>
        <DialogContent>
          <Box component="form" id="edit-bill-form" onSubmit={handleSubmitEdit(onUpdate)} sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField label="Title" required fullWidth {...registerEdit('title', { required: true })} />
            <TextField
              label="Amount"
              type="number"
              fullWidth
              inputProps={{ step: '0.01', min: '0' }}
              {...registerEdit('amount')}
            />
            <TextField
              label="Due Date"
              type="date"
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
              {...registerEdit('due_date', { required: true })}
            />
            <FormControl fullWidth>
              <InputLabel>Recurrence</InputLabel>
              <Controller
                name="recurrence"
                control={controlEdit}
                render={({ field }) => (
                  <Select {...field} label="Recurrence">
                    {RECURRENCE_OPTIONS.map((opt) => (
                      <MenuItem key={opt} value={opt} sx={{ textTransform: 'capitalize' }}>
                        {opt}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
            </FormControl>
            <TextField
              label="Last Paid Date"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              {...registerEdit('last_paid_date')}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button type="submit" form="edit-bill-form" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Bill</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{selectedBill?.title}</strong>? This cannot be undone.
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

export default Bills
