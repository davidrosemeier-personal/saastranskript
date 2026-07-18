import { useEffect, useState } from "react";
import { PageHeader } from "../../layouts/AppShell";
import { Card } from "../../components/ui/Card";
import { Field, FieldGrid, TextInput } from "../../components/ui/Form";
import { Button } from "../../components/ui/Button";
import { api } from "../../lib/api";

interface Settings {
  default_usage_limit_minutes: number;
}

export function AdminPlatformSettings() {
  const [value, setValue] = useState<string>("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get<Settings>("/admin/settings").then((s) => setValue(String(s.default_usage_limit_minutes)));
  }, []);

  async function handleSave() {
    await api.put("/admin/settings", { defaultUsageLimitMinutes: Number(value) });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div>
      <PageHeader title="Platform Settings" subtitle="Defaults applied to all new and existing users" />

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
