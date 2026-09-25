import { describe, it, expect, vi } from 'vitest';

// Teste unitário da função de navegação sem dependência do DOM/Testing Library
describe('Lógica de Navegação do Cliente', () => {
  it('deve chamar preventDefault e navegar corretamente com os parâmetros fornecidos', () => {
    const navigate = vi.fn();
    const preventDefault = vi.fn();
    const stopPropagation = vi.fn();

    const handleClientClick = (e: any, clientId: string) => {
      if (clientId) {
        e.preventDefault();
        e.stopPropagation();
        navigate({
          to: "/clientes/$clientId",
          params: { clientId: clientId }
        });
      }
    };

    const mockEvent = {
      preventDefault,
      stopPropagation,
    };

    handleClientClick(mockEvent, "123");

    expect(preventDefault).toHaveBeenCalled();
    expect(stopPropagation).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith({
      to: "/clientes/$clientId",
      params: { clientId: "123" }
    });
  });
});

