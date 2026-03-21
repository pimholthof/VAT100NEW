"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getBankAccounts,
  getInstitutions,
  createRequisition,
  importTransactions,
  disconnectBank,
} from "@/lib/actions/banking";
import type { BankConnection, GoCardlessInstitution } from "@/lib/types";
import {
  ButtonPrimary,
  ButtonSecondary,
  ErrorMessage,
  SuccessMessage,
  PageHeader,
} from "@/components/ui";
import Link from "next/link";

export default function BankSettingsPage() {
  const queryClient = useQueryClient();
  const [showBankList, setShowBankList] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // ─── Queries ───

  const {
    data: accountsResult,
    isLoading: accountsLoading,
  } = useQuery({
    queryKey: ["bank-accounts"],
    queryFn: () => getBankAccounts(),
  });

  const {
    data: institutionsResult,
    isLoading: institutionsLoading,
  } = useQuery({
    queryKey: ["institutions"],
    queryFn: () => getInstitutions("NL"),
    enabled: showBankList,
  });

  // ─── Mutations ───

  const linkMutation = useMutation({
    mutationFn: (institutionId: string) => createRequisition(institutionId),
    onSuccess: (result) => {
      if (result.error) return;
      if (result.data?.link) {
        window.location.href = result.data.link;
      }
    },
  });

  const syncMutation = useMutation({
    mutationFn: (accountId: string) => importTransactions(accountId),
    onSuccess: (result) => {
      if (!result.error && result.data) {
        setSuccessMsg(
          `${result.data.imported} transactie(s) geimporteerd.`
        );
        queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      }
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: (connectionId: string) => disconnectBank(connectionId),
    onSuccess: (result) => {
      if (!result.error) {
        setSuccessMsg("Bankkoppeling verwijderd.");
        queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      }
    },
  });

  // ─── Loading state ───

  if (accountsLoading) {
    return (
      <div>
        <div className="skeleton h-12 w-[260px] mb-[80px]" />
        <div className="skeleton h-9 w-full max-w-[480px] mb-5" />
        <div className="skeleton h-9 w-full max-w-[480px] mb-5" />
        <div className="skeleton h-9 w-full max-w-[480px]" />
      </div>
    );
  }

  // ─── Error state ───

  if (accountsResult?.error) {
    return (
      <div>
        <PageHeader title="Bankrekeningen" />
        <ErrorMessage>{accountsResult.error}</ErrorMessage>
      </div>
    );
  }

  const accounts: BankConnection[] = accountsResult?.data ?? [];
  const institutions: GoCardlessInstitution[] =
    institutionsResult?.data ?? [];

  return (
    <div>
      <PageHeader title="Bankrekeningen" />

      <div className="mb-6">
        <Link
          href="/dashboard/settings"
          className="text-[9px] uppercase tracking-[0.12em] text-[var(--color-muted)] no-underline hover:text-[var(--color-ink)]"
        >
          &larr; Terug naar instellingen
        </Link>
      </div>

      {/* Success / Error berichten */}
      {successMsg && (
        <div className="mb-6">
          <SuccessMessage>{successMsg}</SuccessMessage>
        </div>
      )}

      {linkMutation.data?.error && (
        <div className="mb-6">
          <ErrorMessage>{linkMutation.data.error}</ErrorMessage>
        </div>
      )}

      {syncMutation.data?.error && (
        <div className="mb-6">
          <ErrorMessage>{syncMutation.data.error}</ErrorMessage>
        </div>
      )}

      {disconnectMutation.data?.error && (
        <div className="mb-6">
          <ErrorMessage>{disconnectMutation.data.error}</ErrorMessage>
        </div>
      )}

      {/* ─── Gekoppelde rekeningen ─── */}
      <section className="mb-10">
        <span className="text-[9px] uppercase tracking-[0.12em] text-[var(--color-muted)] block mb-4">
          Gekoppelde rekeningen
        </span>

        {accounts.length === 0 ? (
          <div className="border-[0.5px] border-[var(--color-border)] bg-[var(--color-surface)] p-6">
            <p className="text-sm text-[var(--color-muted)] m-0">
              Nog geen bankrekening gekoppeld. Koppel een rekening om
              transacties automatisch te importeren.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {accounts.map((account) => (
              <BankAccountCard
                key={account.id}
                account={account}
                onSync={() => {
                  if (account.account_id) {
                    syncMutation.mutate(account.account_id);
                  }
                }}
                onDisconnect={() => disconnectMutation.mutate(account.id)}
                isSyncing={syncMutation.isPending}
                isDisconnecting={disconnectMutation.isPending}
              />
            ))}
          </div>
        )}
      </section>

      {/* ─── Bank koppelen ─── */}
      <section>
        <span className="text-[9px] uppercase tracking-[0.12em] text-[var(--color-muted)] block mb-4">
          Nieuwe koppeling
        </span>

        {!showBankList ? (
          <ButtonPrimary onClick={() => setShowBankList(true)}>
            Koppel een bankrekening
          </ButtonPrimary>
        ) : (
          <div>
            {institutionsLoading ? (
              <div className="border-[0.5px] border-[var(--color-border)] bg-[var(--color-surface)] p-6">
                <p className="text-sm text-[var(--color-muted)] m-0">
                  Banken laden...
                </p>
              </div>
            ) : institutionsResult?.error ? (
              <ErrorMessage>{institutionsResult.error}</ErrorMessage>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-[var(--color-ink)]">
                    Kies je bank
                  </span>
                  <ButtonSecondary onClick={() => setShowBankList(false)}>
                    Annuleren
                  </ButtonSecondary>
                </div>
                <InstitutionList
                  institutions={institutions}
                  onSelect={(id) => linkMutation.mutate(id)}
                  isLinking={linkMutation.isPending}
                />
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Sub-components ───

function BankAccountCard({
  account,
  onSync,
  onDisconnect,
  isSyncing,
  isDisconnecting,
}: {
  account: BankConnection;
  onSync: () => void;
  onDisconnect: () => void;
  isSyncing: boolean;
  isDisconnecting: boolean;
}) {
  const statusLabels: Record<string, string> = {
    pending: "In afwachting",
    linked: "Gekoppeld",
    expired: "Verlopen",
    revoked: "Ingetrokken",
  };

  const statusColors: Record<string, string> = {
    pending: "text-[var(--color-warning)]",
    linked: "text-[var(--color-safe)]",
    expired: "text-[var(--color-reserved)]",
    revoked: "text-[var(--color-reserved)]",
  };

  return (
    <div className="border-[0.5px] border-[var(--color-border)] bg-[var(--color-surface)] p-5">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[9px] uppercase tracking-[0.12em] text-[var(--color-muted)] block mb-1">
            {account.institution_name}
          </span>
          <span className="font-mono text-base text-[var(--color-ink)]">
            {account.iban ?? "IBAN onbekend"}
          </span>
          <div className="mt-2 flex items-center gap-3">
            <span
              className={`text-[9px] uppercase tracking-[0.12em] ${statusColors[account.status] ?? "text-[var(--color-muted)]"}`}
            >
              {statusLabels[account.status] ?? account.status}
            </span>
            {account.last_synced_at && (
              <span className="text-[9px] tracking-[0.12em] text-[var(--color-muted)]">
                Laatst gesynchroniseerd:{" "}
                <span className="font-mono">
                  {new Date(account.last_synced_at).toLocaleDateString("nl-NL")}
                </span>
              </span>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          {account.status === "linked" && account.account_id && (
            <ButtonSecondary
              onClick={onSync}
              disabled={isSyncing}
            >
              {isSyncing ? "Synchroniseren..." : "Synchroniseer"}
            </ButtonSecondary>
          )}
          <ButtonSecondary
            onClick={onDisconnect}
            disabled={isDisconnecting}
          >
            {isDisconnecting ? "Verwijderen..." : "Ontkoppelen"}
          </ButtonSecondary>
        </div>
      </div>
    </div>
  );
}

function InstitutionList({
  institutions,
  onSelect,
  isLinking,
}: {
  institutions: GoCardlessInstitution[];
  onSelect: (id: string) => void;
  isLinking: boolean;
}) {
  const [search, setSearch] = useState("");

  const filtered = institutions.filter((inst) =>
    inst.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <input
        type="text"
        placeholder="Zoek een bank..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-[480px] mb-4 px-3 py-2 border-[0.5px] border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted)] outline-none focus:shadow-[1px_1px_0px_var(--color-border)]"
      />

      <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)] p-4">
            Geen banken gevonden.
          </p>
        ) : (
          filtered.map((inst) => (
            <button
              key={inst.id}
              onClick={() => onSelect(inst.id)}
              disabled={isLinking}
              className="flex items-center gap-3 p-3 text-left border-[0.5px] border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-paper)] cursor-pointer disabled:opacity-50 disabled:cursor-default"
            >
              {inst.logo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={inst.logo}
                  alt=""
                  className="w-8 h-8 object-contain"
                />
              )}
              <span className="text-sm text-[var(--color-ink)]">
                {inst.name}
              </span>
              {inst.bic && (
                <span className="font-mono text-[9px] tracking-[0.12em] text-[var(--color-muted)] ml-auto">
                  {inst.bic}
                </span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
