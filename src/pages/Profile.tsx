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
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();

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
        variant: "default",
        title: t("success"),
        description: t("profile_saved"),
      });

      setOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("error"),
        description: t("error_message"),
      });
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t("profile")}</h1>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>{t("edit_profile")}</Button>
          </DialogTrigger>

          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t("edit_profile")}</DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* USER */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-cyan-600">
                  {t("user")}
                </h2>

                <div className="space-y-2">
                  <Label>{t("name")}</Label>
                  <Input
                    value={user.fullName}
                    onChange={(e) =>
                      setUser({ ...user, fullName: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("phone")}</Label>
                  <Input
                    value={user.phone}
                    onChange={(e) =>
                      setUser({ ...user, phone: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* COMPANY */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-cyan-600">
                  {t("company")}
                </h2>

                <div className="space-y-2">
                  <Label>{t("company_name")}</Label>
                  <Input
                    value={company.companyName}
                    onChange={(e) =>
                      setCompany({ ...company, companyName: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("address")}</Label>
                  <Input
                    value={company.address}
                    onChange={(e) =>
                      setCompany({ ...company, address: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("city")}</Label>
                  <Input
                    value={company.city}
                    onChange={(e) =>
                      setCompany({ ...company, city: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("phone")}</Label>
                  <Input
                    value={company.phone}
                    onChange={(e) =>
                      setCompany({ ...company, phone: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>{t("tax_id")}</Label>
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
                {t("save")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* USER CARD */}
      <section className="bg-white rounded-2xl shadow-sm border p-6">
        <h2 className="text-xl font-semibold mb-4 text-cyan-600">
          {t("user")}
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">{t("name")}</p>
            <p className="font-medium">{user.fullName || "-"}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">{t("phone")}</p>
            <p className="font-medium">{user.phone || "-"}</p>
          </div>
        </div>
      </section>

      {/* COMPANY CARD */}
      <section className="bg-white rounded-2xl shadow-sm border p-6">
        <h2 className="text-xl font-semibold mb-4 text-cyan-600">
          {t("company")}
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">{t("company_name")}</p>
            <p className="font-medium">{company.companyName || "-"}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">{t("phone")}</p>
            <p className="font-medium">{company.phone || "-"}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">{t("address")}</p>
            <p className="font-medium">{company.address || "-"}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">{t("city")}</p>
            <p className="font-medium">{company.city || "-"}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">{t("tax_id")}</p>
            <p className="font-medium">{company.matriculeFiscale || "-"}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
