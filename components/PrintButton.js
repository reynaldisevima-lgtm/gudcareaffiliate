'use client';
export default function PrintButton({ children = 'Cetak', ...props }) {
  return <button type="button" {...props} onClick={() => window.print()}>{children}</button>;
}
