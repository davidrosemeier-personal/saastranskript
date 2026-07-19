import { useEffect, useState } from "react";
import { PageHeader } from "../../layouts/AppShell";
import { Card } from "../../components/ui/Card";
import { Field, FieldGrid, TextInput } from "../../components/ui/Form";
import { Button } from "../../components/ui/Button";
import { Banner } from "../../components/ui/Banner";
import { api, ApiError } from "../../lib/api";

interface Settings {
  default_usage_limit_minutes: number;
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { error?: string } | null;
    return body?.error ?? `Request failed (${err.status})`;
  }
  return err instanceof Error ? err.message : "Something went wrong";
}

export function AdminPlatformSettings() {
  const [value, setValue] = useState<string>("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Settings>("/admin/settings")
      .then((s) => setValue(String(s.default_usage_limit_minutes)))
      .catch((err) => setError(errorMessage(err)));
  }, []);

  async function handleSave() {
    setError(null);
    try {
      await api.put("/admin/settings", { defaultUsageLimitMinutes: Number(value) });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div>
      <PageHeader title="Platform Settings" subtitle="Defaults applied to all new and existing users" />
      {error && <Banner tone="danger">{error}</Banner>}

      <Card style={{ padding: 20 }}>
        <FieldGrid>
          <Field label="Default usage limit (minutes/month)">
            <TextInput type="number" value={value} onChange={(e) => setValue(e.target.value)} />
          </Field>
        </FieldGrid>
        <div style={{ marginTop: 16 }}>
          <Button onClick={handleSave}>{saved ? "Saved!" : "Save changes"}</Button>
        </div>
      </Card>
    </div>
  );
}
