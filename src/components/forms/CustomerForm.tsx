import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { customerService } from "@/db/services/customer.service";
import type { Customer } from "@/db/types";

import { ImagePlus, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

interface CustomerFormProps {
  customer?: Customer;
  onSuccess: () => void;
  onCancel: () => void;
}

export function CustomerForm({
  customer,
  onSuccess,
  onCancel,
}: CustomerFormProps) {
  const [name, setName] = useState(customer?.name || "");
  const [telephone, setTelepone] = useState(
    customer?.telephone?.toString() || "",
  );
  const [adresse, setAdresse] = useState(customer?.adresse?.toString() || "");
  const [ville, setVille] = useState(customer?.ville?.toString() || "");
  const [mf, setMf] = useState(customer?.mf?.toString() || "");

  const [codePostal, setCodePostal] = useState(
    customer?.codePostal?.toString() || "",
  );

  const [image, setImage] = useState<string | undefined>(customer?.image);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Le nom est requis");
      return;
    }

    setLoading(true);
    try {
      const customerData = {
        name: name.trim(),
        mf: mf.trim(),
        telephone: parseInt(telephone) || 0,
        adresse: adresse.trim(),
        ville: ville.trim(),
        codePostal: parseInt(codePostal) || 0,
        image,
      };

      if (customer?.id) {
        await customerService.update(customer.id, customerData);
        toast.success("client mis à jour");
      } else {
        await customerService.create(customerData);
        toast.success("client créé");
      }
      onSuccess();
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-card rounded-xl border border-border shadow-lg animate-scale-in overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {customer ? "Modifier info client" : "Nouveau client"}
          </h2>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-4 space-y-4 max-h-[70vh] overflow-y-auto"
        >
          {/* Image Upload */}
          <div className="flex justify-center">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative w-32 h-32 rounded-xl border-2 border-dashed border-border hover:border-primary cursor-pointer overflow-hidden transition-colors"
            >
              {image ? (
                <img
                  src={image}
                  alt="Product"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <ImagePlus className="w-8 h-8 mb-1" />
                  <span className="text-xs">Ajouter image</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nom de l'organisme *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom du l'organisme"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mf">Matricule Fiscale *</Label>
            <Input
              id="mf"
              value={mf}
              onChange={(e) => setMf(e.target.value)}
              placeholder="MF du l'organisme"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="Telephone">Telephone </Label>
              <Input
                id="Telephone"
                value={telephone}
                onChange={(e) => setTelepone(e.target.value)}
                placeholder="Num Telephone"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="adresse">adresse</Label>
              <Input
                id="adresse"
                value={adresse}
                onChange={(e) => setAdresse(e.target.value)}
                placeholder="adresse"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ville">ville</Label>
              <Input
                id="ville"
                value={ville}
                onChange={(e) => setVille(e.target.value)}
                placeholder="ville"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="codePostal">Code postal</Label>
              <Input
                id="codePostal"
                value={codePostal}
                onChange={(e) => setCodePostal(e.target.value)}
                placeholder="code postale"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading
                ? "Enregistrement..."
                : customer
                  ? "Mettre à jour"
                  : "Créer"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
