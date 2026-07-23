"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { FormEvent } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { signUp } from "@/services/auth.service";

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;
const MIN_PASSWORD_LENGTH = 6;

interface FieldErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /** true une fois l'inscription réussie mais en attente de confirmation
   * d'email : remplace le formulaire par un message, pas de redirection. */
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  function validate(): boolean {
    const errors: FieldErrors = {};

    if (!email.trim()) {
      errors.email = "L'email est obligatoire.";
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errors.email = "Format d'email invalide.";
    }

    if (!password) {
      errors.password = "Le mot de passe est obligatoire.";
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.`;
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Veuillez confirmer le mot de passe.";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Les mots de passe ne correspondent pas.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!validate()) return;

    setSubmitting(true);
    const { error, needsEmailConfirmation } = await signUp(
      email.trim(),
      password
    );
    setSubmitting(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    if (needsEmailConfirmation) {
      setAwaitingConfirmation(true);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  if (awaitingConfirmation) {
    return (
      <AuthCard title="Vérifiez votre boîte mail">
        <p className="text-sm text-fg-muted">
          Un email de confirmation a été envoyé à{" "}
          <span className="font-medium text-fg">{email.trim()}</span>.
          Cliquez sur le lien qu&apos;il contient pour activer votre compte,
          puis connectez-vous.
        </p>
        <Link href="/login" className="mt-5 block">
          <Button variant="secondary" className="w-full">
            Retour à la connexion
          </Button>
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Créer un compte"
      description="Inscrivez-vous pour commencer à gérer vos projets."
      footer={
        <p className="text-fg-muted">
          Déjà un compte ?{" "}
          <Link
            href="/login"
            className="font-medium text-accent underline underline-offset-2 hover:text-accent-hover"
          >
            Se connecter
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
            autoComplete="new-password"
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

        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-1.5 block text-sm font-medium text-fg"
          >
            Confirmer le mot de passe
          </label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={submitting}
            error={!!fieldErrors.confirmPassword}
          />
          {fieldErrors.confirmPassword && (
            <p className="mt-1 text-xs text-danger-600">
              {fieldErrors.confirmPassword}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full"
          loading={submitting}
          disabled={submitting}
        >
          Créer le compte
        </Button>
      </form>
    </AuthCard>
  );
}
