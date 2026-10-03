import { SearchX } from 'lucide-react';
export default function EmptyState({ title = 'Nenhuma oferta encontrada.', description = 'Tente alterar a pesquisa ou os filtros.' }: { title?: string; description?: string }) {
  return <div className="empty-state"><SearchX size={34} /><h3>{title}</h3><p>{description}</p></div>;
}
