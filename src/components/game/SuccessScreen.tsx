import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GameSession } from '@/types/game';
import { calculateGameResult } from '@/lib/gameLogic';
import { Timeline } from './Timeline';

interface SuccessScreenProps {
  session: GameSession;
  onRestart: () => void;
}

export function SuccessScreen({ session, onRestart }: SuccessScreenProps) {
  const result = calculateGameResult(session);

  const rankColors: Record<string, string> = {
    S: 'from-yellow-400 to-amber-500',
    A: 'from-slate-300 to-slate-400',
    B: 'from-amber-600 to-amber-700',
    C: 'from-slate-500 to-slate-600',
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-success/10 via-background to-primary/10" dir="rtl">
      <div className="w-full max-w-2xl space-y-6">
        {/* Success Header */}
        <Card className="text-center shadow-2xl border-2 border-success/30 overflow-hidden">
          <div className="bg-gradient-to-r from-success/20 to-accent/20 p-6">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-3xl font-bold text-foreground">
              أحسنت! حللت اللغز!
            </h1>
          </div>
          
          <CardContent className="p-6 space-y-6">
            {/* Score and Rank */}
            <div className="flex justify-center gap-8">
              {/* Score */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">النقاط</p>
                <p className="text-4xl font-bold text-primary">{result.score}</p>
                <p className="text-xs text-muted-foreground">من {result.maxScore}</p>
              </div>
              
              {/* Rank */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">الرتبة</p>
                <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${rankColors[result.rank]} flex items-center justify-center mx-auto shadow-lg`}>
                  <span className="text-3xl">{result.rankIcon}</span>
                </div>
                <p className="text-lg font-bold mt-1">{result.rank}</p>
              </div>

              {/* Attempts */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">المحاولات</p>
                <p className="text-4xl font-bold text-accent">{result.attemptUsed}</p>
                <p className="text-xs text-muted-foreground">من 3</p>
              </div>
            </div>

            {/* Feedback */}
            <div className="bg-muted/50 rounded-xl p-4">
              <p className="text-foreground leading-relaxed">
                {result.feedbackText}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <span>📊</span>
              مسار التحقيق
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Timeline items={result.timeline} />
          </CardContent>
        </Card>

        {/* Play Again */}
        <Button 
          onClick={onRestart} 
          size="lg" 
          className="w-full text-lg py-6 font-bold shadow-lg"
          variant="outline"
        >
          العب مجدداً 🔄
        </Button>
      </div>
    </div>
  );
}
