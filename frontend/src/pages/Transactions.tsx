import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
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
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Typography
} from '@mui/material'
import { Edit, Delete, Add } from '@mui/icons-material'
import { Controller, useForm } from 'react-hook-form'

type Transaction = {
  id: number
  amount: number
  transaction_date: string
  description: string | null
  category_id: number
  transaction_type: 'income' | 'expense'
  user_id: number
  goal_id: number | null
}

type TransactionFormValues = {
  amount: number
  transaction_date: string
  description: string
  category_id: number
  goal_id: number
}

type Goal = {
  id: number
  name: string
  status: string
}

type Category = {
  id: number
  name: string
  type: 'income' | 'expense'
  is_active: boolean
}

type SortKey = 'transaction_date' | 'description' | 'category' | 'transaction_type' | 'amount'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function Transactions() {
  const [token] = useState(() => localStorage.getItem('access_token') || '')
  const [categories, setCategories] = useState<Category[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('transaction_date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [filterCategoryId, setFilterCategoryId] = useState<number | 'all'>('all')
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')

  const [newCategoryDialogOpen, setNewCategoryDialogOpen] = useState(false)
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)

  const { register: registerCat, handleSubmit: handleSubmitCat, reset: resetCat, control: controlCat } = useForm<{ name: string; type: string }>({
    defaultValues: { name: '', type: 'expense' },
  })

  const [suggestion, setSuggestion] = useState<{
    category_id: number
    category_name: string
    confidence: number
    source: string
  } | null>(null)
  const [suggestionLoading, setSuggestionLoading] = useState(false)
  const [scanLoading, setScanLoading] = useState(false)
  const [amountValidation, setAmountValidation] = useState<boolean | null | undefined>(undefined)
  const suggestTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSuggestionRef = useRef<typeof suggestion>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, reset, control, watch, setValue, getValues } = useForm<TransactionFormValues>({
    defaultValues: {
      amount: 0,
      transaction_date: new Date().toISOString().slice(0, 10),
      description: '',
      category_id: 0,
      goal_id: 0
    }
  })

  const selectedCategoryId = watch('category_id')
  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === selectedCategoryId),
    [categories, selectedCategoryId]
  )

  const loadTransactions = useCallback(async () => {
    if (!token) return
    setIsLoadingTransactions(true)
    try {
      const params = new URLSearchParams()
      if (filterCategoryId !== 'all') {
        params.set('category_id', String(filterCategoryId))
      }
      if (filterType !== 'all') {
        params.set('transaction_type', filterType)
      }
      if (filterStartDate) {
        params.set('start_date', filterStartDate)
      }
      if (filterEndDate) {
        params.set('end_date', filterEndDate)
      }
      const query = params.toString()

      const response = await fetch(
        `${apiUrl}/api/v1/transactions/${query ? `?${query}` : ''}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      if (!response.ok) throw new Error('Failed to load transactions.')
      const data = (await response.json()) as Transaction[]
      setTransactions(data)
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Unknown error loading transactions.')
    } finally {
      setIsLoadingTransactions(false)
    }
  }, [token, filterCategoryId, filterType, filterStartDate, filterEndDate])

  const handleExportCsv = useCallback(async () => {
    if (!token) {
      setError('You must be logged in to export transactions.')
      return
    }

    try {
      const params = new URLSearchParams()
      if (filterCategoryId !== 'all') {
        params.set('category_id', String(filterCategoryId))
      }
      if (filterType !== 'all') {
        params.set('transaction_type', filterType)
      }
      if (filterStartDate) {
        params.set('start_date', filterStartDate)
      }
      if (filterEndDate) {
        params.set('end_date', filterEndDate)
      }
      const query = params.toString()

      const response = await fetch(
        `${apiUrl}/api/v1/transactions/export${query ? `?${query}` : ''}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      )

      if (!response.ok) {
        throw new Error('Failed to export transactions.')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'transactions.csv'
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Unknown error exporting transactions.')
    }
  }, [token, filterCategoryId, filterType, filterStartDate, filterEndDate])

  useEffect(() => {
    const loadCategories = async () => {
      if (!token) return
      setIsLoadingCategories(true)
      setError(null)
      try {
        const response = await fetch(`${apiUrl}/api/v1/categories/`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (!response.ok) {
          throw new Error('Failed to load categories.')
        }

        const categories = (await response.json()) as Category[]
        setCategories(
          categories
            .filter((category) => category.is_active)
            .sort((a, b) => a.name.localeCompare(b.name))
        )
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : 'Unknown error loading categories.')
      } finally {
        setIsLoadingCategories(false)
      }
    }

    const loadGoals = async () => {
      if (!token) return
      try {
        const response = await fetch(`${apiUrl}/api/v1/goals/?status=active`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (response.ok) {
          const data = (await response.json()) as Goal[]
          setGoals(data)
        }
      } catch {
        // non-critical — goals dropdown is optional
      }
    }

    loadCategories()
    loadGoals()
    loadTransactions()
  }, [token, loadTransactions])

  const handleCreateCategory = async (values: { name: string; type: string }) => {
    setIsCreatingCategory(true)
    try {
      const res = await fetch(`${apiUrl}/api/v1/categories/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: values.name, type: values.type }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.detail || 'Failed to create category.')
      }
      const created = (await res.json()) as Category
      setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
      setValue('category_id', created.id)
      resetCat()
      setNewCategoryDialogOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category.')
    } finally {
      setIsCreatingCategory(false)
    }
  }

  const handleDescriptionChange = (value: string) => {
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current)
    if (value.trim().length < 3) {
      setSuggestion(null)
      return
    }
    suggestTimerRef.current = setTimeout(async () => {
      setSuggestionLoading(true)
      try {
        const res = await fetch(
          `${apiUrl}/api/v1/transactions/suggest-category?description=${encodeURIComponent(value)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        const data = (await res.json()) as {
          category_id: number | null
          category_name: string | null
          confidence: number
          source: string
        }
        if (data.category_id) {
          setSuggestion(data as NonNullable<typeof suggestion>)
          lastSuggestionRef.current = data as NonNullable<typeof suggestion>
          if (!getValues('category_id')) {
            setValue('category_id', data.category_id, { shouldValidate: true })
          }
        } else {
          setSuggestion(null)
          lastSuggestionRef.current = null
        }
      } catch {
        setSuggestion(null)
      } finally {
        setSuggestionLoading(false)
      }
    }, 500)
  }

  const handleReceiptScan = async (e: { target: HTMLInputElement }) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    setScanLoading(true)
    setError(null)
    try {
      const res = await fetch(`${apiUrl}/api/v1/transactions/scan-receipt`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      if (!res.ok) throw new Error('Receipt scan failed.')
      const data = await res.json() as {
        amount: number | null
        description: string | null
        date: string | null
        total_validated: boolean | null
        category_suggestion: { category_id: number; category_name: string; confidence: number; source: string } | null
      }
      setDialogOpen(true)
      if (data.amount != null) setValue('amount', data.amount)
      if (data.date) setValue('transaction_date', data.date)
      setAmountValidation(data.total_validated)
      if (data.category_suggestion?.category_id) {
        setValue('category_id', data.category_suggestion.category_id)
        setSuggestion(data.category_suggestion)
        lastSuggestionRef.current = data.category_suggestion
      }
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : 'Receipt scan failed.')
    } finally {
      setScanLoading(false)
      e.target.value = ''
    }
  }

  const clearSuggestion = () => {
    setSuggestion(null)
    lastSuggestionRef.current = null
    setSuggestionLoading(false)
    setAmountValidation(undefined)
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current)
  }

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  const visibleTransactions = useMemo(() => {
    const needle = search.toLowerCase()

    const filtered = needle
      ? transactions.filter((txn) => {
          const categoryName = categories.find((c) => c.id === txn.category_id)?.name ?? String(txn.category_id)
          return (
            txn.transaction_date.toLowerCase().includes(needle) ||
            (txn.description ?? '').toLowerCase().includes(needle) ||
            categoryName.toLowerCase().includes(needle) ||
            txn.transaction_type.toLowerCase().includes(needle) ||
            txn.amount.toFixed(2).includes(needle)
          )
        })
      : transactions

    return [...filtered].sort((a, b) => {
      let aVal: string | number
      let bVal: string | number

      if (sortKey === 'category') {
        aVal = categories.find((c) => c.id === a.category_id)?.name ?? ''
        bVal = categories.find((c) => c.id === b.category_id)?.name ?? ''
      } else if (sortKey === 'amount') {
        aVal = a.amount
        bVal = b.amount
      } else {
        aVal = (a[sortKey] ?? '') as string
        bVal = (b[sortKey] ?? '') as string
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
  }, [transactions, categories, search, sortKey, sortOrder])

  const onSubmit = async (values: TransactionFormValues) => {
    if (!token) {
      setError('You must be logged in to add transactions.')
      return
    }
    const category = categories.find((item) => item.id === values.category_id)
    if (!category) {
      setError('Select a valid category.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    const capturedSuggestion = lastSuggestionRef.current

    try {
      const response = await fetch(`${apiUrl}/api/v1/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: values.amount,
          transaction_date: values.transaction_date,
          description: values.description || null,
          category_id: values.category_id,
          transaction_type: category.type,
          goal_id: values.goal_id || null
        })
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        const message = data?.detail || 'Failed to create transaction.'
        throw new Error(message)
      }

      const newTransaction = (await response.json()) as Transaction

      if (values.description?.trim()) {
        void fetch(`${apiUrl}/api/v1/transactions/feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            transaction_id: newTransaction.id,
            description: values.description,
            suggested_category_id: capturedSuggestion?.category_id ?? null,
            chosen_category_id: values.category_id,
            source: capturedSuggestion?.source ?? null,
            confidence: capturedSuggestion?.confidence ?? null,
          })
        }).catch(() => { /* silently ignore — must not affect transaction UX */ })
      }

      await loadTransactions()
      setDialogOpen(false)
      clearSuggestion()
      setSuccess('Transaction added successfully.')
      reset({
        amount: 0,
        transaction_date: new Date().toISOString().slice(0, 10),
        description: '',
        category_id: 0,
        goal_id: 0
      })
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Unknown error.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setValue('amount', transaction.amount)
    setValue('transaction_date', transaction.transaction_date)
    setValue('description', transaction.description || '')
    setValue('category_id', transaction.category_id)
    setValue('goal_id', transaction.goal_id ?? 0)
    setEditDialogOpen(true)
  }

  const handleDeleteTransaction = (transaction: Transaction) => {
    setDeletingTransaction(transaction)
    setDeleteDialogOpen(true)
  }

  const onUpdateTransaction = async (values: TransactionFormValues) => {
    if (!token || !editingTransaction) {
      setError('You must be logged in to update transactions.')
      return
    }
    const category = categories.find((item) => item.id === values.category_id)
    if (!category) {
      setError('Select a valid category.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`${apiUrl}/api/v1/transactions/${editingTransaction.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: values.amount,
          transaction_date: values.transaction_date,
          description: values.description || null,
          category_id: values.category_id,
          transaction_type: category.type,
          goal_id: values.goal_id || null
        })
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        const message = data?.detail || 'Failed to update transaction.'
        throw new Error(message)
      }

      await loadTransactions()
      setEditDialogOpen(false)
      setEditingTransaction(null)
      setSuccess('Transaction updated successfully.')
      reset({
        amount: 0,
        transaction_date: new Date().toISOString().slice(0, 10),
        description: '',
        category_id: 0,
        goal_id: 0
      })
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Unknown error.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const confirmDeleteTransaction = async () => {
    if (!token || !deletingTransaction) {
      setError('You must be logged in to delete transactions.')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await fetch(`${apiUrl}/api/v1/transactions/${deletingTransaction.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        const message = data?.detail || 'Failed to delete transaction.'
        throw new Error(message)
      }

      await loadTransactions()
      setDeleteDialogOpen(false)
      setDeletingTransaction(null)
      setSuccess('Transaction deleted successfully.')
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Unknown error.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Typography variant="h4" sx={{ fontWeight: 600, mb: 2 }}>
        Transactions
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <TextField
            size="small"
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flexGrow: 1 }}
          />
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleReceiptScan}
          />
          <Button
            variant="outlined"
            onClick={() => fileInputRef.current?.click()}
            disabled={!token || scanLoading}
          >
            {scanLoading ? 'Scanning...' : 'Scan Receipt'}
          </Button>
          <Button variant="contained" onClick={() => setDialogOpen(true)} disabled={!token}>
            + Add Transaction
          </Button>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="filter-category-label">Category</InputLabel>
            <Select
              labelId="filter-category-label"
              label="Category"
              value={filterCategoryId}
              onChange={(e) =>
                setFilterCategoryId(e.target.value === 'all' ? 'all' : Number(e.target.value))
              }
            >
              <MenuItem value="all">All categories</MenuItem>
              {categories.map((category) => (
                <MenuItem key={category.id} value={category.id}>
                  {category.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="filter-type-label">Type</InputLabel>
            <Select
              labelId="filter-type-label"
              label="Type"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'income' | 'expense')}
            >
              <MenuItem value="all">All types</MenuItem>
              <MenuItem value="income">Income</MenuItem>
              <MenuItem value="expense">Expense</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Start date"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={filterStartDate}
            onChange={(e) => setFilterStartDate(e.target.value)}
          />
          <TextField
            label="End date"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={filterEndDate}
            onChange={(e) => setFilterEndDate(e.target.value)}
          />

          <Box sx={{ flexGrow: 1 }} />

          <Button variant="outlined" onClick={loadTransactions} disabled={!token || isLoadingTransactions}>
            Apply filters
          </Button>
          <Button variant="contained" onClick={handleExportCsv} disabled={!token || isLoadingTransactions}>
            Export CSV
          </Button>
        </Box>
      </Box>

      {!token && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          You must be logged in to view transactions.
          <Button component={RouterLink} to="/login" size="small" sx={{ ml: 2 }} variant="outlined">
            Go to login
          </Button>
        </Alert>
      )}

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

      {isLoadingTransactions ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>
                  <TableSortLabel
                    active={sortKey === 'transaction_date'}
                    direction={sortKey === 'transaction_date' ? sortOrder : 'asc'}
                    onClick={() => handleSort('transaction_date')}
                  >
                    Date
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>
                  <TableSortLabel
                    active={sortKey === 'description'}
                    direction={sortKey === 'description' ? sortOrder : 'asc'}
                    onClick={() => handleSort('description')}
                  >
                    Description
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>
                  <TableSortLabel
                    active={sortKey === 'category'}
                    direction={sortKey === 'category' ? sortOrder : 'asc'}
                    onClick={() => handleSort('category')}
                  >
                    Category
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>
                  <TableSortLabel
                    active={sortKey === 'transaction_type'}
                    direction={sortKey === 'transaction_type' ? sortOrder : 'asc'}
                    onClick={() => handleSort('transaction_type')}
                  >
                    Type
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>
                  <TableSortLabel
                    active={sortKey === 'amount'}
                    direction={sortKey === 'amount' ? sortOrder : 'asc'}
                    onClick={() => handleSort('amount')}
                  >
                    Amount
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleTransactions.map((txn) => (
                <TableRow key={txn.id}>
                  <TableCell>{txn.transaction_date}</TableCell>
                  <TableCell>{txn.description ?? '—'}</TableCell>
                  <TableCell>
                    {categories.find((c) => c.id === txn.category_id)?.name ?? txn.category_id}
                  </TableCell>
                  <TableCell>{txn.transaction_type}</TableCell>
                  <TableCell>${txn.amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleEditTransaction(txn)}
                      disabled={!token}
                      title="Edit transaction"
                    >
                      <Edit />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteTransaction(txn)}
                      disabled={!token}
                      title="Delete transaction"
                      color="error"
                    >
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {visibleTransactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    {search ? 'No transactions match your search.' : 'No transactions yet.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); clearSuggestion() }} fullWidth maxWidth="sm">
        <DialogTitle>Add Transaction</DialogTitle>
        <DialogContent>
          <Box
            component="form"
            id="add-transaction-form"
            onSubmit={handleSubmit(onSubmit)}
            sx={{ display: 'grid', gap: 2, pt: 1 }}
          >
            <TextField
              label="Amount"
              type="number"
              inputProps={{ step: '0.01', min: 0.01 }}
              InputLabelProps={{ shrink: true }}
              {...register('amount', { required: true, valueAsNumber: true, min: 0.01 })}
              disabled={isSubmitting}
            />
            {amountValidation === false && (
              <Typography variant="caption" color="warning.main">
                OCR totals don't match — please verify the amount
              </Typography>
            )}
            {amountValidation === null && (
              <Typography variant="caption" color="text.secondary">
                Could not validate amount — please verify
              </Typography>
            )}

            <TextField
              label="Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              {...register('transaction_date', { required: true })}
              disabled={isSubmitting}
            />

            <TextField
              label="Description"
              placeholder="Optional notes"
              InputLabelProps={{ shrink: true }}
              {...register('description', {
                onChange: (e) => handleDescriptionChange(e.target.value)
              })}
              disabled={isSubmitting}
            />

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <FormControl sx={{ flex: 1 }}>
                <InputLabel id="category-label">Category</InputLabel>
                <Controller
                  name="category_id"
                  control={control}
                  rules={{ required: true, min: 1 }}
                  render={({ field }) => (
                    <Select
                      labelId="category-label"
                      label="Category"
                      {...field}
                      disabled={isSubmitting || isLoadingCategories}
                    >
                      <MenuItem value={0}>Select a category</MenuItem>
                      {categories.map((category) => (
                        <MenuItem key={category.id} value={category.id}>
                          {category.name}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                />
              </FormControl>
              <IconButton
                title="Add new category"
                onClick={() => { resetCat(); setNewCategoryDialogOpen(true) }}
                sx={{ mt: 1 }}
              >
                <Add />
              </IconButton>
            </Box>

            {suggestionLoading && (
              <Typography variant="caption" color="text.secondary">
                Suggesting category…
              </Typography>
            )}
            {!suggestionLoading && suggestion && (
              <Typography variant="caption" color="text.secondary">
                Suggested: <strong>{suggestion.category_name}</strong>{' '}
                ({Math.round(suggestion.confidence * 100)}% confidence
                {suggestion.source === 'rules' ? ', keyword match' : ''})
              </Typography>
            )}

            {selectedCategory && (
              <Typography variant="body2" color="text.secondary">
                Transaction type inferred from category: {selectedCategory.type}
              </Typography>
            )}

            {goals.length > 0 && (
              <FormControl>
                <InputLabel id="goal-label">Link to Goal (optional)</InputLabel>
                <Controller
                  name="goal_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      labelId="goal-label"
                      label="Link to Goal (optional)"
                      {...field}
                      disabled={isSubmitting}
                    >
                      <MenuItem value={0}>None</MenuItem>
                      {goals.map((goal) => (
                        <MenuItem key={goal.id} value={goal.id}>
                          {goal.name}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                />
              </FormControl>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDialogOpen(false); clearSuggestion() }}>Cancel</Button>
          <Button type="submit" form="add-transaction-form" variant="contained" disabled={isSubmitting || isLoadingCategories}>
            {isSubmitting ? 'Saving...' : 'Add transaction'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={editDialogOpen} onClose={() => { setEditDialogOpen(false); setEditingTransaction(null) }} fullWidth maxWidth="sm">
        <DialogTitle>Edit Transaction</DialogTitle>
        <DialogContent>
          <Box
            component="form"
            id="edit-transaction-form"
            onSubmit={handleSubmit(onUpdateTransaction)}
            sx={{ display: 'grid', gap: 2, pt: 1 }}
          >
            <TextField
              label="Amount"
              type="number"
              inputProps={{ step: '0.01', min: 0.01 }}
              InputLabelProps={{ shrink: true }}
              {...register('amount', { required: true, valueAsNumber: true, min: 0.01 })}
              disabled={isSubmitting}
            />

            <TextField
              label="Date"
              type="date"
              InputLabelProps={{ shrink: true }}
              {...register('transaction_date', { required: true })}
              disabled={isSubmitting}
            />

            <TextField
              label="Description"
              placeholder="Optional notes"
              InputLabelProps={{ shrink: true }}
              {...register('description')}
              disabled={isSubmitting}
            />

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <FormControl sx={{ flex: 1 }}>
                <InputLabel id="edit-category-label">Category</InputLabel>
                <Controller
                  name="category_id"
                  control={control}
                  rules={{ required: true, min: 1 }}
                  render={({ field }) => (
                    <Select
                      labelId="edit-category-label"
                      label="Category"
                      {...field}
                      disabled={isSubmitting || isLoadingCategories}
                    >
                      <MenuItem value={0}>Select a category</MenuItem>
                      {categories.map((category) => (
                        <MenuItem key={category.id} value={category.id}>
                          {category.name}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                />
              </FormControl>
              <IconButton
                title="Add new category"
                onClick={() => { resetCat(); setNewCategoryDialogOpen(true) }}
                sx={{ mt: 1 }}
              >
                <Add />
              </IconButton>
            </Box>

            {selectedCategory && (
              <Typography variant="body2" color="text.secondary">
                Transaction type inferred from category: {selectedCategory.type}
              </Typography>
            )}

            {goals.length > 0 && (
              <FormControl>
                <InputLabel id="edit-goal-label">Link to Goal (optional)</InputLabel>
                <Controller
                  name="goal_id"
                  control={control}
                  render={({ field }) => (
                    <Select
                      labelId="edit-goal-label"
                      label="Link to Goal (optional)"
                      {...field}
                      disabled={isSubmitting}
                    >
                      <MenuItem value={0}>None</MenuItem>
                      {goals.map((goal) => (
                        <MenuItem key={goal.id} value={goal.id}>
                          {goal.name}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                />
              </FormControl>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setEditDialogOpen(false); setEditingTransaction(null) }}>Cancel</Button>
          <Button type="submit" form="edit-transaction-form" variant="contained" disabled={isSubmitting || isLoadingCategories}>
            {isSubmitting ? 'Updating...' : 'Update transaction'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={newCategoryDialogOpen} onClose={() => setNewCategoryDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>New Category</DialogTitle>
        <DialogContent>
          <Box
            component="form"
            id="new-category-form"
            onSubmit={handleSubmitCat(handleCreateCategory)}
            sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}
          >
            <TextField
              label="Name"
              required
              fullWidth
              autoFocus
              {...registerCat('name', { required: true })}
              disabled={isCreatingCategory}
            />
            <FormControl fullWidth required>
              <InputLabel>Type</InputLabel>
              <Controller
                name="type"
                control={controlCat}
                render={({ field }) => (
                  <Select {...field} label="Type" disabled={isCreatingCategory}>
                    <MenuItem value="expense">Expense</MenuItem>
                    <MenuItem value="income">Income</MenuItem>
                  </Select>
                )}
              />
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewCategoryDialogOpen(false)}>Cancel</Button>
          <Button type="submit" form="new-category-form" variant="contained" disabled={isCreatingCategory}>
            {isCreatingCategory ? 'Creating…' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => { setDeleteDialogOpen(false); setDeletingTransaction(null) }}>
        <DialogTitle>Delete Transaction</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this transaction?
          </Typography>
          {deletingTransaction && (
            <Box sx={{ 
              mt: 2, 
              p: 2, 
              bgcolor: 'background.paper', 
              border: 1, 
              borderColor: 'divider',
              borderRadius: 1 
            }}>
              <Typography variant="body2" color="text.primary">
                <strong>Date:</strong> {deletingTransaction.transaction_date}
              </Typography>
              <Typography variant="body2" color="text.primary">
                <strong>Description:</strong> {deletingTransaction.description || '—'}
              </Typography>
              <Typography variant="body2" color="text.primary">
                <strong>Category:</strong> {categories.find((c) => c.id === deletingTransaction.category_id)?.name || deletingTransaction.category_id}
              </Typography>
              <Typography variant="body2" color="text.primary">
                <strong>Amount:</strong> ${deletingTransaction.amount.toFixed(2)}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDeleteDialogOpen(false); setDeletingTransaction(null) }}>Cancel</Button>
          <Button 
            onClick={confirmDeleteTransaction} 
            variant="contained" 
            color="error" 
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}

export default Transactions
