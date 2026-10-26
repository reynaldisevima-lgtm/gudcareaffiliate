import { COMPANY } from '@/lib/config';

export default function Logo() {
  return (
    <span className="logo">
      <span className="logo-mark" aria-hidden="true">{COMPANY.name[0]}</span>
      {COMPANY.name}
    </span>
  );
}
