import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  companyProfileService,
  userProfileService,
} from "@/db/services/profile.service";
import { useEffect, useState } from "react";

type UserState = {
  fullName: string;
  phone: string;
  image?: string; // 👈 important
};

type CompanyState = {
  companyName: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  matriculeFiscale: string;
  logo?: string; // 👈 important
};
export default function Profile() {
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
    await userProfileService.save(user);
    await companyProfileService.save(company);
    alert("Profil enregistré avec succès");
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold">Profil</h1>

      {/* USER PROFILE */}
      <section className="bg-white p-4 rounded shadow">
        <h2 className="text-lg font-semibold text-cyan-600 mb-4">
          Utilisateur
        </h2>

        <div className="space-y-2 p-2">
          <Label htmlFor="fullName">Nom</Label>
          <Input
            id="fullName"
            className="input"
            placeholder="Nom et prénom"
            value={user.fullName}
            onChange={(e) => setUser({ ...user, fullName: e.target.value })}
          />
        </div>
        <div className="space-y-2 p-2">
          <Label htmlFor="telephone">Téléphone</Label>
          <Input
            id="telephone"
            className="input mt-2"
            placeholder="Téléphone"
            value={user.phone}
            onChange={(e) => setUser({ ...user, phone: e.target.value })}
          />
        </div>
      </section>

      {/* COMPANY PROFILE */}
      <section className="bg-white p-4 rounded shadow">
        <h2 className="text-lg font-semibold text-cyan-600 mb-4">Entreprise</h2>
        <div className="space-y-2">
          <Label htmlFor="entreprise">Nom de l'entreprise</Label>
          <Input
            id="entreprise"
            className="input"
            placeholder="Nom de l'entreprise"
            value={company.companyName}
            onChange={(e) =>
              setCompany({ ...company, companyName: e.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="adresse">Adresse</Label>

          <Input
            id="adresse"
            className="input mt-2"
            placeholder="Adresse"
            value={company.address}
            onChange={(e) =>
              setCompany({ ...company, address: e.target.value })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ville">Ville</Label>
          <Input
            id="ville"
            className="input mt-2"
            placeholder="Ville"
            value={company.city}
            onChange={(e) => setCompany({ ...company, city: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tele">Téléphone</Label>
          <Input
            id="tele"
            className="input mt-2"
            placeholder="Téléphone"
            value={company.phone}
            onChange={(e) => setCompany({ ...company, phone: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="matricule">Matricule Fiscale</Label>
          <Input
            id="matricule"
            className="input mt-2"
            placeholder="Matricule Fiscale"
            value={company.matriculeFiscale}
            onChange={(e) =>
              setCompany({
                ...company,
                matriculeFiscale: e.target.value,
              })
            }
          />
        </div>
      </section>

      <button
        onClick={saveProfile}
        className="bg-blue-600 text-white px-6 py-2 rounded"
      >
        Enregistrer
      </button>
    </div>
  );
}
