"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import { Toast } from "@/components/ui/Toast";
import type { ToastVariant } from "@/components/ui/Toast";
import { formatDate } from "@/lib/format";
import { getInitials } from "@/lib/initials";
import { getProfile, updateDisplayName } from "@/services/profile.service";
import type { UserProfile } from "@/types/profile";

/** Les feedbacks positifs se ferment seuls ; une erreur reste visible
 * tant que l'utilisateur ne la ferme pas manuellement (elle peut avoir
 * besoin de temps pour lire/agir). */
const AUTO_DISMISS_MS = 5000;

interface Feedback {
  variant: ToastVariant;
  message: string;
}

function SkeletonProfileCard() {
  return (
    <Card className="flex flex-col gap-5 p-6">
      <div className="flex items-center gap-4">
        <LoadingSkeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <LoadingSkeleton className="h-4 w-40" />
          <LoadingSkeleton className="h-3 w-56" />
        </div>
      </div>
      <LoadingSkeleton className="h-10 w-full" />
      <LoadingSkeleton className="h-10 w-full" />
      <LoadingSkeleton className="h-3 w-32" />
    </Card>
  );
}

export default function ProfilePage() {
  const router = useRouter();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [feedback, setFeedback] = useState<Feedback | null>(null);

  async function loadProfile() {
    setLoading(true);
    setLoadError(false);

    const { data, error } = await getProfile();
    setLoading(false);

    if (error || !data) {
      setLoadError(true);
      return;
    }

    setProfile(data);
    setDisplayName(data.displayName ?? "");
  }

  useEffect(() => {
    function runInitialLoad() {
      loadProfile();
    }
    runInitialLoad();
  }, []);

  // Fermeture automatique des feedbacks non bloquants (succès/info),
  // jamais pour une erreur — voir AUTO_DISMISS_MS ci-dessus.
  useEffect(() => {
    if (!feedback || feedback.variant === "error") return;

    const timer = setTimeout(() => setFeedback(null), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [feedback]);

  function validateName(): boolean {
    if (!displayName.trim()) {
      setNameError("Le nom d'affichage est obligatoire.");
      return false;
    }
    setNameError(null);
    return true;
  }

  async function handleSave() {
    if (!validateName()) return;

    setSaving(true);
    setFeedback(null);
    const { error } = await updateDisplayName(displayName.trim());
    setSaving(false);

    if (error) {
      setFeedback({
        variant: "error",
        message: "La mise à jour a échoué. Veuillez réessayer.",
      });
      return;
    }

    setFeedback({ variant: "success", message: "Profil mis à jour avec succès." });
    // Le Header/UserMenu (Server Component) affiche le nom via
    // `getCurrentUserSummary()` — `refresh()` le resynchronise.
    router.refresh();
    loadProfile();
  }

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Profil"
          description="Consultez et modifiez vos informations personnelles"
        />
        <div className="max-w-2xl space-y-6">
          <SkeletonProfileCard />
        </div>
      </div>
    );
  }

  if (loadError || !profile) {
    return (
      <div>
        <PageHeader title="Profil" />
        <div className="max-w-2xl">
          <Toast variant="error">
            Impossible de charger votre profil. Veuillez rafraîchir la page ou
            vous reconnecter.
          </Toast>
        </div>
      </div>
    );
  }

  const initials = getInitials(profile.displayName, profile.email);

  return (
    <div>
      <PageHeader
        title="Profil"
        description="Consultez et modifiez vos informations personnelles"
      />

      <div className="max-w-2xl space-y-6">
        <Card className="p-6">
          <div className="mb-6 flex items-center gap-4">
            <Avatar initials={initials} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-fg">
                {profile.displayName || "Utilisateur"}
              </p>
              <p className="truncate text-sm text-fg-muted">{profile.email}</p>
            </div>
          </div>

          {feedback && (
            <div className="mb-4">
              <Toast
                variant={feedback.variant}
                onClose={() => setFeedback(null)}
              >
                {feedback.message}
              </Toast>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="displayName"
                className="mb-1.5 block text-sm font-medium text-fg"
              >
                Nom d&apos;affichage
              </label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={saving}
                error={!!nameError}
                placeholder="Votre nom"
              />
              {nameError && (
                <p className="mt-1 text-xs text-danger-600">{nameError}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-fg">
                Email
              </label>
              <Input value={profile.email} readOnly />
              <p className="mt-1 text-xs text-fg-subtle">
                L&apos;email ne peut pas être modifié.
              </p>
            </div>

            <div className="flex flex-col gap-1 border-t border-border pt-4 text-xs text-fg-subtle sm:flex-row sm:items-center sm:justify-between">
              <span className="truncate">Identifiant : {profile.id}</span>
              {profile.createdAt && (
                <span className="shrink-0">
                  Membre depuis le {formatDate(profile.createdAt)}
                </span>
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end border-t border-border pt-4">
            <Button onClick={handleSave} loading={saving} disabled={saving}>
              Enregistrer
            </Button>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-fg">Sécurité</h3>
              <p className="mt-1 text-sm text-fg-muted">
                Changer votre mot de passe
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone="gray">Bientôt disponible</Badge>
              <Button variant="secondary" disabled>
                Changer
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
