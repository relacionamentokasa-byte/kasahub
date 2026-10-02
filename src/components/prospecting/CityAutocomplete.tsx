import React, { useState, useEffect, useRef } from "react";
import { MapPin, Check, ChevronDown, Loader2 } from "lucide-react";
import { fetchAllBrazilCities, TOP_BRAZILIAN_CITIES, type BrazilCity } from "@/lib/prospecting/brazil-cities";

interface CityAutocompleteProps {
  value: string;
  onChange: (city: string) => void;
  placeholder?: string;
}

export function CityAutocomplete({
  value,
  onChange,
  placeholder = "Digite qualquer cidade do Brasil...",
}: CityAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const [allCities, setAllCities] = useState<BrazilCity[]>(TOP_BRAZILIAN_CITIES);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  // Carrega a base completa de municípios do IBGE em background
  useEffect(() => {
    let mounted = true;
    async function loadCities() {
      setLoading(true);
      try {
        const list = await fetchAllBrazilCities();
        if (mounted && list.length > 0) {
          setAllCities(list);
        }
      } catch (err) {
        console.warn("Erro ao carregar cidades:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadCities();
    return () => {
      mounted = false;
    };
  }, []);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCities = (searchTerm.trim().length > 0
    ? allCities.filter((c) =>
        c.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.nome.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : allCities
  ).slice(0, 50);

  const handleSelect = (city: BrazilCity) => {
    setSearchTerm(city.label);
    onChange(city.nome);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setSearchTerm(text);
    onChange(text);
    setIsOpen(true);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#869296]" />
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-9 pr-8 py-2 bg-[#FAF8F5] border border-[#E9E4DC] rounded-xl text-xs text-[#0C1618] focus:outline-none focus:border-[#FFBC45] transition placeholder:text-[#869296]"
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {loading ? (
            <Loader2 className="size-3 text-[#FFBC45] animate-spin" />
          ) : (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setIsOpen(!isOpen)}
              className="text-[#869296] hover:text-[#0C1618] p-0.5 cursor-pointer"
            >
              <ChevronDown className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-[#E9E4DC] rounded-xl shadow-lg divide-y divide-gray-50 py-1 font-sans">
          {filteredCities.length === 0 ? (
            <div className="p-3 text-xs text-[#869296] text-center">
              <span>Nenhuma cidade encontrada no IBGE para "<strong>{searchTerm}</strong>".</span>
              <p className="text-[10px] text-[#A0AAB0] mt-0.5">
                (Você pode buscar com este texto livre normalmente)
              </p>
            </div>
          ) : (
            filteredCities.map((c) => {
              const isSelected = value.toLowerCase() === c.nome.toLowerCase() || value.toLowerCase() === c.label.toLowerCase();
              return (
                <button
                  key={`${c.nome}-${c.uf}`}
                  type="button"
                  onClick={() => handleSelect(c)}
                  className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition hover:bg-[#FFF9E6] cursor-pointer ${
                    isSelected ? "bg-[#FFF2D6] font-bold text-[#B45309]" : "text-[#0C1618]"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-3 text-[#FFBC45] shrink-0" />
                    <span>{c.label}</span>
                  </span>
                  {isSelected && <Check className="size-3.5 text-[#B45309]" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
