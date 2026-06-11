import '@testing-library/jest-dom';
import { vi } from 'vitest';
import React from 'react';

// Mock do TanStack Router
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params, ...props }: any) => {
    return React.createElement('a', {
      href: to,
      ...props,
      onClick: (e: any) => {
        if (props.onClick) props.onClick(e);
      }
    }, children);
  },
  useNavigate: () => vi.fn(),
  createFileRoute: () => () => ({}),
}));
