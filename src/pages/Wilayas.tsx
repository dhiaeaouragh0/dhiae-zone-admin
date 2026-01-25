// src/pages/Wilayas.tsx
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, Loader2, Search } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

interface Wilaya {
  _id: string;
  numero: number;
  nom: string;
  prixDomicile: number;
  prixAgence: number;
  createdAt: string;
  updatedAt: string;
}

export default function Wilayas() {
  const [wilayas, setWilayas] = useState<Wilaya[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingWilaya, setEditingWilaya] = useState<Wilaya | null>(null);
  const [newWilaya, setNewWilaya] = useState({
    numero: '',
    nom: '',
    prixDomicile: '',
    prixAgence: '',
  });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchWilayas = async () => {
    try {
      setLoading(true);
      const res = await api.get('/shipping-wilayas');
      setWilayas(res.data || []);
    } catch (err: any) {
      console.error('Wilayas fetch error:', err);
      toast.error('Impossible de charger les wilayas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWilayas();
  }, []);

  // Filter wilayas client-side (simple search by nom or numero)
  const filteredWilayas = wilayas.filter(
    (w) =>
      w.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(w.numero).includes(searchTerm)
  );

  const handleAdd = async () => {
    try {
      const { numero, nom, prixDomicile, prixAgence } = newWilaya;

      if (!numero || !nom || !prixDomicile || !prixAgence) {
        toast.error('Tous les champs sont obligatoires');
        return;
      }

      const res = await api.post('/shipping-wilayas', {
        numero: Number(numero),
        nom,
        prixDomicile: Number(prixDomicile),
        prixAgence: Number(prixAgence),
      });

      toast.success('Wilaya ajoutée');
      setWilayas((prev) => [...prev, res.data]);
      setNewWilaya({ numero: '', nom: '', prixDomicile: '', prixAgence: '' });
      setIsAddDialogOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur lors de l\'ajout');
    }
  };

  const handleUpdate = async () => {
    if (!editingWilaya) return;

    try {
      const res = await api.put(`/shipping-wilayas/${editingWilaya.numero}`, {
        nom: editingWilaya.nom,
        prixDomicile: editingWilaya.prixDomicile,
        prixAgence: editingWilaya.prixAgence,
      });

      toast.success('Prix mis à jour');
      setWilayas((prev) =>
        prev.map((w) => (w._id === res.data._id ? res.data : w))
      );
      setEditingWilaya(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur lors de la mise à jour');
    }
  };

  const handleDelete = async (numero: number) => {
    try {
      await api.delete(`/shipping-wilayas/${numero}`);
      toast.success('Wilaya supprimée');
      setWilayas((prev) => prev.filter((w) => w.numero !== numero));
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Wilayas & Livraison</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter une wilaya
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ajouter une nouvelle wilaya</DialogTitle>
              <DialogDescription>
                Entrez les informations de la nouvelle wilaya de livraison.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="numero" className="text-right">
                  N°
                </Label>
                <Input
                  id="numero"
                  type="number"
                  className="col-span-3"
                  value={newWilaya.numero}
                  onChange={(e) => setNewWilaya({ ...newWilaya, numero: e.target.value })}
                  placeholder="1 à 58"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="nom" className="text-right">
                  Nom
                </Label>
                <Input
                  id="nom"
                  className="col-span-3"
                  value={newWilaya.nom}
                  onChange={(e) => setNewWilaya({ ...newWilaya, nom: e.target.value })}
                  placeholder="ex: ALGER"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="prixDomicile" className="text-right">
                  Domicile
                </Label>
                <Input
                  id="prixDomicile"
                  type="number"
                  className="col-span-3"
                  value={newWilaya.prixDomicile}
                  onChange={(e) => setNewWilaya({ ...newWilaya, prixDomicile: e.target.value })}
                  placeholder="ex: 500"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="prixAgence" className="text-right">
                  Agence
                </Label>
                <Input
                  id="prixAgence"
                  type="number"
                  className="col-span-3"
                  value={newWilaya.prixAgence}
                  onChange={(e) => setNewWilaya({ ...newWilaya, prixAgence: e.target.value })}
                  placeholder="ex: 400"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Annuler
              </Button>
              <Button onClick={handleAdd}>Ajouter</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search & Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Gestion des frais de livraison</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="relative mb-6 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom ou numéro..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredWilayas.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchTerm ? 'Aucune wilaya correspond à votre recherche' : 'Aucune wilaya trouvée'}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">N°</TableHead>
                    <TableHead>Wilaya</TableHead>
                    <TableHead className="text-left">Domicile (DA)</TableHead>
                    <TableHead className="text-left">Agence (DA)</TableHead>
                    <TableHead className="w-24 text-left">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredWilayas.map((wilaya) => (
                    <TableRow key={wilaya._id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{wilaya.numero}</TableCell>
                      <TableCell>{wilaya.nom}</TableCell>

                      <TableCell className="text-left">
                        {editingWilaya?._id === wilaya._id ? (
                          <Input
                            type="number"
                            value={editingWilaya.prixDomicile}
                            onChange={(e) =>
                              setEditingWilaya({
                                ...editingWilaya,
                                prixDomicile: Number(e.target.value),
                              })
                            }
                            className="w-24 text-left"
                          />
                        ) : (
                          wilaya.prixDomicile.toLocaleString()
                        )}
                      </TableCell>

                      <TableCell className="text-left">
                        {editingWilaya?._id === wilaya._id ? (
                          <Input
                            type="number"
                            value={editingWilaya.prixAgence}
                            onChange={(e) =>
                              setEditingWilaya({
                                ...editingWilaya,
                                prixAgence: Number(e.target.value),
                              })
                            }
                            className="w-24 text-left"
                          />
                        ) : (
                          wilaya.prixAgence.toLocaleString()
                        )}
                      </TableCell>

                      <TableCell className="text-right space-x-1">
                        {editingWilaya?._id === wilaya._id ? (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={handleUpdate}
                            >
                              Enregistrer
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingWilaya(null)}
                            >
                              Annuler
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditingWilaya({ ...wilaya })}
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
                                  <AlertDialogTitle>Supprimer cette wilaya ?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Vous allez supprimer définitivement la wilaya « {wilaya.nom} » ({wilaya.numero}). 
                                    Cette action est irréversible.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-red-600 hover:bg-red-700"
                                    onClick={() => handleDelete(wilaya.numero)}
                                    disabled={deletingId === wilaya._id}
                                  >
                                    {deletingId === wilaya._id ? 'Suppression...' : 'Supprimer'}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}