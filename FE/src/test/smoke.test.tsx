import { it, expect, describe } from 'vitest';
import { render, screen } from '@testing-library/react';

describe('Testing Library (jsdom)', () => {
  it('renders and asserts with jest-dom matchers', () => {
    render(<div role="status">setup-ok</div>);
    expect(screen.getByRole('status')).toHaveTextContent('setup-ok');
  });
});
