import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { generateGameOverFeedback } from '@/lib/gameLogic';

interface GameOverScreenProps {
  onRestart: () => void;
}

export function GameOverScreen({ onRestart }: GameOverScreenProps) {
  const feedback = generateGameOverFeedback();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-destructive/20 via-background to-muted" dir="rtl">
      <Card className="w-full max-w-lg text-center shadow-2xl border-2 border-destructive/30">
        <CardContent className="p-8 space-y-6">
          {/* Icon */}
          <div className="text-7xl">😔</div>
          
          {/* Title */}
          <h1 className="text-2xl font-bold text-destructive">
            انتهت المحاولات
          </h1>

          {/* Feedback */}
          <div className="bg-muted rounded-xl p-4">
            <p className="text-foreground leading-relaxed">
              {feedback}
            </p>
          </div>

          {/* Encouragement */}
          <div className="text-muted-foreground text-sm space-y-1">
            <p>💡 التفكير التحليلي مهارة تتحسن بالممارسة</p>
            <p>🎯 حاول التركيز على الأدلة التي تكشف التناقضات</p>
          </div>

          {/* Restart Button */}
          <Button 
            onClick={onRestart} 
            size="lg" 
            className="w-full text-lg py-6 font-bold"
            variant="outline"
          >
            ابدأ من جديد 🔄
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
