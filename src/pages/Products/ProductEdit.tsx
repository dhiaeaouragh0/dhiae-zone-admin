// src/pages/Products/ProductEdit.tsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, Trash2, Upload, X, Loader2 } from 'lucide-react';
import api from '@/lib/api';

// ──────────────────────────────────────────────── Types
interface Category {
  _id: string;
  name: string;
}

interface ImageItem {
  file?: File;       // nouvelle image locale (à uploader)
  preview?: string;  // URL de preview local (URL.createObjectURL)
  url?: string;      // URL déjà présente sur le serveur (Cloudinary, etc.)
}

interface Variant {
  _id?: string;              // présent si variante existante
  name: string;
  sku: string;
  priceDifference: number;
  stock: number;
  isDefault: boolean;
  images: ImageItem[];       // mix images existantes + nouvelles
}

interface Spec {
  key: string;
  value: string;
}

export default function ProductEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // ── Form states ────────────────────────────────────────
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState<number | ''>('');
  const [globalStock, setGlobalStock] = useState<number | ''>('');
  const [discount, setDiscount] = useState<number | ''>(0);
  const [brand, setBrand] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [isFeatured, setIsFeatured] = useState(false);

  const [variants, setVariants] = useState<Variant[]>([]);
  const [specs, setSpecs] = useState<Spec[]>([]);

  // Images globales
  const [globalImages, setGlobalImages] = useState<ImageItem[]>([]); // mix existant + nouveau

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Générer slug en temps réel
  useEffect(() => {
    if (name.trim()) {
      const generated = name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+|-+$/g, '')
        .trim();
      setSlug(generated);
    }
  }, [name]);

  // Fetch product + categories
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Categories
        const catRes = await api.get('/categories');
        setCategories(catRes.data || []);

        // Product
        const prodRes = await api.get(`/products/${id}`);
        const prod = prodRes.data;

        setName(prod.name || '');
        setSlug(prod.slug || '');
        setDescription(prod.description || '');
        setBasePrice(prod.basePrice || '');
        setDiscount(prod.discount || 0);
        setBrand(prod.brand || '');
        setCategoryId(prod.category?._id || prod.category || '');
        setIsFeatured(!!prod.isFeatured);

        // Global images → format ImageItem
        const globalImgs: ImageItem[] = (prod.images || []).map((url: string) => ({
          url,
          preview: url, // on utilise l'URL serveur comme preview
        }));
        setGlobalImages(globalImgs);

        setGlobalStock(prod.stock ?? '');

        // Variants
        const loadedVariants: Variant[] = (prod.variants || []).map((v: any) => ({
          _id: v._id,
          name: v.name || '',
          sku: v.sku || '',
          priceDifference: v.priceDifference || 0,
          stock: v.stock || 0,
          isDefault: !!v.isDefault,
          images: (v.images || []).map((url: string) => ({
            url,
            preview: url,
          })),
        }));
        setVariants(loadedVariants);

        // Specs
        const specsArr: Spec[] = [];
        if (prod.specs && typeof prod.specs === 'object') {
          Object.entries(prod.specs).forEach(([key, value]) => {
            if (typeof value === 'string') {
              specsArr.push({ key, value });
            }
          });
        }
        setSpecs(specsArr);
      } catch (err: any) {
        toast.error('Erreur lors du chargement du produit');
        console.error(err);
      } finally {
        setLoadingProduct(false);
        setLoadingCategories(false);
      }
    };

    if (id) fetchData();
  }, [id]);

  // ── Images globales ────────────────────────────────────
  const handleGlobalImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);

    if (globalImages.length + newFiles.length > 5) {
      toast.error('Maximum 5 images globales');
      return;
    }

    const newItems: ImageItem[] = newFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setGlobalImages((prev) => [...prev, ...newItems]);
  };

  const removeGlobalImage = (index: number) => {
    setGlobalImages((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadGlobalImages = async (): Promise<string[]> => {
    const newFiles = globalImages.filter((img) => img.file);
    if (newFiles.length === 0) {
      return globalImages.map((img) => img.url!).filter(Boolean);
    }

    setUploading(true);
    try {
      const formData = new FormData();
      newFiles.forEach(({ file }) => file && formData.append('images', file));

      const res = await api.post('/products/upload-images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const newUrls = res.data.urls || [];
      toast.success(`${newUrls.length} nouvelle(s) image(s) globale(s) uploadée(s)`);

      // On garde les anciennes URLs + nouvelles
      const oldUrls = globalImages.filter((img) => !img.file).map((img) => img.url!);
      const finalUrls = [...oldUrls, ...newUrls];

      // Mise à jour pour affichage (optionnel mais cohérent)
      setGlobalImages(
        finalUrls.map((url) => ({ url, preview: url }))
      );

      return finalUrls;
    } catch (err: any) {
      toast.error('Erreur lors de l’upload des images globales');
      console.error(err);
      return globalImages.filter((img) => img.url).map((img) => img.url!);
    } finally {
      setUploading(false);
    }
  };

  // ── Variantes ──────────────────────────────────────────
  const addVariant = () => {
    setVariants([
      ...variants,
      {
        name: '',
        sku: '',
        priceDifference: 0,
        stock: 0,
        isDefault: false,
        images: [],
      },
    ]);
  };

  const removeVariant = (index: number) => {
    setVariants(variants.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, field: keyof Variant, value: any) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  };

  const handleVariantImageChange = (e: React.ChangeEvent<HTMLInputElement>, variantIndex: number) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files);

    const current = variants[variantIndex];
    if (current.images.length + newFiles.length > 5) {
      toast.error('Maximum 5 images par variante');
      return;
    }

    const newItems: ImageItem[] = newFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    const updatedVariants = [...variants];
    updatedVariants[variantIndex].images.push(...newItems);
    setVariants(updatedVariants);
  };

  const removeVariantImage = (variantIndex: number, imageIndex: number) => {
    const updated = [...variants];
    updated[variantIndex].images = updated[variantIndex].images.filter((_, i) => i !== imageIndex);
    setVariants(updated);
  };

  const uploadVariantImages = async (variantIndex: number): Promise<string[]> => {
    const variant = variants[variantIndex];
    const newFiles = variant.images.filter((img) => img.file);

    if (newFiles.length === 0) {
      return variant.images.map((img) => img.url!).filter(Boolean);
    }

    try {
      const formData = new FormData();
      newFiles.forEach(({ file }) => file && formData.append('images', file));

      const res = await api.post('/products/upload-images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const newUrls = res.data.urls || [];

      // Anciennes URLs + nouvelles
      const oldUrls = variant.images.filter((img) => !img.file).map((img) => img.url!);
      const final = [...oldUrls, ...newUrls];

      // Mise à jour locale
      const updatedVariants = [...variants];
      updatedVariants[variantIndex].images = final.map((url) => ({ url, preview: url }));
      setVariants(updatedVariants);

      return final;
    } catch (err) {
      toast.error(`Erreur upload images variante ${variant.name}`);
      return variant.images.map((img) => img.url || '').filter(Boolean);
    }
  };

  // ── Specs ──────────────────────────────────────────────
  const addSpec = () => setSpecs([...specs, { key: '', value: '' }]);
  const removeSpec = (index: number) => setSpecs(specs.filter((_, i) => i !== index));
  const updateSpec = (index: number, field: 'key' | 'value', val: string) => {
    const updated = [...specs];
    updated[index][field] = val;
    setSpecs(updated);
  };

  // ── Submit ─────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation de base
    if (!name.trim() || !description.trim() || basePrice === '' || !categoryId) {
      toast.error('Champs obligatoires manquants');
      return;
    }

    if (variants.length > 0) {
      if (!variants.some((v) => v.isDefault)) {
        toast.error('Sélectionnez une variante par défaut');
        return;
      }
    } else if (globalStock === '') {
      toast.error('Indiquez le stock global (sans variantes)');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Upload images globales
      const finalGlobalUrls = await uploadGlobalImages();

      // 2. Upload images variantes
      const variantsCopy = [...variants];
      for (let i = 0; i < variantsCopy.length; i++) {
        const urls = await uploadVariantImages(i);
        variantsCopy[i].images = urls.map((url) => ({ url, preview: url }));
      }
      setVariants(variantsCopy); // optionnel – déjà mis à jour dans uploadVariantImages

      // 3. Préparer specs
      const specsObj: Record<string, string> = {};
      specs.forEach((s) => {
        if (s.key.trim() && s.value.trim()) {
          specsObj[s.key.trim()] = s.value.trim();
        }
      });

      // 4. Préparer variants pour l'API
      const cleanVariants = variantsCopy.map((v) => ({
        _id: v._id, // important pour update
        name: v.name.trim(),
        sku: v.sku.trim(),
        priceDifference: Number(v.priceDifference) || 0,
        stock: Number(v.stock) || 0,
        images: v.images.map((img) => img.url).filter(Boolean) as string[],
        isDefault: v.isDefault,
      }));

      // 5. Payload
      const payload: any = {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
        basePrice: Number(basePrice),
        discount: Number(discount) || 0,
        category: categoryId,
        brand: brand.trim() || undefined,
        images: finalGlobalUrls,
        specs: Object.keys(specsObj).length > 0 ? specsObj : undefined,
        isFeatured,
      };

      if (variants.length > 0) {
        payload.variants = cleanVariants;
        payload.stock = undefined; // ou total si backend le calcule
      } else {
        payload.variants = undefined;
        payload.stock = Number(globalStock) || 0;
      }

      await api.put(`/products/${id}`, payload);

      toast.success('Produit modifié avec succès !');
      navigate('/products');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur lors de la modification');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingProduct || loadingCategories) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Modifier le produit</h1>
        <Button variant="outline" onClick={() => navigate('/products')}>
          Retour
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Informations principales */}
        <Card>
          <CardHeader>
            <CardTitle>Informations principales</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Nom *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input value={slug} readOnly className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label>Marque</Label>
              <Input value={brand} onChange={(e) => setBrand(e.target.value)} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label>Description *</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} required />
            </div>
            <div className="space-y-2">
              <Label>Prix de base (DA) *</Label>
              <Input
                type="number"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value ? Number(e.target.value) : '')}
                min={0}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Remise (%)</Label>
              <Input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(e.target.value ? Number(e.target.value) : 0)}
                min={0}
                max={100}
              />
            </div>
            <div className="space-y-2">
              <Label>Catégorie *</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat._id} value={cat._id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 pt-8">
              <Switch checked={isFeatured} onCheckedChange={setIsFeatured} id="featured" />
              <Label htmlFor="featured">Produit mis en avant</Label>
            </div>
          </CardContent>
        </Card>

        {/* Images globales */}
        <Card>
          <CardHeader>
            <CardTitle>
              {variants.length === 0 ? 'Images du produit' : 'Images globales (optionnelles)'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('global-image-upload')?.click()}
                  disabled={uploading || globalImages.length >= 5 || submitting}
                >
                  {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  {uploading ? 'Upload...' : 'Ajouter images'}
                </Button>
                <input
                  id="global-image-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleGlobalImageChange}
                />
                <span className="text-sm text-muted-foreground">
                  {globalImages.length} / 5
                </span>
              </div>

              {globalImages.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {globalImages.map((img, idx) => (
                    <div key={idx} className="relative group rounded-md overflow-hidden border">
                      <img
                        src={img.preview}
                        alt="global"
                        className="h-32 w-full object-cover"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100"
                        onClick={() => removeGlobalImage(idx)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Variantes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Variantes (optionnel)</CardTitle>
            <Button type="button" variant="outline" onClick={addVariant}>
              <Plus className="mr-2 h-4 w-4" /> Ajouter variante
            </Button>
          </CardHeader>
          <CardContent>
            {variants.length === 0 ? (
              <p className="text-center py-6 text-muted-foreground">
                Pas de variantes → utilisation des images et stock globaux
              </p>
            ) : (
              <div className="space-y-8">
                {variants.map((variant, idx) => (
                  <div key={idx} className="border rounded-lg p-5 relative bg-muted/30">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-3 right-3 text-red-600 hover:text-red-700"
                      onClick={() => removeVariant(idx)}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>

                    <div className="grid gap-4 md:grid-cols-5 mb-6">
                      <div>
                        <Label>Nom *</Label>
                        <Input
                          value={variant.name}
                          onChange={(e) => updateVariant(idx, 'name', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label>SKU *</Label>
                        <Input
                          value={variant.sku}
                          onChange={(e) => updateVariant(idx, 'sku', e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label>Supplément prix</Label>
                        <Input
                          type="number"
                          value={variant.priceDifference}
                          onChange={(e) => updateVariant(idx, 'priceDifference', Number(e.target.value) || 0)}
                        />
                      </div>
                      <div>
                        <Label>Stock</Label>
                        <Input
                          type="number"
                          value={variant.stock}
                          onChange={(e) => updateVariant(idx, 'stock', Number(e.target.value) || 0)}
                          min={0}
                        />
                      </div>
                      <div className="flex items-end">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`default-${idx}`}
                            checked={variant.isDefault}
                            onChange={(e) => updateVariant(idx, 'isDefault', e.target.checked)}
                          />
                          <Label htmlFor={`default-${idx}`}>Par défaut</Label>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6">
                      <Label>Images de cette variante (max 5)</Label>
                      <div className="flex items-center gap-3 mt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById(`variant-upload-${idx}`)?.click()}
                        >
                          <Upload className="mr-2 h-4 w-4" /> Ajouter
                        </Button>
                        <input
                          id={`variant-upload-${idx}`}
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => handleVariantImageChange(e, idx)}
                        />
                      </div>

                      {variant.images.length > 0 && (
                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 mt-4">
                          {variant.images.map((img, imgIdx) => (
                            <div key={imgIdx} className="relative group">
                              <img
                                src={img.preview}
                                alt="variant"
                                className="h-24 w-full object-cover rounded border"
                              />
                              <Button
                                variant="destructive"
                                size="icon"
                                className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100"
                                onClick={() => removeVariantImage(idx, imgIdx)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stock global – seulement si pas de variantes */}
        {variants.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Stock du produit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-w-md space-y-2">
                <Label>Stock total disponible *</Label>
                <Input
                  type="number"
                  value={globalStock}
                  onChange={(e) => setGlobalStock(e.target.value ? Number(e.target.value) : '')}
                  min={0}
                  required
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Spécifications */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Spécifications</CardTitle>
            <Button type="button" variant="outline" onClick={addSpec}>
              <Plus className="mr-2 h-4 w-4" /> Ajouter
            </Button>
          </CardHeader>
          <CardContent>
            {specs.length === 0 ? (
              <p className="text-center py-10 text-muted-foreground">
                Ajoutez des caractéristiques (Poids, Dimensions, Couleur, etc.)
              </p>
            ) : (
              <div className="space-y-5">
                {specs.map((spec, idx) => (
                  <div key={idx} className="flex gap-4 items-end">
                    <div className="flex-1">
                      <Label>Clé</Label>
                      <Input
                        value={spec.key}
                        onChange={(e) => updateSpec(idx, 'key', e.target.value)}
                        placeholder="ex: Matériau"
                      />
                    </div>
                    <div className="flex-1">
                      <Label>Valeur</Label>
                      <Input
                        value={spec.value}
                        onChange={(e) => updateSpec(idx, 'value', e.target.value)}
                        placeholder="ex: Aluminium anodisé"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="mb-2 text-red-600 hover:text-red-700"
                      onClick={() => removeSpec(idx)}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4 pt-10">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/products')}
            disabled={submitting || uploading}
          >
            Annuler
          </Button>
          <Button type="submit" disabled={submitting || uploading}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement...
              </>
            ) : (
              'Enregistrer les modifications'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}