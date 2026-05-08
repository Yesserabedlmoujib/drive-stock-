// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import {
//   companyProfileService,
//   userProfileService,
// } from "@/db/services/profile.service";
// import { useEffect, useState } from "react";

// type UserState = {
//   fullName: string;
//   phone: string;
//   image?: string; // 👈 important
// };

// type CompanyState = {
//   companyName: string;
//   address: string;
//   city: string;
//   phone: string;
//   email: string;
//   matriculeFiscale: string;
//   logo?: string; // 👈 important
// };
// export default function Profile() {
//   const [user, setUser] = useState<UserState>({
//     fullName: "",
//     phone: "",
//     image: undefined,
//   });

//   const [company, setCompany] = useState<CompanyState>({
//     companyName: "",
//     address: "",
//     city: "",
//     phone: "",
//     email: "",
//     matriculeFiscale: "",
//     logo: undefined,
//   });

//   useEffect(() => {
//     (async () => {
//       const u = await userProfileService.get();
//       const c = await companyProfileService.get();

//       if (u) {
//         setUser({
//           fullName: u.fullName,
//           phone: u.phone,
//           image: u.image,
//         });
//       }

//       if (c) {
//         setCompany({
//           companyName: c.companyName,
//           address: c.address,
//           city: c.city,
//           phone: c.phone,
//           email: c.email ?? "",
//           matriculeFiscale: c.matriculeFiscale,
//           logo: c.logo,
//         });
//       }
//     })();
//   }, []);

//   const saveProfile = async () => {
//     await userProfileService.save(user);
//     await companyProfileService.save(company);
//     alert("Profil enregistré avec succès");
//   };

//   return (
//     <div className="max-w-4xl mx-auto p-6 space-y-8">
//       <h1 className="text-2xl font-bold">Profil</h1>

//       {/* USER PROFILE */}
//       <section className="bg-white p-4 rounded shadow">
//         <h2 className="text-lg font-semibold text-cyan-600 mb-4">
//           Utilisateur
//         </h2>

//         <div className="space-y-2 p-2">
//           <Label htmlFor="fullName">Nom</Label>
//           <Input
//             id="fullName"
//             className="input"
//             placeholder="Nom et prénom"
//             value={user.fullName}
//             onChange={(e) => setUser({ ...user, fullName: e.target.value })}
//           />
//         </div>
//         <div className="space-y-2 p-2">
//           <Label htmlFor="telephone">Téléphone</Label>
//           <Input
//             id="telephone"
//             className="input mt-2"
//             placeholder="Téléphone"
//             value={user.phone}
//             onChange={(e) => setUser({ ...user, phone: e.target.value })}
//           />
//         </div>
//       </section>

//       {/* COMPANY PROFILE */}
//       <section className="bg-white p-4 rounded shadow">
//         <h2 className="text-lg font-semibold text-cyan-600 mb-4">Entreprise</h2>
//         <div className="space-y-2">
//           <Label htmlFor="entreprise">Nom de l'entreprise</Label>
//           <Input
//             id="entreprise"
//             className="input"
//             placeholder="Nom de l'entreprise"
//             value={company.companyName}
//             onChange={(e) =>
//               setCompany({ ...company, companyName: e.target.value })
//             }
//           />
//         </div>
//         <div className="space-y-2">
//           <Label htmlFor="adresse">Adresse</Label>

//           <Input
//             id="adresse"
//             className="input mt-2"
//             placeholder="Adresse"
//             value={company.address}
//             onChange={(e) =>
//               setCompany({ ...company, address: e.target.value })
//             }
//           />
//         </div>
//         <div className="space-y-2">
//           <Label htmlFor="ville">Ville</Label>
//           <Input
//             id="ville"
//             className="input mt-2"
//             placeholder="Ville"
//             value={company.city}
//             onChange={(e) => setCompany({ ...company, city: e.target.value })}
//           />
//         </div>
//         <div className="space-y-2">
//           <Label htmlFor="tele">Téléphone</Label>
//           <Input
//             id="tele"
//             className="input mt-2"
//             placeholder="Téléphone"
//             value={company.phone}
//             onChange={(e) => setCompany({ ...company, phone: e.target.value })}
//           />
//         </div>
//         <div className="space-y-2">
//           <Label htmlFor="matricule">Matricule Fiscale</Label>
//           <Input
//             id="matricule"
//             className="input mt-2"
//             placeholder="Matricule Fiscale"
//             value={company.matriculeFiscale}
//             onChange={(e) =>
//               setCompany({
//                 ...company,
//                 matriculeFiscale: e.target.value,
//               })
//             }
//           />
//         </div>
//       </section>

//       <button
//         onClick={saveProfile}
//         className="bg-blue-600 text-white px-6 py-2 rounded"
//       >
//         Enregistrer
//       </button>
//     </div>
//   );
// }

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  companyProfileService,
  userProfileService,
} from "@/db/services/profile.service";

import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";

type UserState = {
  fullName: string;
  phone: string;
  image?: string;
};

type CompanyState = {
  companyName: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  matriculeFiscale: string;
  logo?: string;
};

export default function Profile() {
  const [open, setOpen] = useState(false);

  const [user, setUser] = useState<UserState>({
    fullName: "",
    phone: "",
    image: undefined,
  });

  const [company, setCompany] = useState<CompanyState>({
    companyName: "",
    address: "",
    city: "",
    phone: "",
    email: "",
    matriculeFiscale: "",
    logo: undefined,
  });

  useEffect(() => {
    (async () => {
      const u = await userProfileService.get();
      const c = await companyProfileService.get();

      if (u) {
        setUser({
          fullName: u.fullName,
          phone: u.phone,
          image: u.image,
        });
      }

      if (c) {
        setCompany({
          companyName: c.companyName,
          address: c.address,
          city: c.city,
          phone: c.phone,
          email: c.email ?? "",
          matriculeFiscale: c.matriculeFiscale,
          logo: c.logo,
        });
      }
    })();
  }, []);

  const saveProfile = async () => {
    try {
      await userProfileService.save(user);
      await companyProfileService.save(company);

      toast({
        variant: "success",
        title: "Succès",
        description: "Profil enregistré avec succès",
      });

      setOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: "Une erreur est survenue",
      });
    }
  };
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Profil</h1>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Modifier le profil</Button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Modifier le profil</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* USER */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-cyan-600">
                  Utilisateur
                </h2>

                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input
                    value={user.fullName}
                    onChange={(e) =>
                      setUser({
                        ...user,
                        fullName: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input
                    value={user.phone}
                    onChange={(e) =>
                      setUser({
                        ...user,
                        phone: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              {/* COMPANY */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-cyan-600">
                  Entreprise
                </h2>

                <div className="space-y-2">
                  <Label>Nom entreprise</Label>
                  <Input
                    value={company.companyName}
                    onChange={(e) =>
                      setCompany({
                        ...company,
                        companyName: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Adresse</Label>
                  <Input
                    value={company.address}
                    onChange={(e) =>
                      setCompany({
                        ...company,
                        address: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Ville</Label>
                  <Input
                    value={company.city}
                    onChange={(e) =>
                      setCompany({
                        ...company,
                        city: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <Input
                    value={company.phone}
                    onChange={(e) =>
                      setCompany({
                        ...company,
                        phone: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Matricule fiscale</Label>
                  <Input
                    value={company.matriculeFiscale}
                    onChange={(e) =>
                      setCompany({
                        ...company,
                        matriculeFiscale: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <Button onClick={saveProfile} className="w-full">
                Enregistrer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* USER CARD */}
      <section className="bg-white rounded-2xl shadow-sm border p-6">
        <h2 className="text-xl font-semibold mb-4 text-cyan-600">
          Utilisateur
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Nom</p>
            <p className="font-medium">{user.fullName || "-"}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Téléphone</p>
            <p className="font-medium">{user.phone || "-"}</p>
          </div>
        </div>
      </section>

      {/* COMPANY CARD */}
      <section className="bg-white rounded-2xl shadow-sm border p-6">
        <h2 className="text-xl font-semibold mb-4 text-cyan-600">Entreprise</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Entreprise</p>
            <p className="font-medium">{company.companyName || "-"}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Téléphone</p>
            <p className="font-medium">{company.phone || "-"}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Adresse</p>
            <p className="font-medium">{company.address || "-"}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Ville</p>
            <p className="font-medium">{company.city || "-"}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Matricule fiscale</p>
            <p className="font-medium">{company.matriculeFiscale || "-"}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
