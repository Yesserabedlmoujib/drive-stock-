import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { bonDeLivraisonService } from "@/db/services/bonLivraison.service";
import { customerService } from "@/db/services/customer.service";
import { productService } from "@/db/services/product.service";
import type { BonDeLivraisonItem, Customer, Product } from "@/db/types";

import { Minus, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface SelectedProduct {
  product: Product;
  quantity: number;
}

export default function BonDeLivraison() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>(
    [],
  );
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [customerSearch, setCustomerSearch] = useState("");
  const [lieu, setLieu] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [productsData, customersData] = await Promise.all([
        productService.getAll(),
        customerService.getAll(),
      ]);

      setProducts(productsData.filter((p) => p.quantity > 0));
      setCustomers(customersData);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      customer.mf.toLowerCase().includes(customerSearch.toLowerCase()),
  );

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

  // const formatCurrency = (value: number) => {
  //   return new Intl.NumberFormat("fr-FR", {
  //     style: "currency",
  //     currency: "TND",
  //   }).format(value);
  // };

  const formatCurrency = (value: number) => {
    return `${value.toFixed(2)} ${t("TND")}`;
  };

  const handleCustomerSelect = (customerId: string) => {
    const customer = customers.find((c) => c.id === parseInt(customerId));
    setSelectedCustomer(customer || null);
  };

  const handleSubmit = async () => {
    if (!selectedCustomer) {
      toast.error("Veuillez sélectionner un destinataire");
      return;
    }

    if (selectedProducts.length === 0) {
      toast.error("Sélectionnez au moins un produit");
      return;
    }

    setSaving(true);
    try {
      const TVA_RATE = 19;

      // Create canonical item objects
      const itemsCanonical: BonDeLivraisonItem[] = selectedProducts.map(
        (sp) => {
          const unitPriceHT = sp.product.price;
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
        },
      );

      const totalHT = itemsCanonical.reduce((sum, i) => sum + i.totalHT, 0);
      const totalTVA = itemsCanonical.reduce((sum, i) => sum + i.tvaAmount, 0);
      const totalTTC = itemsCanonical.reduce((sum, i) => sum + i.totalTTC, 0);

      // Generate a simple document number
      const bonNumber = `BL-${new Date().getFullYear()}-${String(
        Math.floor(Math.random() * 9000) + 1000,
      )}`;

      // In handleSubmit function:
      await bonDeLivraisonService.create({
        number: bonNumber,
        destination: selectedCustomer.name, // Just the name
        // raison: selectedCustomer.mf, // Store MF in raison
        lieu: lieu.trim(),
        items: itemsCanonical,
        totalHT,
        totalTVA,
        totalTTC,
        customerName: selectedCustomer.name,
        customerAddress: selectedCustomer.adresse,
        customerVille: selectedCustomer.ville,
        customerTelephone: selectedCustomer.telephone.toString(),
        customerMF: selectedCustomer.mf,
      });

      toast.success("Bon de livraison créé avec succès");
      navigate("/historyLivraison");
    } catch (error) {
      toast.error("Erreur lors de la création");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleCustomerAdded = () => {
    setIsCustomerDialogOpen(false);
    loadData(); // Reload customers list
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
        <h1 className="page-title">{t("new_bon_livraison")}</h1>
        <p className="page-subtitle">{t("create_delivery_stock")}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form Section */}
        <div className="space-y-6">
          <div className="bg-card rounded-xl border border-border p-4 md:p-6 space-y-4">
            <h2 className="font-semibold text-foreground">
              {t("information")}
            </h2>

            <div className="space-y-2">
              <Label htmlFor="destinataire">{t("destinataire")} *</Label>
              <div className="space-y-3">
                <Select
                  value={selectedCustomer?.id?.toString() || ""}
                  onValueChange={handleCustomerSelect}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("select_customer")} />
                  </SelectTrigger>
                  <SelectContent>
                    {/* <div className="p-2 border-b">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder="Rechercher par nom ou MF..."
                          value={customerSearch}
                          onChange={(e) => setCustomerSearch(e.target.value)}
                          className="pl-9"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div> */}
                    <div className="max-h-60 overflow-y-auto">
                      {filteredCustomers.map((customer) => (
                        <SelectItem
                          key={customer.id}
                          value={customer.id!.toString()}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{customer.name}</span>
                            {/* <span className="text-xs text-muted-foreground">
                              {customer.mf} • {customer.telephone}
                            </span> */}
                          </div>
                        </SelectItem>
                      ))}
                      {filteredCustomers.length === 0 && (
                        <div className="p-3 text-center text-sm text-muted-foreground">
                          {t("no_customers")}
                        </div>
                      )}
                    </div>
                  </SelectContent>
                </Select>
              </div>

              {selectedCustomer && (
                <div className="p-3 bg-muted/50 rounded-lg mt-2">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium">{t("name")}:</span>
                      <p>{selectedCustomer.name}</p>
                    </div>
                    <div>
                      <span className="font-medium">{t("tax_id")}:</span>
                      <p>{selectedCustomer.mf}</p>
                    </div>
                    <div>
                      <span className="font-medium">{t("phone")}:</span>
                      <p>{selectedCustomer.telephone}</p>
                    </div>
                    <div>
                      <span className="font-medium">{t("city")}:</span>
                      <p>{selectedCustomer.ville}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium">{t("address")}:</span>
                      <p>{selectedCustomer.adresse}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lieu">{t("place")}</Label>
              <Input
                id="lieu"
                value={lieu}
                onChange={(e) => setLieu(e.target.value)}
                placeholder={t("delivery_place")}
                className="resize-none"
              />
            </div>
          </div>

          {/* Product Selection */}
          <div className="bg-card rounded-xl border border-border p-4 md:p-6">
            <h2 className="font-semibold text-foreground mb-4">
              {t("select_products")}
            </h2>

            {products.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                {t("no_product")}
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
                            {formatCurrency(product.price)} • {t("stock")}:{" "}
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
              {t("selected_products")}
            </h2>

            {selectedProducts.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {t("click_to_add")}
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
              <span className="text-lg font-medium text-foreground">
                {t("total")}
              </span>
              <span className="text-2xl font-bold text-primary">
                {formatCurrency(calculateTotal())}
              </span>
            </div>
            <Button
              onClick={handleSubmit}
              disabled={
                saving || !selectedCustomer || selectedProducts.length === 0
              }
              className="w-full gap-2"
              size="lg"
            >
              <Save className="w-5 h-5" />
              {saving ? t("saving") : t("save")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
