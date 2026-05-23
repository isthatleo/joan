"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Plus,
  TestTube2,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type ProviderField = {
  key: string;
  label: string;
  type: "text" | "password" | "url";
  required?: boolean;
  placeholder?: string;
  help?: string;
};

type Provider = {
  id: string;
  name: string;
  category: string;
  description: string;
  docsUrl: string;
  fields: ProviderField[];
};

type Integration = {
  id: string;
  provider: string;
  isActive: boolean;
  status: string;
  accountName: string | null;
  lastTestedAt: string | null;
  testError: string | null;
  config: Record<string, unknown>;
  apiKeyMasked?: string;
  apiSecretMasked?: string;
};

type IntegrationsResponse = {
  providers: Provider[];
  integrations: Integration[];
};

export function IntegrationManager({
  slug,
  title = "Connected Integrations",
  description = "Manage secure third-party service credentials and tenant-wide defaults.",
  initialCategory = "all",
  allowedCategories,
  onChange,
}: {
  slug?: string;
  title?: string;
  description?: string;
  initialCategory?: string;
  allowedCategories?: string[];
  onChange?: (payload: IntegrationsResponse) => void;
}) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [activeProvider, setActiveProvider] = useState<Provider | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  async function load() {
    if (!slug) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/tenant/${slug}/integrations`);
      const payload = (await response.json()) as IntegrationsResponse;
      if (!response.ok) {
        throw new Error((payload as any).error || "Failed to load integrations");
      }
      setProviders(payload.providers || []);
      setIntegrations(payload.integrations || []);
      onChange?.(payload);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load integrations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [slug]);

  const configuredMap = useMemo(
    () => new Map(integrations.map((integration) => [integration.provider, integration])),
    [integrations]
  );

  const visibleProviders = useMemo(() => {
    const pool = allowedCategories?.length
      ? providers.filter((provider) => allowedCategories.includes(provider.category))
      : providers;
    return selectedCategory === "all"
      ? pool
      : pool.filter((provider) => provider.category === selectedCategory);
  }, [allowedCategories, providers, selectedCategory]);

  const categories = useMemo(() => {
    const pool = allowedCategories?.length
      ? providers.filter((provider) => allowedCategories.includes(provider.category))
      : providers;
    return ["all", ...Array.from(new Set(pool.map((provider) => provider.category)))];
  }, [allowedCategories, providers]);

  function openProvider(provider: Provider) {
    const existing = configuredMap.get(provider.id);
    const nextValues: Record<string, string> = {};
    for (const field of provider.fields) {
      nextValues[field.key] =
        field.type === "password" ? "" : String(existing?.config?.[field.key] ?? "");
    }
    setFieldValues(nextValues);
    setActiveProvider(provider);
  }

  async function saveProvider() {
    if (!activeProvider || !slug) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/tenant/${slug}/integrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: activeProvider.id,
          fields: fieldValues,
          isActive: true,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to save integration");
      }

      setActiveProvider(null);
      toast.success(`${activeProvider.name} saved`);
      await load();
      if (payload.integration?.id) {
        await testConnection(payload.integration.id);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save integration");
    } finally {
      setSaving(false);
    }
  }

  async function testConnection(id: string) {
    if (!slug) return;
    setTesting(id);
    try {
      const response = await fetch(`/api/tenant/${slug}/integrations/${id}/test`, { method: "POST" });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || payload.message || "Connection test failed");
      }
      toast.success(payload.message || "Connection verified");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Connection test failed");
      await load();
    } finally {
      setTesting(null);
    }
  }

  async function removeIntegration(id: string, name: string) {
    if (!slug || !confirm(`Remove ${name} integration?`)) return;
    try {
      const response = await fetch(`/api/tenant/${slug}/integrations/${id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to remove integration");
      }
      toast.success(`${name} removed`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove integration");
    }
  }

  async function toggleIntegration(id: string, isActive: boolean) {
    if (!slug) return;
    try {
      const response = await fetch(`/api/tenant/${slug}/integrations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to update integration");
      }
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update integration");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <Button
              key={category}
              type="button"
              size="sm"
              variant={selectedCategory === category ? "default" : "outline"}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {visibleProviders.map((provider) => {
              const integration = configuredMap.get(provider.id);
              return (
                <div key={provider.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{provider.name}</p>
                        {integration?.status === "active" ? (
                          <Badge className="bg-green-600">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            active
                          </Badge>
                        ) : integration?.status === "error" ? (
                          <Badge variant="destructive">
                            <AlertCircle className="mr-1 h-3 w-3" />
                            error
                          </Badge>
                        ) : integration ? (
                          <Badge variant="secondary">{integration.status}</Badge>
                        ) : null}
                      </div>
                      <p className="text-sm text-muted-foreground">{provider.description}</p>
                      {integration?.accountName ? (
                        <p className="text-xs text-muted-foreground">Account: {integration.accountName}</p>
                      ) : null}
                      {integration?.apiKeyMasked ? (
                        <p className="font-mono text-xs text-muted-foreground">{integration.apiKeyMasked}</p>
                      ) : null}
                      {integration?.testError ? (
                        <p className="text-xs text-destructive">{integration.testError}</p>
                      ) : null}
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {provider.category}
                    </Badge>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => openProvider(provider)}>
                      {integration ? "Edit" : <><Plus className="mr-1 h-3 w-3" />Connect</>}
                    </Button>
                    {integration ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => testConnection(integration.id)}
                          disabled={testing === integration.id}
                        >
                          {testing === integration.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <TestTube2 className="h-3 w-3" />
                          )}
                        </Button>
                        <Switch
                          checked={integration.isActive}
                          onCheckedChange={(checked) => toggleIntegration(integration.id, checked)}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => removeIntegration(integration.id, provider.name)}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </>
                    ) : null}
                    <a
                      href={provider.docsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
                    >
                      docs
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={!!activeProvider} onOpenChange={(open) => !open && setActiveProvider(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Connect {activeProvider?.name}</DialogTitle>
            <DialogDescription>
              Credentials are encrypted before storage and reused by the tenant-wide communication and automation flows.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {activeProvider?.fields.map((field) => (
              <div key={field.key} className="space-y-1">
                <Label>
                  {field.label}
                  {field.required ? <span className="ml-1 text-destructive">*</span> : null}
                </Label>
                <Input
                  type={field.type === "password" ? "password" : "text"}
                  placeholder={field.placeholder}
                  value={fieldValues[field.key] || ""}
                  onChange={(event) =>
                    setFieldValues((current) => ({ ...current, [field.key]: event.target.value }))
                  }
                />
                {field.help ? <p className="text-xs text-muted-foreground">{field.help}</p> : null}
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setActiveProvider(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={saveProvider} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save & test
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default IntegrationManager;
