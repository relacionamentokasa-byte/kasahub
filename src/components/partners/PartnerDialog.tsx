import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPartner, updatePartner, type Partner, type PartnerType } from "@/lib/partners-api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";



interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partner?: Partner | null;
  type: PartnerType;
}

export function PartnerDialog({ open, onOpenChange, partner, type }: Props) {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState<Partial<Partner>>({
    type,
    name: "",
    email: "",
    phone: "",
    whatsapp: "",
    city: "",
    document: "",
    pix_key: "",
    bank_info: "",
    status: "active",
    observations: "",
    photo_url: null,
    // Specific
    commission_type: "percentage",
    commission_value: 0,
    specialty: "",
    hourly_rate: 0,
    project_rate: 0,
    availability: "",
    company_name: "",
    responsible_name: "",
    partnership_type: "",
  });


  useEffect(() => {
    if (partner) {
      setForm(partner);
    } else {
      setForm({ ...form, type, name: "", email: "", phone: "", whatsapp: "", city: "", document: "", pix_key: "", bank_info: "", status: "active", observations: "" });
    }
  }, [partner, type]);

  const mut = useMutation({
    mutationFn: (data: Partial<Partner>) => {
      if (partner?.id) return updatePartner(partner.id, data);
      return createPartner(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["partners"] });
      toast.success(partner ? "Parceiro atualizado" : "Parceiro criado");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("A foto deve ter no máximo 2MB");
      return;
    }

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `partners/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('partners-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('partners-photos')
        .getPublicUrl(filePath);

      setForm(prev => ({ ...prev, photo_url: publicUrl }));
      toast.success("Foto enviada com sucesso");
    } catch (error: any) {
      toast.error("Erro ao enviar foto: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {

    if (!form.name) {
      toast.error("O nome é obrigatório");
      return;
    }
    mut.mutate(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-surface border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {partner ? "Editar" : "Novo"} {typeLabel(type)}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="space-y-4">
          <TabsList className="bg-background">
            <TabsTrigger value="basic">Dados Básicos</TabsTrigger>
            <TabsTrigger value="financial">Financeiro / PIX</TabsTrigger>
            <TabsTrigger value="specific">Específicos</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="flex flex-col items-center gap-4 mb-6">
              <div className="relative group">
                <Avatar className="size-24 border-2 border-primary/20 bg-background shadow-lg">
                  <AvatarImage src={form.photo_url || ""} />
                  <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary uppercase">
                    {form.name ? form.name.substring(0, 2) : "P"}
                  </AvatarFallback>
                </Avatar>
                
                <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <Camera className="size-6 text-white" />
                </div>
                
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden" 
                  accept="image/*"
                  onChange={handleUpload}
                />
                
                <Button 
                  type="button" 
                  size="sm" 
                  variant="outline" 
                  className="absolute -bottom-2 -right-2 size-8 p-0 rounded-full bg-surface"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
                </Button>

                {form.photo_url && (
                  <Button 
                    type="button" 
                    size="sm" 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 size-6 p-0 rounded-full"
                    onClick={() => setForm(prev => ({ ...prev, photo_url: null }))}
                  >
                    <X className="size-3" />
                  </Button>
                )}
              </div>
               <p className="text-[10px] uppercase font-mono-kasa text-foreground/40 font-bold tracking-wider">
                 Foto do {typeLabel(type)}
               </p>
             </div>

            <div className="grid grid-cols-2 gap-4">

              <div className="space-y-1.5">
                <Label>Nome Completo</Label>
                <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input type="email" value={form.email || ""} onChange={e => setForm({...form, email: e.target.value})} className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label>Telefone / WhatsApp</Label>
                <Input value={form.phone || ""} onChange={e => setForm({...form, phone: e.target.value})} className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label>Cidade</Label>
                <Input value={form.city || ""} onChange={e => setForm({...form, city: e.target.value})} className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label>CPF / CNPJ</Label>
                <Input value={form.document || ""} onChange={e => setForm({...form, document: e.target.value})} className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v as any})}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea value={form.observations || ""} onChange={e => setForm({...form, observations: e.target.value})} rows={3} className="bg-background" />
            </div>
          </TabsContent>

          <TabsContent value="financial" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Chave PIX</Label>
                <Input value={form.pix_key || ""} onChange={e => setForm({...form, pix_key: e.target.value})} className="bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label>Informações Bancárias</Label>
                <Input value={form.bank_info || ""} onChange={e => setForm({...form, bank_info: e.target.value})} placeholder="Banco, Agência, Conta..." className="bg-background" />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="specific" className="space-y-4">
            {type === 'representative' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Tipo de Comissão</Label>
                  <Select value={form.commission_type || "percentage"} onValueChange={v => setForm({...form, commission_type: v})}>
                    <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentual (%)</SelectItem>
                      <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Valor da Comissão</Label>
                  <Input type="number" value={form.commission_value || 0} onChange={e => setForm({...form, commission_value: Number(e.target.value)})} className="bg-background" />
                </div>
              </div>
            )}

            {type === 'freelancer' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Especialidade</Label>
                  <Select value={form.specialty || ""} onValueChange={v => setForm({...form, specialty: v})}>
                    <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Designer">Designer</SelectItem>
                      <SelectItem value="Social Media">Social Media</SelectItem>
                      <SelectItem value="Copywriter">Copywriter</SelectItem>
                      <SelectItem value="Gestor de Tráfego">Gestor de Tráfego</SelectItem>
                      <SelectItem value="Desenvolvedor">Desenvolvedor</SelectItem>
                      <SelectItem value="Videomaker">Videomaker</SelectItem>
                      <SelectItem value="Motion Designer">Motion Designer</SelectItem>
                      <SelectItem value="Fotógrafo">Fotógrafo</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Disponibilidade</Label>
                  <Input value={form.availability || ""} onChange={e => setForm({...form, availability: e.target.value})} className="bg-background" />
                </div>
                <div className="space-y-1.5">
                  <Label>Valor Hora (R$)</Label>
                  <Input type="number" value={form.hourly_rate || 0} onChange={e => setForm({...form, hourly_rate: Number(e.target.value)})} className="bg-background" />
                </div>
                <div className="space-y-1.5">
                  <Label>Valor Projeto (R$)</Label>
                  <Input type="number" value={form.project_rate || 0} onChange={e => setForm({...form, project_rate: Number(e.target.value)})} className="bg-background" />
                </div>
              </div>
            )}

            {(type === 'supplier' || type === 'strategic') && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Razão Social / Empresa</Label>
                  <Input value={form.company_name || ""} onChange={e => setForm({...form, company_name: e.target.value})} className="bg-background" />
                </div>
                <div className="space-y-1.5">
                  <Label>Responsável</Label>
                  <Input value={form.responsible_name || ""} onChange={e => setForm({...form, responsible_name: e.target.value})} className="bg-background" />
                </div>
                {type === 'strategic' && (
                  <div className="space-y-1.5 col-span-2">
                    <Label>Tipo de Parceria</Label>
                    <Input value={form.partnership_type || ""} onChange={e => setForm({...form, partnership_type: e.target.value})} placeholder="Ex: Networking, Consultoria..." className="bg-background" />
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={mut.isPending}>
            {partner ? "Salvar Alterações" : "Criar Parceiro"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function typeLabel(type: PartnerType) {
  switch (type) {
    case 'representative': return 'Representante';
    case 'freelancer': return 'Freelancer';
    case 'supplier': return 'Fornecedor';
    case 'strategic': return 'Parceiro Estratégico';
  }
}
