import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../../layouts/AppShell";
import { SearchField } from "../../components/ui/Controls";
import { StatBox, StatBoxGrid, StatValueRow } from "../../components/ui/StatBox";
import {
  ChevronCell,
  CompactList,
  DetailArea,
  EntryCell,
  GaugeCell,
  ListHeaderRow,
  ListRow,
  NumberCell,
  ProgressCell,
  StatusCell,
  useExpandableRow,
} from "../../components/ui/CompactList";
import { Badge } from "../../components/ui/Badge";
import { DetailFieldPanel, DetailGrid, DetailGroup } from "../../components/ui/DetailPanel";
import { TextInput } from "../../components/ui/Form";
import { Button } from "../../components/ui/Button";
import { Banner } from "../../components/ui/Banner";
import { api, ApiError } from "../../lib/api";

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { error?: string } | null;
    return body?.error ?? `Request failed (${err.status})`;
  }
  return err instanceof Error ? err.message : "Something went wrong";
}

interface AdminUser {
  id: string;
  email: string;
  displayName: string | null;
  status: "active" | "blocked";
  isAdmin: boolean;
  usageLimitMinutes: number | null;
  createdAt: string;
  usage: { limitMinutes: number; consumedMinutes: number; remainingMinutes: number };
}

const TEMPLATE = "2fr 1.3fr 1fr 0.9fr 0.9fr 0.9fr 32px";

export function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { isOpen, toggle } = useExpandableRow();

  async function load() {
    try {
      setUsers(await api.get<AdminUser[]>("/admin/users"));
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!users) return [];
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.email.toLowerCase().includes(q) || (u.displayName ?? "").toLowerCase().includes(q)
    );
  }, [users, query]);

  const totals = useMemo(() => {
    if (!users) return { total: 0, active: 0, blocked: 0, consumed: 0 };
    return {
      total: users.length,
      active: users.filter((u) => u.status === "active").length,
      blocked: users.filter((u) => u.status === "blocked").length,
      consumed: users.reduce((sum, u) => sum + u.usage.consumedMinutes, 0),
    };
  }, [users]);

  async function handleBlock(id: string, block: boolean) {
    setError(null);
    try {
      await api.post(`/admin/users/${id}/${block ? "block" : "unblock"}`);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function handleOverride(id: string, minutes: string) {
    setError(null);
    try {
      const value = minutes.trim() === "" ? null : Number(minutes);
      await api.patch(`/admin/users/${id}/usage-limit`, { minutes: value });
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div>
      <PageHeader title="Users" subtitle="Manage tenants, usage limits, and access" />
      {error && <Banner tone="danger">{error}</Banner>}

      <StatBoxGrid>
        <StatBox heading="Total users">
          <StatValueRow label="Registered" values={[totals.total]} />
        </StatBox>
        <StatBox heading="Access">
          <StatValueRow label="Active" values={[totals.active]} />
          <StatValueRow label="Blocked" values={[totals.blocked]} />
        </StatBox>
        <StatBox heading="Usage (30d)">
          <StatValueRow label="Total minutes" values={[Math.round(totals.consumed)]} />
        </StatBox>
      </StatBoxGrid>

      <SearchField
        placeholder="Search users…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <CompactList>
        <ListHeaderRow
          template={TEMPLATE}
          columns={["User", "Usage", "Limit", "Consumed", "Remaining", "Status", ""]}
        />
        {filtered.map((u) => {
          const percent = u.usage.limitMinutes > 0 ? (u.usage.consumedMinutes / u.usage.limitMinutes) * 100 : 0;
          const tone = percent >= 90 ? "danger" : percent >= 70 ? "warning" : "accent";
          const open = isOpen(u.id);
          return (
            <div key={u.id}>
              <ListRow template={TEMPLATE} open={open} onClick={() => toggle(u.id)}>
                <EntryCell
                  seed={u.email}
                  initials={(u.displayName ?? u.email).slice(0, 2).toUpperCase()}
                  name={u.displayName ?? u.email}
                  secondary={u.email}
                  badge={u.isAdmin ? <Badge tone="neutral">Admin</Badge> : undefined}
                />
                <ProgressCell percent={percent} tone={tone} />
                <GaugeCell percent={Math.min(100, percent)} value={`${u.usage.limitMinutes}m`} />
                <NumberCell>{Math.round(u.usage.consumedMinutes)}m</NumberCell>
                <NumberCell>{Math.round(u.usage.remainingMinutes)}m</NumberCell>
                <StatusCell>
                  <Badge tone={u.status === "active" ? "success" : "danger"}>{u.status}</Badge>
                </StatusCell>
                <ChevronCell open={open} onToggle={() => toggle(u.id)} />
              </ListRow>
              <DetailArea open={open}>
                <DetailGrid>
                  <DetailGroup title="Access">
                    <DetailFieldPanel title="Account status">
                      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <Button
                          variant={u.status === "active" ? "outline" : "primary"}
                          onClick={() => handleBlock(u.id, u.status === "active")}
                        >
                          {u.status === "active" ? "Block user" : "Unblock user"}
                        </Button>
                      </div>
                    </DetailFieldPanel>
                  </DetailGroup>
                  <DetailGroup title="Usage limit override">
                    <DetailFieldPanel title="Minutes per cycle" sub="Leave blank for platform default">
                      <UsageLimitForm
                        current={u.usageLimitMinutes}
                        onSave={(minutes) => handleOverride(u.id, minutes)}
                      />
                    </DetailFieldPanel>
                  </DetailGroup>
                </DetailGrid>
              </DetailArea>
            </div>
          );
        })}
      </CompactList>
    </div>
  );
}

function UsageLimitForm({ current, onSave }: { current: number | null; onSave: (v: string) => void }) {
  const [value, setValue] = useState(current?.toString() ?? "");
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
      <TextInput
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Default"
      />
      <Button variant="outline" onClick={() => onSave(value)}>
        Save
      </Button>
    </div>
  );
}
