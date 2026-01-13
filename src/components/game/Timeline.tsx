import { TimelineItem } from '@/types/game';

interface TimelineProps {
  items: TimelineItem[];
}

export function Timeline({ items }: TimelineProps) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="flex gap-3">
          {/* Step number */}
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            item.isPositive 
              ? 'bg-success text-success-foreground' 
              : 'bg-destructive text-destructive-foreground'
          }`}>
            {item.step}
          </div>
          
          {/* Content */}
          <div className="flex-1 pb-3 border-b border-border last:border-0">
            <p className="font-medium text-foreground text-sm">
              {item.description}
            </p>
            <p className={`text-xs mt-1 ${
              item.isPositive ? 'text-success' : 'text-destructive'
            }`}>
              {item.outcome}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
