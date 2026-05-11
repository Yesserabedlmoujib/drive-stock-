import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { productService } from "@/db/services/product.service";
import type { Product } from "@/db/types";
import { ImagePlus, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface ProductFormProps {
  product?: Product;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ProductForm({
  product,
  onSuccess,
  onCancel,
}: ProductFormProps) {
  const { t } = useTranslation();

  const [name, setName] = useState(product?.name || "");
  const [description, setDescription] = useState(product?.description || "");
  const [price, setPrice] = useState(product?.price?.toString() || "");
  const [quantity, setQuantity] = useState(product?.quantity?.toString() || "");
  const [image, setImage] = useState<string | undefined>(product?.image);
  const [loading, setLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error(t("name_required"));
      return;
    }

    setLoading(true);

    try {
      const data = {
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price) || 0,
        quantity: parseInt(quantity) || 0,
        image,
      };

      if (product?.id) {
        await productService.update(product.id, data);
        toast.success(t("updated_success"));
      } else {
        await productService.create(data);
        toast.success(t("created_success"));
      }

      onSuccess();
    } catch (error) {
      toast.error(t("error_save"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-card rounded-xl border border-border shadow-lg">
        {/* HEADER */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">
            {product ? t("edit_product") : t("new_product")}
          </h2>

          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* FORM */}
        <form
          onSubmit={handleSubmit}
          className="p-4 space-y-4 max-h-[70vh] overflow-y-auto"
        >
          {/* IMAGE */}
          <div className="flex justify-center">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative w-32 h-32 rounded-xl border-2 border-dashed border-border hover:border-primary cursor-pointer overflow-hidden"
            >
              {image ? (
                <img src={image} className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <ImagePlus className="w-8 h-8 mb-1" />
                  <span className="text-xs">{t("add_image")}</span>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                hidden
                onChange={handleImageChange}
              />
            </div>
          </div>

          {/* NAME */}
          <div className="space-y-2">
            <Label>{t("name")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("name")}
            />
          </div>

          {/* DESCRIPTION */}
          <div className="space-y-2">
            <Label>{t("description")}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("description")}
              rows={3}
            />
          </div>

          {/* PRICE + QTY */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("price")}</Label>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label>{t("quantity")}</Label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              {t("cancel")}
            </Button>

            <Button type="submit" disabled={loading}>
              {loading ? t("saving") : product ? t("update") : t("create")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
