import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock do TanStack Router
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params, ...props }: any) => (
    <a href={to} {...props} onClick={(e) => {
        // Simula o comportamento que corrigimos
        if (props.onClick) props.onClick(e);
        if (props['data-testid'] === 'client-link' && !e.defaultPrevented) {
            // Se não prevenirmos o padrão, ele rolaria (aqui apenas simulamos)
        }
    }}>
      {children}
    </a>
  ),
  useNavigate: () => vi.fn(),
  createFileRoute: () => () => ({}),
}));
