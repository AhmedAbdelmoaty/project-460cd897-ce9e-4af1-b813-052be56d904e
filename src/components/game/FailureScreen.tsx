import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface FailureScreenProps {
  feedback: string;
  remainingAttempts: number;
  onRetry: () => void;
}

export function FailureScreen({ feedback, remainingAttempts, onRetry }: FailureScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-destructive/10 via-background to-muted" dir="rtl">
      <Card className="w-full max-w-lg text-center shadow-2xl border-2 border-destructive/20">
        <CardContent className="p-8 space-y-6">
          {/* Icon */}
          <div className="text-7xl">🤔</div>
          
          {/* Title */}
          <h1 className="text-2xl font-bold text-foreground">
            ليس تماماً...
          </h1>

          {/* Feedback */}
          <div className="bg-muted rounded-xl p-4">
            <p className="text-foreground leading-relaxed">
              {feedback}
            </p>
          </div>

          {/* Remaining attempts */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-muted-foreground">المحاولات المتبقية:</span>
            <div className="flex gap-1">
              {[...Array(3)].map((_, i) => (
                <div 
                  key={i}
                  className={`w-4 h-4 rounded-full ${
                    i < remainingAttempts ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Retry Button */}
          <Button 
            onClick={onRetry} 
            size="lg" 
            className="w-full text-lg py-6 font-bold"
          >
            حاول مجدداً 🔄
          </Button>
          
          <p className="text-sm text-muted-foreground">
            ستبدأ من جديد مع نفس السيناريو
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
