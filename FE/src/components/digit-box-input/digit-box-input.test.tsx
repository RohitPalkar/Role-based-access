import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { it, vi, expect, describe, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

import { DigitBoxInput } from './digit-box-input';

function Controlled({
  onChange,
  initial = '',
  ...rest
}: {
  onChange?: (next: string) => void;
  initial?: string;
} & Partial<Omit<React.ComponentProps<typeof DigitBoxInput>, 'value' | 'onChange'>>) {
  const [val, setVal] = useState(initial);
  return (
    <DigitBoxInput
      {...rest}
      value={val}
      onChange={(next) => {
        setVal(next);
        onChange?.(next);
      }}
    />
  );
}

const getBoxes = (ariaLabel = 'Last 4 Digits of Card') =>
  screen.getAllByRole('textbox', {
    name: new RegExp(String.raw`${ariaLabel} digit \d`, 'i'),
  }) as HTMLInputElement[];

describe('DigitBoxInput', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders the default number (4) of boxes with accessible labels', () => {
    render(<Controlled aria-label="Last 4 Digits of Card" />);
    const boxes = getBoxes();
    expect(boxes).toHaveLength(4);
  });

  it('rejects non-numeric input', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled aria-label="Last 4 Digits of Card" onChange={onChange} />);
    const [first] = getBoxes();

    await user.click(first);
    await user.keyboard('a');

    expect(first.value).toBe('');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('accepts numeric input, auto-advances focus, and emits concatenated value', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled aria-label="Last 4 Digits of Card" onChange={onChange} />);
    const boxes = getBoxes();

    await user.click(boxes[0]);
    await user.keyboard('1');
    await user.keyboard('2');
    await user.keyboard('3');
    await user.keyboard('4');

    expect(boxes[0].value).toBe('1');
    expect(boxes[1].value).toBe('2');
    expect(boxes[2].value).toBe('3');
    expect(boxes[3].value).toBe('4');
    expect(onChange).toHaveBeenLastCalledWith('1234');
  });

  it('handles backspace by clearing previous box and moving focus back', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Controlled aria-label="Last 4 Digits of Card" initial="12" onChange={onChange} />);
    const boxes = getBoxes();

    boxes[2].focus();
    await user.keyboard('{Backspace}');

    expect(boxes[1].value).toBe('');
    expect(document.activeElement).toBe(boxes[1]);
    expect(onChange).toHaveBeenLastCalledWith('1');
  });

  it('accepts a numeric paste of full length', () => {
    const onChange = vi.fn();
    render(<Controlled aria-label="Last 4 Digits of Card" onChange={onChange} />);
    const boxes = getBoxes();

    fireEvent.paste(boxes[0], {
      clipboardData: { getData: () => '5678' },
    });

    expect(onChange).toHaveBeenLastCalledWith('5678');
    expect(boxes[3].value).toBe('8');
  });

  it('ignores a non-numeric paste', () => {
    const onChange = vi.fn();
    render(<Controlled aria-label="Last 4 Digits of Card" onChange={onChange} />);
    const boxes = getBoxes();

    fireEvent.paste(boxes[0], {
      clipboardData: { getData: () => 'abcd' },
    });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows helper text and reflects the error state', () => {
    render(
      <Controlled
        aria-label="Last 4 Digits of Card"
        error
        helperText="Last 4 digits of card are required"
        id="lfd"
      />
    );

    expect(screen.getByText('Last 4 digits of card are required')).toBeInTheDocument();

    const boxes = getBoxes();
    boxes.forEach((box) => {
      expect(box).toHaveAttribute('aria-invalid', 'true');
    });
  });
});
