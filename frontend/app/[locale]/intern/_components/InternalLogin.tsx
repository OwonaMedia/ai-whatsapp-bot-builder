"use client";

import { useFormState, useFormStatus } from "react-dom";
import { loginInternalAction } from "../actions";
import { Button } from "@/components/ui/Button";
import { useTranslations } from "next-intl";

type InternalLoginProps = {
  locale: string;
};

type ActionState = {
  success: boolean;
  error?: string;
} | null;

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" className="w-full" isLoading={pending}>
      {label}
    </Button>
  );
}

export function InternalLogin({ locale }: InternalLoginProps) {
  const t = useTranslations("internalPortal.login");
  const [state, formAction] = useFormState<ActionState, FormData>(
    async (_prev, formData) => loginInternalAction(locale, _prev ?? undefined, formData),
    null
  );

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-200 p-8 space-y-6">
        <div className="space-y-2 text-center">
          <p className="text-sm uppercase tracking-widest text-brand-green">
            {t("pill")}
          </p>
          <h1 className="text-2xl font-semibold text-gray-900">
            {t("title")}
          </h1>
          <p className="text-gray-600 text-sm">
            {t("subtitle")}
          </p>
        </div>

        {state?.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="internal-email" className="text-sm font-medium text-gray-700">
              {t("emailLabel")}
            </label>
            <input
              id="internal-email"
              name="email"
              type="email"
              defaultValue=""
              placeholder={t("emailPlaceholder")}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-brand-green focus:ring-2 focus:ring-brand-green/40"
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="internal-password" className="text-sm font-medium text-gray-700">
              {t("passwordLabel")}
            </label>
            <input
              id="internal-password"
              name="password"
              type="password"
              required
              placeholder={t("passwordPlaceholder")}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-brand-green focus:ring-2 focus:ring-brand-green/40"
            />
          </div>

          <SubmitButton label={t("submit")} />
        </form>
      </div>
    </div>
  );
}

