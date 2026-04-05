import { useRef, ChangeEvent, KeyboardEvent } from 'react';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}

function formatPhoneDigits(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  let d10: string;
  if (digits.startsWith('7') || digits.startsWith('8')) {
    d10 = digits.slice(1, 11);
  } else {
    d10 = digits.slice(0, 10);
  }
  if (d10.length === 0) return '';
  if (d10.length <= 3) return `+7 (${d10}`;
  if (d10.length <= 6) return `+7 (${d10.slice(0, 3)}) ${d10.slice(3)}`;
  if (d10.length <= 8) return `+7 (${d10.slice(0, 3)}) ${d10.slice(3, 6)}-${d10.slice(6)}`;
  return `+7 (${d10.slice(0, 3)}) ${d10.slice(3, 6)}-${d10.slice(6, 8)}-${d10.slice(8, 10)}`;
}

export function PhoneInput({ value, onChange, required, className, placeholder, disabled, id }: PhoneInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(formatPhoneDigits(e.target.value));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      const v = inputRef.current?.value ?? '';
      const last = v.slice(-1);
      if (last === ' ' || last === '(' || last === ')' || last === '-') {
        e.preventDefault();
        onChange(formatPhoneDigits(v.slice(0, -2)));
      }
    }
  };

  return (
    <input
      ref={inputRef}
      type="tel"
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      required={required}
      disabled={disabled}
      id={id}
      placeholder={placeholder ?? '+7 (999) 000-00-00'}
      className={className}
    />
  );
}
