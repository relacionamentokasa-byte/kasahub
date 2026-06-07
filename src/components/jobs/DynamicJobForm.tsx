import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";

interface DynamicFormProps {
  jobType: string | null;
  flowJobId?: string | null;
  data: any;
  onChange: (newData: any) => void;
  readOnly?: boolean;
}

export function DynamicJobForm({ jobType, flowJobId, data, onChange, readOnly }: DynamicFormProps) {
  const [schema, setSchema] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadSchema() {
      if (!flowJobId) {
        setSchema([]);
        return;
      }
      setLoading(true);
      try {
        // Try to load from service_job_templates (linked to services)
        const { data: tplData } = await supabase
          .from('service_job_templates')
          .select('custom_fields_schema')
          .eq('id', flowJobId)
          .maybeSingle() as any;
        
        const schemaData = tplData?.custom_fields_schema;
        setSchema(Array.isArray(schemaData) ? schemaData : []);
      } catch (err) {
        console.error("Erro ao carregar esquema do formulário:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSchema();
  }, [flowJobId]);

  if (loading) return <div className="p-4 text-center text-[10px] text-foreground/40 animate-pulse">Carregando formulário...</div>;
  if (!schema || schema.length === 0) {
    return (
      <div className="p-4 border border-dashed border-border rounded-lg text-center">
        <p className="text-[10px] text-foreground/40 italic">Nenhum formulário dinâmico configurado para este tipo de job.</p>
      </div>
    );
  }

  const handleChange = (key: string, value: any) => {
    onChange({ ...data, [key]: value });
  };

  return (
    <div className="grid grid-cols-1 gap-4">
      {schema.map((field, idx) => (
        <div key={idx} className="space-y-1.5">
          <Label className="text-[10px] font-mono-kasa capitalize text-foreground/60">
            {field.label} {field.required && <span className="text-destructive">*</span>}
          </Label>
          
          {field.type === 'textarea' ? (
            <Textarea 
              value={data[field.label] || ""} 
              onChange={(e) => handleChange(field.label, e.target.value)}
              disabled={readOnly}
              className="min-h-[80px]"
            />
          ) : field.type === 'select' ? (
            <Select 
              value={data[field.label] || ""} 
              onValueChange={(val) => handleChange(field.label, val)}
              disabled={readOnly}
            >
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {(field.options || "").split(',').map((opt: string) => (
                  <SelectItem key={opt.trim()} value={opt.trim()}>{opt.trim()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : field.type === 'number' ? (
            <Input 
              type="number"
              value={data[field.label] || ""} 
              onChange={(e) => handleChange(field.label, e.target.value)}
              disabled={readOnly}
            />
          ) : field.type === 'date' ? (
            <Input 
              type="date"
              value={data[field.label] || ""} 
              onChange={(e) => handleChange(field.label, e.target.value)}
              disabled={readOnly}
            />
          ) : field.type === 'time' ? (
            <Input 
              type="time"
              value={data[field.label] || ""} 
              onChange={(e) => handleChange(field.label, e.target.value)}
              disabled={readOnly}
            />
          ) : field.type === 'currency' ? (
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-foreground/40">R$</span>
              <Input 
                className="pl-8"
                type="number"
                step="0.01"
                value={data[field.label] || ""} 
                onChange={(e) => handleChange(field.label, e.target.value)}
                disabled={readOnly}
              />
            </div>
          ) : (
            <Input 
              type="text"
              value={data[field.label] || ""} 
              onChange={(e) => handleChange(field.label, e.target.value)}
              disabled={readOnly}
            />
          )}
        </div>
      ))}
    </div>
  );
}
