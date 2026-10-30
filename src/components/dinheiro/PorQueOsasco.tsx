// Indicador padrão de Verbas: diz qual registro liga o item a Osasco, quando isso não é óbvio (empresa de fora, emenda sem destino na cidade).
export function PorQueOsasco({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`rounded-md bg-blue-50 px-2 py-1 text-[11px] text-slate-700 ${className}`}>
      <b className="font-semibold text-slate-900">Por que Osasco:</b> {children}
    </p>
  );
}
