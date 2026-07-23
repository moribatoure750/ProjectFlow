"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { signInWithPassword } from "@/services/auth.service";

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

interface FieldErrors {
  email?: string;
  password?: string;
}

/**
 * Traduit les messages d'erreur Supabase les plus fréquents. Les autres
 * messages sont affichés tels quels (pas de traduction exhaustive, hors
 * périmètre du Lot 3).
 */
function translateAuthError(message: string): string {
  if (message === "Invalid login credentials") {
    return "Email ou mot de passe incorrect.";
  }
  return message;
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const errors: FieldErrors = {};

    if (!email.trim()) {
      errors.email = "L'email est obligatoire.";
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errors.email = "Format d'email invalide.";
    }

    if (!password) {
      errors.password = "Le mot de passe est obligatoire.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!validate()) return;

    setSubmitting(true);
    const { error } = await signInWithPassword(email.trim(), password);
    setSubmitting(false);

    if (error) {
      setFormError(translateAuthError(error.message));
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <AuthCard
      title="Connexion"
      description="Connectez-vous pour accéder à vos projets."
      footer={
        <p className="text-fg-muted">
          Pas encore de compte ?{" "}
          <Link
            href="/register"
            className="font-medium text-accent underline underline-offset-2 hover:text-accent-hover"
          >
            Créer un compte
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {formError && (
          <div
            role="alert"
            className="rounded-md border border-danger-600/30 bg-danger-50 px-3 py-2 text-sm text-danger-600 dark:bg-danger-100/10"
          >
            {formError}
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-fg"
          >
            Email
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="vous@exemple.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            error={!!fieldErrors.email}
          />
          {fieldErrors.email && (
            <p className="mt-1 text-xs text-danger-600">{fieldErrors.email}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium text-fg"
          >
            Mot de passe
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            error={!!fieldErrors.password}
          />
          {fieldErrors.password && (
            <p className="mt-1 text-xs text-danger-600">
              {fieldErrors.password}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          loading={submitting}
          disabled={submitting}
        >
          Se connecter
        </Button>
      </form>
    </AuthCard>
  );
}
