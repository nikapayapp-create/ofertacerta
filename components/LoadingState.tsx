export default function LoadingState({ label = 'Carregando ofertas…' }: { label?: string }) {
  return <div className="loading-state"><span className="spinner" />{label}</div>;
}
