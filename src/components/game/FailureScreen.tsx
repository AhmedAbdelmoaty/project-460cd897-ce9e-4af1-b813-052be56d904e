import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface FailureScreenProps {
  feedback: string;
  score?: number;
  remainingAttempts: number;
  onRetry: () => void;
}

export function FailureScreen({ feedback, score, remainingAttempts, onRetry }: FailureScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-destructive/10 via-background to-muted" dir="rtl">
      <Card className="w-full max-w-lg text-center shadow-2xl border-2 border-destructive/20">
        <CardContent className="p-8 space-y-6">
          <div className="text-7xl">🤔</div>

          <h1 className="text-2xl font-bold text-foreground">مش كده...</h1>

          {typeof score === 'number' && (
            <div className="flex items-center justify-center gap-2">
              <span className="text-muted-foreground">نقطك:</span>
              <span className="text-xl font-bold">{score}</span>
            </div>
          )}

          <div className="bg-muted rounded-xl p-4">
            <p className="text-foreground leading-relaxed">{feedback}</p>
          </div>

          <div className="flex items-center justify-center gap-2">
            <span className="text-muted-foreground">المحاولات المتبقية:</span>
            <div className="flex gap-1">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full ${i < remainingAttempts ? 'bg-primary' : 'bg-muted'}`}
                />
              ))}
            </div>
          </div>

          <Button onClick={onRetry} size="lg" className="w-full text-lg py-6 font-bold">
            حاول تاني 🔄
          </Button>

          <p className="text-sm text-muted-foreground">هتبدأ محاولة جديدة في نفس الكيس</p>
        </CardContent>
      </Card>
    </div>
  );
}
