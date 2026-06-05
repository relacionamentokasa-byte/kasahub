import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Loader2 } from "lucide-react";
import {
  fetchClientServices,
  addClientService,
  updateClientService,
  removeClientService,
  type ClientService,
} from "@/lib/client-services-api";
import { fetchServices } from "@/lib/services-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";

const BRL = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function ClientServicesManager({ clientId }: { clientId: string }) {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [newServiceId, setNewServiceId] = useState("");

  const { data: services = [] } = useQuery({
    queryKey: ["services", "active"],
    queryFn: () => fetchServices({ onlyActive: true }),
  });

  const { data: contracted = [] } = useQuery({
    queryKey: ["client-services", clientId],
    queryFn: () => fetchClientServices(clientId),
  });

  const available = services.filter((s) => !contracted.some((cs) => cs.service_id === s.id));

  const add = useMutation({
    mutationFn: (service_id: string) =>
      addClientService({ client_id: clientId, service_id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-services", clientId] });
      toast.success("Serviço contratado");
      setAdding(false);
      setNewServiceId("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<ClientService> }) =>
      updateClientService(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client-services", clientId] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => removeClientService(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-services", clientId] });
      toast.success("Serviço removido");
    },
  });

  const serviceById = (id: string) => services.find((s) => s.id === id);

  const monthlyTotal = contracted
    .filter((c) => c.status === "active" && c.contract_type === "recurring")
    .reduce((s, c) => s + Number(c.monthly_value), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-foreground/50">
            Serviços contratados
          </div>
          <div className="font-display text-lg font-bold">
            {contracted.length} {contracted.length === 1 ? "serviço" : "serviços"} ·{" "}
            <span className="text-primary">{BRL(monthlyTotal)}/mês</span>
          </div>
        </div>
        {!adding && available.length > 0 && (
          <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
            <Plus className="size-4 mr-1.5" /> Adicionar
          </Button>
        )}
      </div>

      {adding && (
        <div className="bg-background/40 border border-dashed border-border rounded-xl p-3 flex gap-2 items-end">
          <div className="flex-1 space-y-1">
            <Label className="text-xs">Selecionar serviço</Label>
            <Select value={newServiceId} onValueChange={setNewServiceId}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um serviço da biblioteca" />
              </SelectTrigger>
              <SelectContent>
                {available.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            size="sm"
            disabled={!newServiceId || add.isPending}
            onClick={() => add.mutate(newServiceId)}
          >
            {add.isPending ? <Loader2 className="size-4 animate-spin" /> : "Adicionar"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
            Cancelar
          </Button>
        </div>
      )}

      {contracted.length === 0 && !adding ? (
        <div className="bg-surface border border-dashed border-border rounded-xl p-8 text-center text-sm text-foreground/40">
          Nenhum serviço contratado.
          <br />
          Adicione serviços da biblioteca para liberar templates de projeto e recorrências financeiras.
        </div>
      ) : (
        <div className="space-y-2">
          {contracted.map((cs) => {
            const svc = serviceById(cs.service_id);
            return (
              <div
                key={cs.id}
                className="bg-surface border border-border rounded-xl p-4 grid grid-cols-12 gap-3 items-end"
              >
                <div className="col-span-12 md:col-span-3">
                  <div className="text-[10px] uppercase text-foreground/50">Serviço</div>
                  <div className="font-medium">{svc?.name ?? "Serviço removido"}</div>
                  {svc?.category && (
                    <div className="text-[10px] text-foreground/40 mt-0.5">{svc.category}</div>
                  )}
                </div>
                <div className="col-span-6 md:col-span-2 space-y-1">
                  <Label className="text-[10px]">Tipo</Label>
                  <Select
                    value={cs.contract_type}
                    onValueChange={(v) =>
                      update.mutate({ id: cs.id, patch: { contract_type: v } })
                    }
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recurring">Mensal</SelectItem>
                      <SelectItem value="one_time">Único</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {cs.contract_type === "recurring" ? (
                  <>
                    <div className="col-span-6 md:col-span-2 space-y-1">
                      <Label className="text-[10px]">Valor mensal</Label>
                      <Input
                        type="number"
                        className="h-9"
                        defaultValue={cs.monthly_value}
                        onBlur={(e) =>
                          update.mutate({
                            id: cs.id,
                            patch: { monthly_value: Number(e.target.value) || 0 },
                          })
                        }
                      />
                    </div>
                    <div className="col-span-6 md:col-span-2 space-y-1">
                      <Label className="text-[10px]">Dia cobrança</Label>
                      <Input
                        type="number"
                        min={1}
                        max={28}
                        className="h-9"
                        defaultValue={cs.billing_day}
                        onBlur={(e) =>
                          update.mutate({
                            id: cs.id,
                            patch: { billing_day: Number(e.target.value) || 5 },
                          })
                        }
                      />
                    </div>
                  </>
                ) : (
                  <div className="col-span-6 md:col-span-4 space-y-1">
                    <Label className="text-[10px]">Valor único</Label>
                    <Input
                      type="number"
                      className="h-9"
                      defaultValue={cs.one_time_value}
                      onBlur={(e) =>
                        update.mutate({
                          id: cs.id,
                          patch: { one_time_value: Number(e.target.value) || 0 },
                        })
                      }
                    />
                  </div>
                )}
                <div className="col-span-4 md:col-span-2 space-y-1">
                  <Label className="text-[10px]">Status</Label>
                  <Select
                    value={cs.status}
                    onValueChange={(v) => update.mutate({ id: cs.id, patch: { status: v } })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="paused">Pausado</SelectItem>
                      <SelectItem value="ended">Encerrado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-8 md:col-span-1 flex justify-end">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      if (confirm("Remover este serviço do cliente?")) remove.mutate(cs.id);
                    }}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
