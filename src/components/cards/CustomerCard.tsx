// import { Button } from "@/components/ui/button";
// import { Edit, Trash2, User } from "lucide-react";
// import { Label } from "../ui/label";
// import type { Customer } from "@/db/types";

// interface CustomerCardProps {
//   customer: Customer;
//   onEdit: (customer: Customer) => void;
//   onDelete: (customer: Customer) => void;
// }

// export function CustomerCard({
//   customer,
//   onEdit,
//   onDelete,
// }: CustomerCardProps) {
//   return (
//     <div className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-soft transition-all duration-300 animate-fade-in">
//       <div className="flex justify-between">
//         <div className="relative h-32 w-32 bg-gray-50 m-2">
//           {customer.image ? (
//             <img
//               src={customer.image}
//               alt={customer.name}
//               className="w-full h-full object-cover"
//             />
//           ) : (
//             <div className="flex items-center justify-center h-full">
//               <User className="w-12 h-12 text-muted-foreground/50" />
//             </div>
//           )}
//           <Label htmlFor="md" className="text-sm font-semibold ">
//             Matricule fiscale
//           </Label>

//           <p className="text-sm font-semibold text-gray-500">{customer.mf}</p>
//         </div>
//         <div className="p-2 mr-8">
//           <Label htmlFor="name" className="text-sm font-semibold">
//             Nom
//           </Label>
//           <p className="text-sm font-semibold truncate text-gray-500">
//             {customer.name}
//           </p>
//           <Label htmlFor="telephone" className="text-sm font-semibold">
//             Telephone
//           </Label>
//           <p className="text-sm font-semibold text-gray-500">
//             {customer.telephone}
//           </p>
//           <Label htmlFor="adresse" className="text-sm font-semibold">
//             Adresse
//           </Label>

//           <p className="text-sm font-semibold truncate text-gray-500">
//             {customer.adresse}
//           </p>
//         </div>
//       </div>

//       <div className="p-4">
//         {/* <div className="flex items-center justify-between mt-4"> */}
//         {/* <div>
//             <Label htmlFor="ville" className="text-sm font-semibold">
//               ville
//             </Label>
//             <p className="text-sm font-semibold text-gray-500">
//               {customer.ville}
//             </p>
//           </div> */}

//         <div className="flex justify-end gap-1 mr-4">
//           <Button
//             variant="ghost"
//             size="icon"
//             onClick={() => onEdit(customer)}
//             className="hover:bg-primary/10 hover:text-primary"
//           >
//             <Edit className="w-6 h-6 text-green-600" />
//           </Button>
//           <Button
//             variant="ghost"
//             size="icon"
//             onClick={() => onDelete(customer)}
//             className="hover:bg-destructive/10 hover:text-destructive"
//           >
//             <Trash2 className="w-6 h-6 text-red-500" />
//           </Button>
//         </div>
//         {/* </div> */}
//       </div>
//     </div>
//   );
// }

import { Button } from "@/components/ui/button";
import { Edit, Trash2, User } from "lucide-react";
import { Label } from "../ui/label";
import type { Customer } from "@/db/types";
import { useTranslation } from "react-i18next";

interface CustomerCardProps {
  customer: Customer;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
}

export function CustomerCard({
  customer,
  onEdit,
  onDelete,
}: CustomerCardProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-soft transition-all duration-300 animate-fade-in">
      <div className="flex justify-between">
        <div className="relative h-32 w-32 bg-gray-50 m-2">
          {customer.image ? (
            <img
              src={customer.image}
              alt={customer.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <User className="w-12 h-12 text-muted-foreground/50" />
            </div>
          )}

          <Label htmlFor="md" className="text-sm font-semibold">
            {t("tax_id")}
          </Label>

          <p className="text-sm font-semibold text-gray-500">{customer.mf}</p>
        </div>

        <div className="p-2 mr-8">
          <Label htmlFor="name" className="text-sm font-semibold">
            {t("name")}
          </Label>
          <p className="text-sm font-semibold truncate text-gray-500">
            {customer.name}
          </p>

          <Label htmlFor="telephone" className="text-sm font-semibold">
            {t("phone")}
          </Label>
          <p className="text-sm font-semibold text-gray-500">
            {customer.telephone}
          </p>

          <Label htmlFor="adresse" className="text-sm font-semibold">
            {t("address")}
          </Label>
          <p className="text-sm font-semibold truncate text-gray-500">
            {customer.adresse}
          </p>
        </div>
      </div>

      <div className="p-4">
        <div className="flex justify-end gap-1 mr-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onEdit(customer)}
            className="hover:bg-primary/10 hover:text-primary"
          >
            <Edit className="w-6 h-6 text-green-600" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(customer)}
            className="hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="w-6 h-6 text-red-500" />
          </Button>
        </div>
      </div>
    </div>
  );
}