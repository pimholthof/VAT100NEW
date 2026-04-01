"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSystemSettings, updateSystemSetting } from "@/features/admin/actions/settings";
import { PageHeader, ErrorMessage } from "@/components/ui";

const SETTING_LABELS: Record<string, { label: string; type: "boolean" | "number" | "text" }> = {
  "platform.name": { label: "Platform naam", type: "text" },
  "platform.registration_open": { label: "Registratie open", type: "boolean" },
  "platform.maintenance_mode": { label: "Onderhoudsmodus", type: "boolean" },
  "platform.default_vat_rate": { label: "Standaard BTW-tarief (%)", type: "number" },
  "notifications.welcome_email": { label: "Welkomstemails versturen", type: "boolean" },
  "notifications.overdue_reminders": { label: "Automatische betalingsherinneringen", type: "boolean" },
  "limits.max_free_users": { label: "Max. gratis gebruikers (0 = onbeperkt)", type: "number" },
};

function SettingRow({
  settingKey,
  value,
  description,
  onUpdate,
  isUpdating,
}: {
  settingKey: string;
  value: unknown;
  description: string | null;
  onUpdate: (key: string, value: unknown) => void;
  isUpdating: boolean;
}) {
  const config = SETTING_LABELS[settingKey] ?? { label: settingKey, type: "text" };
  const currentValue = typeof value === "string" ? value : JSON.stringify(value);

  if (config.type === "boolean") {
    const boolValue = value === true || value === "true";
    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", borderBottom: "0.5px solid rgba(0,0,0,0.05)" }}>
        <div>
          <p style={{ fontWeight: 600, margin: 0 }}>{config.label}</p>
          {description && <p className="label" style={{ margin: "4px 0 0" }}>{description}</p>}
        </div>
        <button
          onClick={() => onUpdate(settingKey, !boolValue)}
          disabled={isUpdating}
          style={{
            width: 48,
            height: 28,
            borderRadius: 14,
            border: "none",
            cursor: "pointer",
            background: boolValue ? "#000" : "rgba(0,0,0,0.1)",
            position: "relative",
            transition: "background 0.2s",
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 3,
              left: boolValue ? 23 : 3,
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: "#fff",
              transition: "left 0.2s",
            }}
          />
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", borderBottom: "0.5px solid rgba(0,0,0,0.05)" }}>
      <div>
        <p style={{ fontWeight: 600, margin: 0 }}>{config.label}</p>
        {description && <p className="label" style={{ margin: "4px 0 0" }}>{description}</p>}
      </div>
      <input
        type={config.type === "number" ? "number" : "text"}
        defaultValue={currentValue.replace(/^"|"$/g, "")}
        onBlur={(e) => {
          const newValue = config.type === "number" ? Number(e.target.value) : e.target.value;
          if (String(newValue) !== currentValue.replace(/^"|"$/g, "")) {
            onUpdate(settingKey, newValue);
          }
        }}
        disabled={isUpdating}
        style={{
          width: 200,
          padding: "8px 12px",
          border: "0.5px solid rgba(0,0,0,0.1)",
          borderRadius: 8,
          fontSize: "var(--text-body)",
          textAlign: "right",
        }}
      />
    </div>
  );
}

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data: result, isLoading } = useQuery({
    queryKey: ["admin-system-settings"],
    queryFn: getSystemSettings,
  });

  const mutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) =>
      updateSystemSetting(key, value),
    onSuccess: (result) => {
      if (result.error) {
        setError(result.error);
      } else {
        queryClient.invalidateQueries({ queryKey: ["admin-system-settings"] });
        setError(null);
      }
    },
  });

  const settings = result?.data ?? [];

  return (
    <div>
      <PageHeader title="Instellingen" backHref="/admin" backLabel="Beheer" />

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {isLoading ? (
        <p className="label">Laden...</p>
      ) : settings.length === 0 ? (
        <p className="empty-state">Geen instellingen gevonden</p>
      ) : (
        <div style={{ maxWidth: 700, padding: 24, borderRadius: 12, border: "0.5px solid rgba(0,0,0,0.05)", background: "rgba(255,255,255,0.85)" }}>
          {settings.map((setting) => (
            <SettingRow
              key={setting.key}
              settingKey={setting.key}
              value={setting.value}
              description={setting.description}
              onUpdate={(key, value) => mutation.mutate({ key, value })}
              isUpdating={mutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
