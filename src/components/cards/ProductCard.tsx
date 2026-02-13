import { Button } from "@/components/ui/button";
import type { Product } from "@/db/types";
import { cn } from "@/lib/utils";
import { Edit, Package, Trash2 } from "lucide-react";

interface ProductCardProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

export function ProductCard({ product, onEdit, onDelete }: ProductCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "TND",
    }).format(value);
  };

  const isLowStock = product.quantity < 10;

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-soft transition-all duration-300 animate-fade-in">
      <div className="relative h-40 bg-muted">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Package className="w-12 h-12 text-muted-foreground/50" />
          </div>
        )}
        {isLowStock && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-warning text-warning-foreground text-xs font-medium rounded-full">
            Stock faible
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-foreground truncate">
          {product.name}
        </h3>
        {product.description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {product.description}
          </p>
        )}

        <div className="flex items-center justify-between mt-4">
          <div>
            <p className="text-lg font-bold text-primary">
              {formatCurrency(product.price)}
            </p>
            <p
              className={cn(
                "text-sm",
                isLowStock
                  ? "text-warning font-medium"
                  : "text-muted-foreground",
              )}
            >
              Qté: {product.quantity}
            </p>
          </div>

          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(product)}
              className="hover:bg-primary/10 hover:text-primary"
            >
              <Edit className="w-6 h-6 text-green-600" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(product)}
              className="hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="w-6 h-6 text-red-500" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
