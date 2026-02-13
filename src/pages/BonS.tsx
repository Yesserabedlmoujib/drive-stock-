import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bonDeSortieService } from "@/db/services/bonSortie.service";
import { productService } from "@/db/services/product.service";
import type { BonDeSortieItem, Product } from "@/db/types";

import { Minus, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface SelectedProduct {
  product: Product;
  quantity: number;
}

export default function BonDeSortie() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>(
    [],
  );
  const [lieu, setLieu] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await productService.getAll();
      setProducts(data.filter((p) => p.quantity > 0));
    } catch (error) {
      console.error("Failed to load products:", error);
    } finally {
      setLoading(false);
    }
  };

  const addProduct = (product: Product) => {
    const existing = selectedProducts.find(
      (sp) => sp.product.id === product.id,
    );
    if (existing) {
      if (existing.quantity < product.quantity) {
        setSelectedProducts((prev) =>
          prev.map((sp) =>
            sp.product.id === product.id
              ? { ...sp, quantity: sp.quantity + 1 }
              : sp,
          ),
        );
      }
    } else {
      setSelectedProducts((prev) => [...prev, { product, quantity: 1 }]);
    }
  };

  const updateQuantity = (productId: number, delta: number) => {
    setSelectedProducts((prev) =>
      prev.map((sp) => {
        if (sp.product.id === productId) {
          const newQty = Math.max(
            1,
            Math.min(sp.product.quantity, sp.quantity + delta),
          );
          return { ...sp, quantity: newQty };
        }
        return sp;
      }),
    );
  };

  const removeProduct = (productId: number) => {
    setSelectedProducts((prev) =>
      prev.filter((sp) => sp.product.id !== productId),
    );
  };

  const calculateTotal = () => {
    return selectedProducts.reduce(
      (sum, sp) => sum + sp.product.price * sp.quantity,
      0,
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "TND",
    }).format(value);
  };

  const handleSubmit = async () => {
    // if (!destination.trim()) {
    //   toast.error("La destination est requise");
    //   return;
    // }

    if (selectedProducts.length === 0) {
      toast.error("Sélectionnez au moins un produit");
      return;
    }

    setSaving(true);
    try {
      const TVA_RATE = 19; // Tunisia standard rate

      // Create canonical item objects
      const itemsCanonical: BonDeSortieItem[] = selectedProducts.map((sp) => {
        const unitPriceHT = sp.product.price; // assume stored price is HT
        const totalHT = unitPriceHT * sp.quantity;
        const tvaAmount = (totalHT * TVA_RATE) / 100;
        const totalTTC = totalHT + tvaAmount;

        return {
          productId: sp.product.id!,
          productName: sp.product.name,
          quantity: sp.quantity,
          unitPriceHT,
          tvaRate: TVA_RATE,
          tvaAmount,
          totalHT,
          totalTTC,
        };
      });

      const totalHT = itemsCanonical.reduce((sum, i) => sum + i.totalHT, 0);
      const totalTVA = itemsCanonical.reduce((sum, i) => sum + i.tvaAmount, 0);
      const totalTTC = itemsCanonical.reduce((sum, i) => sum + i.totalTTC, 0);

      // Generate a simple document number (you might want a better sequence later)
      const bonNumber = `BS-${new Date().getFullYear()}-${String(
        Math.floor(Math.random() * 9000) + 1000,
      )}`;

      await bonDeSortieService.create({
        number: bonNumber,
        // destination: destination.trim(),
        lieu: lieu.trim(),
        items: itemsCanonical,
        totalHT,
        totalTVA,
        totalTTC,
      });

      toast.success("Bon de sortie créé avec succès");
      navigate("/history");
    } catch (error) {
      toast.error("Erreur lors de la création");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <header className="page-header">
        <h1 className="page-title">Nouveau Bon de Sortie</h1>
        <p className="page-subtitle">Créez une sortie de stock</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form Section */}
        <div className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-4 md:p-6 space-y-4">
            <h2 className="font-semibold text-foreground">Informations</h2>

            <div className="space-y-2">
              <div className="space-y-2">
                <Label htmlFor="lieu">Lieu *</Label>
                <Input
                  id="lieu"
                  value={lieu}
                  onChange={(e) => setLieu(e.target.value)}
                  placeholder="Lieu de la sortie..."
                  className=" resize-none "
                />
              </div>
              {/* <Label htmlFor="destination">Destination (optionnel) </Label>
              <Input
                id="destination"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Ex: Entrepôt B, Client ABC..."
                required
              /> */}
            </div>
          </div>

          {/* Product Selection */}
          <div className="bg-card rounded-xl border border-border p-4 md:p-6">
            <h2 className="font-semibold text-foreground mb-4">
              Sélectionner des produits
            </h2>

            {products.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Aucun produit en stock disponible
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {products.map((product) => {
                  const selected = selectedProducts.find(
                    (sp) => sp.product.id === product.id,
                  );
                  return (
                    <div
                      key={product.id}
                      onClick={() => addProduct(product)}
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                        selected
                          ? "bg-primary/10 border border-primary/30"
                          : "bg-muted/50 hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                            <span className="text-xs text-muted-foreground">
                              IMG
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-foreground">
                            {product.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(product.price)} • Stock:{" "}
                            {product.quantity}
                          </p>
                        </div>
                      </div>
                      {selected && (
                        <span className="text-primary font-semibold">
                          ×{selected.quantity}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Selected Products & Summary */}
        <div className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-4 md:p-6">
            <h2 className="font-semibold text-foreground mb-4">
              Produits sélectionnés
            </h2>

            {selectedProducts.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Cliquez sur les produits pour les ajouter
              </p>
            ) : (
              <div className="space-y-3">
                {selectedProducts.map((sp) => (
                  <div
                    key={sp.product.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {sp.product.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(sp.product.price)} × {sp.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(sp.product.id!, -1)}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-8 text-center font-medium">
                        {sp.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(sp.product.id!, 1)}
                        disabled={sp.quantity >= sp.product.quantity}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => removeProduct(sp.product.id!)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total & Save */}
          <div className="bg-card rounded-xl border border-border p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-lg font-medium text-foreground">Total</span>
              <span className="text-2xl font-bold text-primary">
                {formatCurrency(calculateTotal())}
              </span>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={saving || selectedProducts.length === 0}
              className="w-full gap-2"
              size="lg"
            >
              <Save className="w-5 h-5" />
              {saving ? "Enregistrement..." : "Enregistrer le bon"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
