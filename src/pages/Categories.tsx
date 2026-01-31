// src/pages/Categories.tsx
import { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Search, Loader2 } from 'lucide-react';
import api from '@/lib/api';

// ──────────────────────────────────────────────── Types
interface Category {
  _id: string;
  name: string;
  slug: string;
  description: string;
  parent?: {
    _id: string;
    name: string;
  } | null;
  createdAt: string;
}

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Create / Edit modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formParentId, setFormParentId] = useState<string>('none');

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await api.get('/categories');
      setCategories(res.data || []);
    } catch (err: any) {
      toast.error('Impossible de charger les catégories');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Filtered list
  const filteredCategories = categories.filter(
    (cat) =>
      cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cat.slug.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormName('');
    setFormDescription('');
    setFormParentId('none');
    setIsModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormDescription(cat.description || '');
    setFormParentId(cat.parent?._id || 'none');
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) {
      toast.error('Le nom est obligatoire');
      return;
    }

    try {
      const payload = {
        name: formName.trim(),
        description: formDescription.trim(),
        parent: formParentId === 'none' ? null : formParentId,
      };

      let res;
      if (editingCategory) {
        // Update
        res = await api.put(`/categories/${editingCategory._id}`, payload);
        toast.success('Catégorie modifiée');
      } else {
        // Create
        res = await api.post('/categories', payload);
        toast.success('Catégorie créée');
      }

      setIsModalOpen(false);
      fetchCategories(); // Refresh list
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur sauvegarde');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await api.delete(`/categories/${deleteId}`);
      toast.success('Catégorie supprimée');
      setDeleteId(null);
      fetchCategories();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur suppression');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Catégories</h1>
        <Button onClick={openCreateModal}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle catégorie
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Rechercher</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Nom ou slug..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0 pt-6">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              {searchTerm ? 'Aucune catégorie ne correspond' : 'Aucune catégorie pour le moment'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Parent</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCategories.map((cat) => (
                    <TableRow key={cat._id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">
                        {cat.name}
                        <div className="text-xs text-muted-foreground">{cat.slug}</div>
                      </TableCell>
                      <TableCell>{cat.description || '—'}</TableCell>
                      <TableCell>
                        {cat.parent ? cat.parent.name : <span className="text-muted-foreground">Racine</span>}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(cat)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Supprimer cette catégorie ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Vous allez supprimer "{cat.name}". Les sous-catégories seront aussi supprimées. Cette action est irréversible.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700"
                                onClick={() => {
                                  setDeleteId(cat._id);
                                  handleDelete();
                                }}
                              >
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? 'Modifiez les informations de la catégorie.'
                : 'Créez une nouvelle catégorie pour organiser vos produits.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nom *
              </Label>
              <Input
                id="name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="col-span-3"
                placeholder="ex: PlayStation"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="col-span-3"
                placeholder="Description optionnelle..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="parent" className="text-right">
                Parent
              </Label>
              <Select value={formParentId} onValueChange={setFormParentId}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Aucun (catégorie principale)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun (racine)</SelectItem>
                  {categories
                    .filter((cat) => cat._id !== editingCategory?._id) // Évite de choisir soi-même comme parent
                    .map((cat) => (
                      <SelectItem key={cat._id} value={cat._id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={!formName.trim()}>
              {editingCategory ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}