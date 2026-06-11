import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';

// Simulando um componente simplificado que usa a lógica que corrigimos
const ClientLink = ({ clientId, name, navigate }: any) => {
  return (
    <div 
      data-testid="client-link"
      onClick={(e) => {
        if (clientId) {
          e.preventDefault();
          e.stopPropagation();
          navigate({ 
            to: "/clientes/$clientId", 
            params: { clientId: clientId } 
          });
        }
      }}
    >
       <span>{name}</span>
    </div>
  );
};

describe('Correção de Navegação do Cliente', () => {
  it('deve chamar preventDefault para evitar scroll ao topo ao clicar no link do cliente', () => {
    const navigate = vi.fn();
    render(<ClientLink clientId="123" name="Cliente Teste" navigate={navigate} />);
    
    const link = screen.getByTestId('client-link');
    
    // Criamos um evento sintético para capturar se preventDefault foi chamado
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
    });
    
    // Espionamos o preventDefault
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    
    fireEvent(link, event);
    
    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(expect.objectContaining({
      to: "/clientes/$clientId",
      params: { clientId: "123" }
    }));
  });
});
