export interface BrazilCity {
  nome: string;
  uf: string;
  label: string;
}

export const TOP_BRAZILIAN_CITIES: BrazilCity[] = [
  { nome: "São Paulo", uf: "SP", label: "São Paulo, SP" },
  { nome: "Rio de Janeiro", uf: "RJ", label: "Rio de Janeiro, RJ" },
  { nome: "Belo Horizonte", uf: "MG", label: "Belo Horizonte, MG" },
  { nome: "Brasília", uf: "DF", label: "Brasília, DF" },
  { nome: "Curitiba", uf: "PR", label: "Curitiba, PR" },
  { nome: "Porto Alegre", uf: "RS", label: "Porto Alegre, RS" },
  { nome: "Salvador", uf: "BA", label: "Salvador, BA" },
  { nome: "Fortaleza", uf: "CE", label: "Fortaleza, CE" },
  { nome: "Recife", uf: "PE", label: "Recife, PE" },
  { nome: "Goiânia", uf: "GO", label: "Goiânia, GO" },
  { nome: "Campinas", uf: "SP", label: "Campinas, SP" },
  { nome: "São José dos Campos", uf: "SP", label: "São José dos Campos, SP" },
  { nome: "Ribeirão Preto", uf: "SP", label: "Ribeirão Preto, SP" },
  { nome: "Sorocaba", uf: "SP", label: "Sorocaba, SP" },
  { nome: "Santos", uf: "SP", label: "Santos, SP" },
  { nome: "São Bernardo do Campo", uf: "SP", label: "São Bernardo do Campo, SP" },
  { nome: "Santo André", uf: "SP", label: "Santo André, SP" },
  { nome: "Osasco", uf: "SP", label: "Osasco, SP" },
  { nome: "Guarulhos", uf: "SP", label: "Guarulhos, SP" },
  { nome: "Londrina", uf: "PR", label: "Londrina, PR" },
  { nome: "Maringá", uf: "PR", label: "Maringá, PR" },
  { nome: "Cascavel", uf: "PR", label: "Cascavel, PR" },
  { nome: "Joinville", uf: "SC", label: "Joinville, SC" },
  { nome: "Florianópolis", uf: "SC", label: "Florianópolis, SC" },
  { nome: "Blumenau", uf: "SC", label: "Blumenau, SC" },
  { nome: "Caxias do Sul", uf: "RS", label: "Caxias do Sul, RS" },
  { nome: "Canoas", uf: "RS", label: "Canoas, RS" },
  { nome: "Uberlândia", uf: "MG", label: "Uberlândia, MG" },
  { nome: "Juiz de Fora", uf: "MG", label: "Juiz de Fora, MG" },
  { nome: "Contagem", uf: "MG", label: "Contagem, MG" },
  { nome: "Vitória", uf: "ES", label: "Vitória, ES" },
  { nome: "Vila Velha", uf: "ES", label: "Vila Velha, ES" },
  { nome: "Niterói", uf: "RJ", label: "Niterói, RJ" },
  { nome: "São Gonçalo", uf: "RJ", label: "São Gonçalo, RJ" },
  { nome: "Duque de Caxias", uf: "RJ", label: "Duque de Caxias, RJ" },
  { nome: "Campo Grande", uf: "MS", label: "Campo Grande, MS" },
  { nome: "Cuiabá", uf: "MT", label: "Cuiabá, MT" },
  { nome: "Manaus", uf: "AM", label: "Manaus, AM" },
  { nome: "Belém", uf: "PA", label: "Belém, PA" },
  { nome: "São Luís", uf: "MA", label: "São Luís, MA" },
  { nome: "Natal", uf: "RN", label: "Natal, RN" },
  { nome: "João Pessoa", uf: "PB", label: "João Pessoa, PB" },
  { nome: "Maceió", uf: "AL", label: "Maceió, AL" },
  { nome: "Aracaju", uf: "SE", label: "Aracaju, SE" },
  { nome: "Teresina", uf: "PI", label: "Teresina, PI" },
  { nome: "Palmas", uf: "TO", label: "Palmas, TO" },
  { nome: "Porto Velho", uf: "RO", label: "Porto Velho, RO" },
  { nome: "Rio Branco", uf: "AC", label: "Rio Branco, AC" },
  { nome: "Boa Vista", uf: "RR", label: "Boa Vista, RR" },
  { nome: "Macapá", uf: "AP", label: "Macapá, AP" },
];

let cachedIbgeCities: BrazilCity[] | null = null;

/**
 * Busca todas as cidades do Brasil via IBGE API pública com cache em memória
 */
export async function fetchAllBrazilCities(): Promise<BrazilCity[]> {
  if (cachedIbgeCities && cachedIbgeCities.length > 0) {
    return cachedIbgeCities;
  }

  try {
    const res = await fetch(
      "https://servicodados.ibge.gov.br/api/v1/localidades/municipios?orderBy=nome"
    );
    if (!res.ok) throw new Error("Falha ao carregar lista de municípios do IBGE");

    const data = await res.json();
    if (Array.isArray(data)) {
      cachedIbgeCities = data.map((item: any) => ({
        nome: item.nome,
        uf: item.microrregiao?.mesorregiao?.UF?.sigla || item["regiao-imediata"]?.["regiao-intermediaria"]?.UF?.sigla || "BR",
        label: `${item.nome}, ${item.microrregiao?.mesorregiao?.UF?.sigla || "BR"}`,
      }));
      return cachedIbgeCities;
    }
  } catch (err) {
    console.warn("Usando cidades padrão do Brasil:", err);
  }

  return TOP_BRAZILIAN_CITIES;
}
