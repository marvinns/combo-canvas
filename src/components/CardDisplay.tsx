import { useCardImage } from '@/hooks/useCardImage';
import type { ComboAction } from '@/lib/comboParser';

const STAR_BORDER_TYPES: Record<string, string> = {
  synchro: 'star-border-synchro',
  fusion: 'star-border-fusion',
  link: 'star-border-link',
  xyz: 'star-border-xyz',
};

export function CardDisplay({ name, actionType }: { name: string; actionType?: ComboAction['type'] }) {
  const { data, isLoading } = useCardImage(name);
  const starClass = actionType ? STAR_BORDER_TYPES[actionType] : undefined;

  const cardContent = (
    <>
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
    </>
  );

  return (
    <div className="flex flex-col items-center gap-2 shrink-0">
      {starClass ? (
        <div className={`star-border-container ${starClass}`}>
          <div className="border-gradient-bottom" />
          <div className="border-gradient-top" />
          <div className="inner-content w-[140px] h-[204px]">
            {cardContent}
          </div>
        </div>
      ) : (
        <div className="w-[140px] h-[204px] rounded-lg overflow-hidden card-shadow border border-border/50 bg-secondary">
          {cardContent}
        </div>
      )}
      <span className="text-xs font-body text-muted-foreground max-w-[140px] text-center truncate">
        {data?.name || name}
      </span>
    </div>
  );
}
