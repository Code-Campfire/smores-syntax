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
  Divider,
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
import { Edit, Delete } from '@mui/icons-material'
import { Controller, useForm } from 'react-hook-form'

type Category = {
  id: number
  user_id: number | null
  name: string
  type: 'income' | 'expense'
  description: string | null
  icon: string | null
  color: string | null
  parent_category_id: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

type CategoryFormValues = {
  name: string
  type: string
  description: string
  icon: string
  color: string
  parent_category_id: string
}

type TypeFilter = 'all' | 'income' | 'expense'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function Categories() {
  const [token] = useState(() => localStorage.getItem('access_token') || '')
  const [customCategories, setCustomCategories] = useState<Category[]>([])
  const [systemCategories, setSystemCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)

  const { register, handleSubmit, reset, control } = useForm<CategoryFormValues>({
    defaultValues: { name: '', type: 'expense', description: '', icon: '', color: '', parent_category_id: '' },
  })

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    reset: resetEdit,
    control: controlEdit,
  } = useForm<CategoryFormValues>({
    defaultValues: { name: '', type: 'expense', description: '', icon: '', color: '', parent_category_id: '' },
  })

  const loadCategories = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [customRes, systemRes] = await Promise.all([
        fetch(`${apiUrl}/api/v1/categories/`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${apiUrl}/api/v1/categories/system`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      if (!customRes.ok) throw new Error('Failed to load custom categories.')
      if (!systemRes.ok) throw new Error('Failed to load system categories.')
      const all: Category[] = await customRes.json()
      setCustomCategories(all.filter((c) => c.user_id !== null))
      setSystemCategories(await systemRes.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories.')
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  const filteredCustom = customCategories.filter(
    (c) => typeFilter === 'all' || c.type === typeFilter
  )
  const filteredSystem = systemCategories.filter(
    (c) => typeFilter === 'all' || c.type === typeFilter
  )

  const onSubmit = async (values: CategoryFormValues) => {
    setIsSubmitting(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        name: values.name,
        type: values.type,
      }
      if (values.description) body.description = values.description
      if (values.icon) body.icon = values.icon
      if (values.color) body.color = values.color
      if (values.parent_category_id) body.parent_category_id = parseInt(values.parent_category_id)

      const res = await fetch(`${apiUrl}/api/v1/categories/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.detail || 'Failed to create category.')
      }
      reset()
      setDialogOpen(false)
      setSuccess('Category created.')
      loadCategories()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openEditDialog = (cat: Category) => {
    setSelectedCategory(cat)
    resetEdit({
      name: cat.name,
      type: cat.type,
      description: cat.description || '',
      icon: cat.icon || '',
      color: cat.color || '',
      parent_category_id: cat.parent_category_id ? String(cat.parent_category_id) : '',
    })
    setEditDialogOpen(true)
  }

  const onUpdate = async (values: CategoryFormValues) => {
    if (!selectedCategory) return
    setIsSubmitting(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {}
      if (values.name) body.name = values.name
      if (values.type) body.type = values.type
      if (values.description !== undefined) body.description = values.description || null
      if (values.icon !== undefined) body.icon = values.icon || null
      if (values.color !== undefined) body.color = values.color || null
      if (values.parent_category_id) body.parent_category_id = parseInt(values.parent_category_id)

      const res = await fetch(`${apiUrl}/api/v1/categories/${selectedCategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.detail || 'Failed to update category.')
      }
      setEditDialogOpen(false)
      setSelectedCategory(null)
      setSuccess('Category updated.')
      loadCategories()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update category.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const openDeleteDialog = (cat: Category) => {
    setSelectedCategory(cat)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!selectedCategory) return
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`${apiUrl}/api/v1/categories/${selectedCategory.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.detail || 'Failed to delete category.')
      }
      setDeleteDialogOpen(false)
      setSelectedCategory(null)
      setSuccess('Category deactivated.')
      loadCategories()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete category.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const CategoryTable = ({ rows, editable }: { rows: Category[]; editable: boolean }) => (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Description</TableCell>
            <TableCell>Active</TableCell>
            {editable && <TableCell align="right">Actions</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={editable ? 5 : 4} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                No categories found.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((cat) => (
              <TableRow key={cat.id} sx={!cat.is_active ? { opacity: 0.5 } : undefined}>
                <TableCell>
                  {cat.icon && <span style={{ marginRight: 6 }}>{cat.icon}</span>}
                  {cat.name}
                </TableCell>
                <TableCell>
                  <Chip
                    label={cat.type}
                    size="small"
                    color={cat.type === 'income' ? 'success' : 'error'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>{cat.description || '—'}</TableCell>
                <TableCell>
                  <Chip
                    label={cat.is_active ? 'Active' : 'Inactive'}
                    size="small"
                    color={cat.is_active ? 'success' : 'default'}
                  />
                </TableCell>
                {editable && (
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => openEditDialog(cat)}>
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => openDeleteDialog(cat)} color="error" disabled={!cat.is_active}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )

  const CategoryForm = ({
    formId,
    onFormSubmit,
    reg,
    ctrl,
  }: {
    formId: string
    onFormSubmit: (e: React.FormEvent) => void
    reg: typeof register
    ctrl: typeof control
  }) => (
    <Box component="form" id={formId} onSubmit={onFormSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
      <TextField label="Name" required fullWidth {...reg('name', { required: true })} />
      <FormControl fullWidth required>
        <InputLabel>Type</InputLabel>
        <Controller
          name="type"
          control={ctrl}
          render={({ field }) => (
            <Select {...field} label="Type">
              <MenuItem value="expense">Expense</MenuItem>
              <MenuItem value="income">Income</MenuItem>
            </Select>
          )}
        />
      </FormControl>
      <TextField label="Description (optional)" fullWidth {...reg('description')} />
      <TextField label="Icon (optional, e.g. emoji)" fullWidth {...reg('icon')} />
      <TextField label="Color (optional, e.g. #ff0000)" fullWidth {...reg('color')} />
      <FormControl fullWidth>
        <InputLabel>Parent Category (optional)</InputLabel>
        <Controller
          name="parent_category_id"
          control={ctrl}
          render={({ field }) => (
            <Select {...field} label="Parent Category (optional)">
              <MenuItem value="">None</MenuItem>
              {customCategories.map((c) => (
                <MenuItem key={c.id} value={String(c.id)}>
                  {c.name}
                </MenuItem>
              ))}
            </Select>
          )}
        />
      </FormControl>
    </Box>
  )

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Categories</Typography>
        <Button variant="contained" onClick={() => { reset(); setDialogOpen(true) }}>
          Add Category
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
        {(['all', 'income', 'expense'] as TypeFilter[]).map((t) => (
          <Chip
            key={t}
            label={t.charAt(0).toUpperCase() + t.slice(1)}
            onClick={() => setTypeFilter(t)}
            color={typeFilter === t ? 'primary' : 'default'}
            variant={typeFilter === t ? 'filled' : 'outlined'}
          />
        ))}
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Typography variant="h6" sx={{ mb: 1 }}>
            My Custom Categories
          </Typography>
          <CategoryTable rows={filteredCustom} editable />

          <Divider sx={{ my: 4 }} />

          <Typography variant="h6" sx={{ mb: 1 }}>
            System Categories
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            These are built-in categories available to all users. They cannot be edited or deleted.
          </Typography>
          <CategoryTable rows={filteredSystem} editable={false} />
        </>
      )}

      {/* Add Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Add Category</DialogTitle>
        <DialogContent>
          <CategoryForm
            formId="add-category-form"
            onFormSubmit={handleSubmit(onSubmit)}
            reg={register}
            ctrl={control}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button type="submit" form="add-category-form" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Category</DialogTitle>
        <DialogContent>
          <CategoryForm
            formId="edit-category-form"
            onFormSubmit={handleSubmitEdit(onUpdate)}
            reg={registerEdit}
            ctrl={controlEdit}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button type="submit" form="edit-category-form" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Deactivate Category</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to deactivate <strong>{selectedCategory?.name}</strong>? It will no longer appear in transaction dropdowns.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Deactivating…' : 'Deactivate'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  )
}

export default Categories
