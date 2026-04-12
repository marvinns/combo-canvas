import { useCardImage } from '@/hooks/useCardImage';

export function CardDisplay({ name }: { name: string }) {
  const { data, isLoading } = useCardImage(name);

  return (
    <div className="flex flex-col items-center gap-2 shrink-0">
      <div className="w-[140px] h-[204px] rounded-lg overflow-hidden card-shadow border border-border/50 bg-secondary">
        {isLoading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data ? (
          <img
            src={data.imageUrl}
            alt={data.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center p-2 text-center text-xs text-muted-foreground">
            {name}
          </div>
        )}
      </div>
      <span className="text-xs font-body text-muted-foreground max-w-[140px] text-center truncate">
        {data?.name || name}
      </span>
    </div>
  );
}
