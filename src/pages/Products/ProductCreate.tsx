// src/pages/Products/ProductCreate.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

interface VariantImage {
  file: File;
  preview: string;
}

interface Variant {
  name: string;
  sku: string;
  priceDifference: number;
  stock: number;
  isDefault: boolean;
  images: VariantImage[];           // images locales pour preview
  uploadedImageUrls: string[];      // URLs après upload backend
}

interface Spec {
  key: string;
  value: string;
}

export default function ProductCreate() {
  const navigate = useNavigate();

  // ── Form states ────────────────────────────────────────
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState<number | ''>('');
  const [globalStock, setGlobalStock] = useState<number | ''>(''); // manuel si pas de variantes
  const [discount, setDiscount] = useState<number | ''>(0);
  const [brand, setBrand] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [isFeatured, setIsFeatured] = useState(false);

  const [variants, setVariants] = useState<Variant[]>([]);
  const [specs, setSpecs] = useState<Spec[]>([]);

  // Images globales (produit)
  const [globalFiles, setGlobalFiles] = useState<File[]>([]);
  const [globalPreviews, setGlobalPreviews] = useState<string[]>([]);
  const [globalUploadedUrls, setGlobalUploadedUrls] = useState<string[]>([]);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
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
    } else {
      setSlug('');
    }
  }, [name]);

  // Fetch catégories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get('/categories');
        setCategories(res.data || []);
      } catch (err) {
        toast.error('Erreur chargement catégories');
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  // ── Images globales ────────────────────────────────────
  const handleGlobalImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      if (globalFiles.length + newFiles.length > 5) {
        toast.error('Maximum 5 images globales');
        return;
      }

      const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
      setGlobalPreviews((prev) => [...prev, ...newPreviews]);
      setGlobalFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const removeGlobalImage = (index: number) => {
    setGlobalFiles((prev) => prev.filter((_, i) => i !== index));
    setGlobalPreviews((prev) => prev.filter((_, i) => i !== index));
    setGlobalUploadedUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadGlobalImages = async (): Promise<string[]> => {
    if (globalFiles.length === 0) return globalUploadedUrls;

    setUploading(true);
    try {
      const formData = new FormData();
      globalFiles.forEach((file) => formData.append('images', file));

      const res = await api.post('/products/upload-images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const newUrls = res.data.urls || [];
      setGlobalUploadedUrls(newUrls);
      toast.success(`${newUrls.length} image(s) globale(s) uploadée(s)`);
      return newUrls;
    } catch (err: any) {
      toast.error('Erreur upload images globales');
      return [];
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
        uploadedImageUrls: [],
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
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const variant = variants[variantIndex];
      if (variant.images.length + newFiles.length > 5) {
        toast.error('Maximum 5 images par variante');
        return;
      }

      const newPreviews = newFiles.map((f) => URL.createObjectURL(f));
      const updatedVariants = [...variants];
      updatedVariants[variantIndex].images.push(...newFiles.map((f, i) => ({
        file: f,
        preview: newPreviews[i],
      })));
      setVariants(updatedVariants);
    }
  };

  const removeVariantImage = (variantIndex: number, imageIndex: number) => {
    const updatedVariants = [...variants];
    updatedVariants[variantIndex].images = updatedVariants[variantIndex].images.filter((_, i) => i !== imageIndex);
    updatedVariants[variantIndex].uploadedImageUrls = updatedVariants[variantIndex].uploadedImageUrls.filter((_, i) => i !== imageIndex);
    setVariants(updatedVariants);
  };

  const uploadVariantImages = async (variantIndex: number): Promise<string[]> => {
    const variant = variants[variantIndex];
    if (variant.images.length === 0) return variant.uploadedImageUrls;

    try {
      const formData = new FormData();
      variant.images.forEach(({ file }) => formData.append('images', file));

      const res = await api.post('/products/upload-images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const newUrls = res.data.urls || [];
      const updatedVariants = [...variants];
      updatedVariants[variantIndex].uploadedImageUrls.push(...newUrls);
      setVariants(updatedVariants);
      return newUrls;
    } catch (err: any) {
      toast.error(`Erreur upload images variante "${variant.name}"`);
      return [];
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

  // Calcul stock total auto (pour affichage/info)
  const totalVariantStock = variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);

  // ── Submit ─────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!name.trim() || !description.trim() || basePrice === '' || !categoryId) {
      toast.error('Champs obligatoires manquants');
      return;
    }

    if (variants.length > 0) {
      const hasDefault = variants.some((v) => v.isDefault);
      if (!hasDefault) {
        toast.error('Sélectionnez une variante par défaut');
        return;
      }
    } else if (globalStock === '') {
      toast.error('Indiquez le stock global (sans variantes)');
      return;
    }

    setSubmitting(true);

    try {
      // Upload images globales (toujours possible)
      let finalGlobalImages = globalUploadedUrls;
      if (globalFiles.length > 0 && globalUploadedUrls.length < globalFiles.length) {
        finalGlobalImages = await uploadGlobalImages();
      }

      // Upload images pour chaque variante
      const variantsWithImages = [...variants];
      for (let i = 0; i < variantsWithImages.length; i++) {
        const variantUrls = await uploadVariantImages(i);
        variantsWithImages[i].uploadedImageUrls = [
          ...variantsWithImages[i].uploadedImageUrls,
          ...variantUrls,
        ];
      }

      // Préparer payload
      const specsObj: Record<string, string> = {};
      specs.forEach((s) => {
        if (s.key.trim() && s.value.trim()) specsObj[s.key.trim()] = s.value.trim();
      });

      const cleanVariants = variantsWithImages
        .filter((v) => v.name.trim() && v.sku.trim())
        .map((v) => ({
          name: v.name.trim(),
          sku: v.sku.trim(),
          priceDifference: Number(v.priceDifference) || 0,
          stock: Number(v.stock) || 0,
          images: v.uploadedImageUrls,
          isDefault: v.isDefault,
        }));

      const payload = {
        name: name.trim(),
        slug,
        description: description.trim(),
        basePrice: Number(basePrice),
        discount: Number(discount) || 0,
        category: categoryId,
        brand: brand.trim() || undefined,
        images: finalGlobalImages, // ← TOUJOURS envoyé (obligatoire sans variantes)
        variants: cleanVariants.length > 0 ? cleanVariants : undefined,
        stock: cleanVariants.length === 0 ? Number(globalStock) || 0 : totalVariantStock,
        specs: Object.keys(specsObj).length > 0 ? specsObj : undefined,
        isFeatured,
      };

      await api.post('/products', payload);

      toast.success('Produit créé avec succès !');
      navigate('/products');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur création produit');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Ajouter un produit</h1>
        <Button variant="outline" onClick={() => navigate('/products')}>
          Retour à la liste
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
              <Label htmlFor="name">Nom du produit *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex: Manette DualSense Custom FIFA 25"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Slug (généré automatiquement)</Label>
              <Input
                value={slug}
                readOnly
                className="bg-muted cursor-not-allowed"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand">Marque</Label>
              <Input
                id="brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="ex: Sony Custom DZ"
              />
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez le produit en détail..."
                rows={5}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="basePrice">Prix de base (DA) *</Label>
              <Input
                id="basePrice"
                type="number"
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value ? Number(e.target.value) : '')}
                min={0}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount">Remise (%)</Label>
              <Input
                id="discount"
                type="number"
                value={discount}
                onChange={(e) => setDiscount(e.target.value ? Number(e.target.value) : 0)}
                min={0}
                max={100}
              />
            </div>

            <div className="space-y-2">
              <Label>Catégorie *</Label>
              {loadingCategories ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Chargement...
                </div>
              ) : (
                <Select value={categoryId} onValueChange={setCategoryId} required>
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
              )}
            </div>

            <div className="flex items-center space-x-2 pt-8">
              <Switch
                id="isFeatured"
                checked={isFeatured}
                onCheckedChange={setIsFeatured}
              />
              <Label htmlFor="isFeatured">Produit mis en avant</Label>
            </div>
          </CardContent>
        </Card>

        {/* Images globales */}
        <Card>
          <CardHeader>
            <CardTitle>
              {variants.length === 0 ? 'Images du produit (obligatoires sans variantes)' : 'Images globales (optionnelles)'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('global-image-upload')?.click()}
                  disabled={uploading || globalFiles.length >= 5 || submitting}
                >
                  {uploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  {uploading ? 'Upload en cours...' : 'Sélectionner images'}
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
                  {globalFiles.length} / 5 images globales
                </span>
              </div>

              {globalPreviews.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                  {globalPreviews.map((src, index) => (
                    <div key={index} className="relative group rounded-md overflow-hidden border">
                      <img src={src} alt={`global-preview-${index}`} className="h-32 w-full object-cover" />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeGlobalImage(index)}
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
                Pas de variantes → le produit utilisera les images globales et le stock global
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

                    {/* Images spécifiques à la variante */}
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
                                alt="Variante"
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

        {/* Stock global – AFFICHÉ UNIQUEMENT SANS VARIANTES */}
        {variants.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Stock du produit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-w-md space-y-2">
                <Label htmlFor="global-stock-input">Stock total disponible *</Label>
                <Input
                  id="global-stock-input"
                  type="number"
                  value={globalStock}
                  onChange={(e) => setGlobalStock(e.target.value ? Number(e.target.value) : '')}
                  min={0}
                  placeholder="Exemple : 120"
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Indiquez la quantité totale en stock pour ce produit (sans déclinaisons).
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Spécifications */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Spécifications / Caractéristiques</CardTitle>
            <Button type="button" variant="outline" onClick={addSpec}>
              <Plus className="mr-2 h-4 w-4" /> Ajouter
            </Button>
          </CardHeader>
          <CardContent>
            {specs.length === 0 ? (
              <p className="text-center py-10 text-muted-foreground">
                Ajoutez des caractéristiques (ex : Poids, Dimensions, Matériau, Compatibilité...)
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
                        placeholder="ex: Poids"
                      />
                    </div>
                    <div className="flex-1">
                      <Label>Valeur</Label>
                      <Input
                        value={spec.value}
                        onChange={(e) => updateSpec(idx, 'value', e.target.value)}
                        placeholder="ex: 450 g"
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

        {/* Boutons d'action */}
        <div className="flex justify-end gap-4 pt-10">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/products')}
            disabled={submitting || uploading}
          >
            Annuler
          </Button>
          <Button type="submit" disabled={submitting || uploading || loadingCategories}>
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Création en cours...
              </>
            ) : (
              'Créer le produit'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}