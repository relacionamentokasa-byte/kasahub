import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, Trash2, Clock, Phone, UserCheck, Shield } from "lucide-react";
import { fetchProfiles } from "@/lib/profile-api";
import type { CallSheetCrewMember } from "@/types/call-sheet";

interface Props {
  crew: CallSheetCrewMember[];
  defaultCallTime?: string;
  onChange: (crew: CallSheetCrewMember[]) => void;
}

const COMMON_ROLES = [
  "Diretor(a)",
  "Diretor(a) de Fotografia / DoP",
  "Operador(a) de Câmera",
  "Assistente de Câmera / AC",
  "Técnico de Som Direto",
  "Gaffer / Iluminador",
  "Produtor(a) Executivo",
  "Produtor(a) de Set",
  "Diretor(a) de Arte / Figurino",
  "Maquiador(a)",
  "Social Media / Fotógrafo Still",
  "Elenco / Convidado",
  "Cliente / Acompanhante",
];

export function CallSheetCrewSection({ crew, defaultCallTime = "08:00", onChange }: Props) {
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles"],
    queryFn: fetchProfiles,
  });

  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState(COMMON_ROLES[0]);
  const [newMemberTime, setNewMemberTime] = useState(defaultCallTime);
  const [newMemberPhone, setNewMemberPhone] = useState("");

  const handleAddMember = () => {
    if (!newMemberName.trim()) return;

    const newMember: CallSheetCrewMember = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
      name: newMemberName.trim(),
      role: newMemberRole,
      call_time: newMemberTime || defaultCallTime,
      phone: newMemberPhone.trim(),
      confirmed: false,
    };

    onChange([...crew, newMember]);
    setNewMemberName("");
    setNewMemberPhone("");
  };

  const handleAddProfile = (profileId: string) => {
    const profile = profiles.find((p) => p.id === profileId);
    if (!profile) return;

    const newMember: CallSheetCrewMember = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
      profile_id: profile.id,
      name: profile.display_name || profile.full_name || "Membro Kasa",
      role: profile.job_title || "Equipe Kasa",
      call_time: defaultCallTime,
      phone: "",
      confirmed: true,
    };

    onChange([...crew, newMember]);
  };

  const handleUpdate = (id: string, patch: Partial<CallSheetCrewMember>) => {
    onChange(crew.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const handleRemove = (id: string) => {
    onChange(crew.filter((m) => m.id !== id));
  };

  return (
    <div className="rounded-xl border border-border/70 bg-card p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-primary" />
          <h3 className="text-xs font-semibold text-foreground tracking-tight">Equipe & Convocados da Diária</h3>
          <span className="text-[10px] font-mono-kasa bg-muted/60 text-muted-foreground px-2 py-0.5 rounded-full">
            {crew.length} {crew.length === 1 ? "pessoa" : "pessoas"}
          </span>
        </div>

        {/* Seleção Rápida de Perfil Interno */}
        <div className="flex items-center gap-2">
          <Select onValueChange={handleAddProfile}>
            <SelectTrigger className="h-8 text-xs bg-muted/20 border-border/60 w-48">
              <SelectValue placeholder="+ Adicionar da equipe Kasa" />
            </SelectTrigger>
            <SelectContent>
              {profiles.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-xs">
                  {p.display_name || p.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lista de Convocados */}
      {crew.length === 0 ? (
        <div className="py-6 border border-dashed border-border/60 rounded-lg text-center bg-muted/10">
          <p className="text-xs text-muted-foreground">Nenhum membro ou convidado adicionado à chamada da diária.</p>
          <p className="text-[11px] text-muted-foreground/70 mt-1">
            Selecione um membro da equipe Kasa acima ou preencha o formulário abaixo.
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {crew.map((member) => (
            <div
              key={member.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg border border-border/50 bg-muted/10 hover:bg-muted/20 transition-colors"
            >
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div className="size-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-xs">
                  {member.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground truncate">{member.name}</span>
                    {member.profile_id && (
                      <span className="text-[9px] font-mono-kasa bg-primary/10 text-primary px-1.5 py-0.2 rounded">
                        Kasa
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                    <span className="truncate">{member.role}</span>
                    {member.phone && <span className="font-mono-kasa flex items-center gap-1"><Phone className="size-2.5" />{member.phone}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                {/* Horário de Chamada Individual */}
                <div className="flex items-center gap-1">
                  <Clock className="size-3 text-muted-foreground" />
                  <Input
                    type="time"
                    value={member.call_time}
                    onChange={(e) => handleUpdate(member.id, { call_time: e.target.value })}
                    className="h-7 w-20 text-[11px] font-mono-kasa bg-background border-border/60 p-1 text-center"
                    title="Horário de Chamada"
                  />
                </div>

                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => handleRemove(member.id)}
                  className="size-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md"
                  title="Remover da convocação"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Formulário Rápido para Novo Convocado (Externo / Elenco) */}
      <div className="pt-2 border-t border-border/40">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
          <div className="sm:col-span-4">
            <Input
              placeholder="Nome do profissional / elenco..."
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              className="h-8 text-xs bg-muted/20 border-border/60"
            />
          </div>
          <div className="sm:col-span-3">
            <Input
              placeholder="Função (ex: Diretor, Ator)"
              value={newMemberRole}
              onChange={(e) => setNewMemberRole(e.target.value)}
              className="h-8 text-xs bg-muted/20 border-border/60"
            />
          </div>
          <div className="sm:col-span-2">
            <Input
              type="time"
              value={newMemberTime}
              onChange={(e) => setNewMemberTime(e.target.value)}
              className="h-8 text-xs bg-muted/20 border-border/60 font-mono-kasa"
            />
          </div>
          <div className="sm:col-span-2">
            <Input
              placeholder="WhatsApp"
              value={newMemberPhone}
              onChange={(e) => setNewMemberPhone(e.target.value)}
              className="h-8 text-xs bg-muted/20 border-border/60"
            />
          </div>
          <div className="sm:col-span-1">
            <Button
              type="button"
              size="sm"
              onClick={handleAddMember}
              disabled={!newMemberName.trim()}
              className="h-8 w-full text-xs"
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
