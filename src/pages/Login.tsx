import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "../components/ui/form";

import { Input } from "../components/ui/input";

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "../components/ui/card";

import { loginSchema, type LoginSchema } from "../lib/validations/auth.schema";

import { signIn } from "../db/services/auth";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";


export default function Login() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const { t } = useTranslation();

    const form = useForm<LoginSchema>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    async function onSubmit(values: LoginSchema) {
        try {
            setLoading(true);

            const { error } = await signIn(
                values.email,
                values.password
            );

            if (error) {
                toast.error(t("login_error"));
                return;
            }

            toast.success(t("login_success"));
            navigate("/");
        } catch (error) {
            toast.error(t("something_went_wrong"));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center">
            <Card className="w-[400px]">
                <CardHeader>
                    <CardTitle>
                        {t("login_title")}
                    </CardTitle>

                    <CardDescription>
                        {t("login_description")}
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(onSubmit)}
                            className="space-y-4"
                        >
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            {t("email_label")}
                                        </FormLabel>

                                        <FormControl>
                                            <Input
                                                placeholder={t("email_placeholder")}
                                                {...field}
                                            />
                                        </FormControl>

                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>
                                            {t("password_label")}
                                        </FormLabel>

                                        <FormControl>
                                            <Input
                                                type="password"
                                                placeholder={t("password_placeholder")}
                                                {...field}
                                            />
                                        </FormControl>

                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={loading}
                            >
                                {loading ? t("signing_in") : t("login_button")}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}