// src/pages/Orders/OrderList.tsx
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Search, Eye, CheckCircle2, Truck, PackageCheck, XCircle, Clock } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// ──────────────────────────────────────────────── Types
interface ProductPopulated {
  _id: string;
  name: string;
  slug: string;
}

interface Order {
  _id: string;
  product: ProductPopulated;
  variantName?: string | null;
  quantity: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  wilaya: string;
  deliveryType: 'domicile' | 'agence';
  address: string;
  note?: string;
  productPrice: number;
  shippingFee: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending:   { label: 'En attente',   color: 'bg-yellow-100 text-yellow-800 border-yellow-300', icon: Clock },
  confirmed: { label: 'Confirmée',    color: 'bg-blue-100 text-blue-800 border-blue-300',   icon: CheckCircle2 },
  shipped:   { label: 'Expédiée',     color: 'bg-purple-100 text-purple-800 border-purple-300', icon: Truck },
  delivered: { label: 'Livrée',       color: 'bg-green-100 text-green-800 border-green-300',  icon: PackageCheck },
  cancelled: { label: 'Annulée',      color: 'bg-red-100 text-red-800 border-red-300',     icon: XCircle },
};

export default function OrderList() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params: any = {
        limit: 20,
        sort: '-createdAt',
      };

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      // Optional: if backend supports search
      // if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await api.get('/orders', { params });

      // Your backend returns { orders: [...], currentPage, totalPages, totalOrders, ... }
      setOrders(res.data.orders || res.data || []);
    } catch (err: any) {
      console.error('Orders fetch error:', err);
      toast.error('Impossible de charger les commandes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      setUpdatingId(orderId);

      // Optional: extra safety (though Select already limits values)
      const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const;
      if (!validStatuses.includes(newStatus as any)) {
        throw new Error('Statut invalide');
      }

      await api.put(`/orders/${orderId}/status`, { status: newStatus });

      toast.success('Statut mis à jour');

      setOrders((prev: Order[]) =>
        prev.map((o) =>
          o._id === orderId ? { ...o, status: newStatus as Order['status'] } : o
        )
      );
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur lors de la mise à jour');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredOrders = orders.filter((order) =>
    searchTerm.trim() === '' ||
    order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customerPhone.includes(searchTerm) ||
    order.customerEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Commandes</h1>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filtres</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4 flex-wrap">
          {/* Status */}
          <div className="w-full sm:w-48">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="confirmed">Confirmée</SelectItem>
                <SelectItem value="shipped">Expédiée</SelectItem>
                <SelectItem value="delivered">Livrée</SelectItem>
                <SelectItem value="cancelled">Annulée</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-62.5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Client, téléphone ou email..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0 pt-6">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              {searchTerm || statusFilter !== 'all'
                ? 'Aucune commande ne correspond aux filtres'
                : 'Aucune commande pour le moment'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Produit</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Wilaya / Type</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {

                    return (
                      <TableRow key={order._id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="font-medium">{order.customerName}</div>
                          <div className="text-xs text-muted-foreground">
                            {order.customerPhone}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="font-medium">
                            {order.product?.name || 'Produit supprimé'}
                          </div>
                          {order.variantName && (
                            <div className="text-xs text-muted-foreground">
                              Variante : {order.variantName}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            × {order.quantity}
                          </div>
                        </TableCell>

                        <TableCell className="font-medium whitespace-nowrap">
                          {order.totalPrice.toLocaleString()} DA
                        </TableCell>

                        <TableCell>
                          <div>{order.wilaya}</div>
                          <div className="text-xs text-muted-foreground">
                            {order.deliveryType === 'domicile' ? 'À domicile' : 'En agence'}
                          </div>
                        </TableCell>

                        <TableCell>
                          <Select
                            value={order.status}
                            onValueChange={(newStatus) =>
                              handleStatusChange(order._id, newStatus)
                            }
                            disabled={updatingId === order._id}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">
                                <Clock className="inline mr-2 h-4 w-4" /> En attente
                              </SelectItem>
                              <SelectItem value="confirmed">
                                <CheckCircle2 className="inline mr-2 h-4 w-4" /> Confirmée
                              </SelectItem>
                              <SelectItem value="shipped">
                                <Truck className="inline mr-2 h-4 w-4" /> Expédiée
                              </SelectItem>
                              <SelectItem value="delivered">
                                <PackageCheck className="inline mr-2 h-4 w-4" /> Livrée
                              </SelectItem>
                              <SelectItem value="cancelled">
                                <XCircle className="inline mr-2 h-4 w-4" /> Annulée
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>

                        <TableCell>
                          {format(new Date(order.createdAt), 'dd MMM yyyy HH:mm', { locale: fr })}
                        </TableCell>

                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" title="Voir détails">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}