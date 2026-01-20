import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GameSession } from '@/types/game';
import { calculateGameResult } from '@/lib/gameLogic';
import { Timeline } from './Timeline';

interface SuccessScreenProps {
  session: GameSession;
  onRestart: () => void;
}

export function SuccessScreen({ session, onRestart }: SuccessScreenProps) {
  const result = calculateGameResult(session);
  const scoreThresholds = [120, 200, 300];
  const nextThreshold = scoreThresholds.find((threshold) => result.score < threshold);
  const pointsToNext = nextThreshold ? Math.max(nextThreshold - result.score, 0) : 0;

  const rankStyles: Record<string, { badge: string; glow: string }> = {
    خبير: {
      badge: 'bg-gradient-to-l from-success to-primary text-primary-foreground border-success/40',
      glow: 'shadow-[0_0_30px_rgba(34,197,94,0.35)]',
    },
    'محلل كويس': {
      badge: 'bg-gradient-to-l from-primary to-accent text-primary-foreground border-primary/40',
      glow: 'shadow-[0_0_26px_rgba(99,102,241,0.35)]',
    },
    'على الطريق': {
      badge: 'bg-gradient-to-l from-accent to-info text-accent-foreground border-accent/40',
      glow: 'shadow-[0_0_22px_rgba(14,165,233,0.3)]',
    },
    'يحتاج تدريب': {
      badge: 'bg-gradient-to-l from-muted to-muted/70 text-foreground border-border',
      glow: 'shadow-[0_0_18px_rgba(148,163,184,0.25)]',
    },
  };
  const rankStyle = result.rank ? rankStyles[result.rank] : undefined;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-success/10 via-background to-primary/10" dir="rtl">
      <div className="w-full max-w-2xl space-y-4">
        <Card className="text-center shadow-2xl border-2 border-success/30 overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.18),transparent_60%)]" />
          <div className="relative bg-gradient-to-r from-success/20 to-accent/20 p-4">
            <div className="text-5xl mb-2 animate-bounce">🎉</div>
            <h1 className="text-2xl font-bold text-foreground">مبروك! وصلت للقرار</h1>
            <p className="text-muted-foreground mt-1 text-sm">دي نتيجتك في الجولة دي.</p>
            <div className="mt-3 text-xs text-muted-foreground">محاولة {result.attemptUsed}/3</div>
          </div>

          <CardContent className="relative p-4 space-y-4">
            <div className="flex flex-col items-center gap-4">
              <div className="relative flex flex-col items-center gap-2 animate-in zoom-in-75 fade-in duration-500">
                <div className="absolute -top-5 -right-5 text-xl animate-pulse">✨</div>
                <div className="absolute -top-3 -left-4 text-xl animate-pulse delay-150">⭐</div>
                <div className={`relative w-36 h-36 rounded-full bg-gradient-to-br from-success/30 via-background to-success/10 border border-success/30 flex items-center justify-center ${rankStyle?.glow ?? 'shadow-[0_0_22px_rgba(34,197,94,0.25)]'}`}>
                  <div className="absolute inset-2 rounded-full border-2 border-success/50 shadow-inner" />
                  <div className="absolute inset-4 rounded-full border-2 border-success/20" />
                  <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_210deg,rgba(255,255,255,0.35),transparent_40%,rgba(255,255,255,0.2))] opacity-70" />
                  <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.35),transparent_55%)]" />
                  <div className="relative z-10 flex flex-col items-center justify-center">
                    <span className="text-sm text-muted-foreground tracking-widest">النقاط</span>
                    <span className="text-4xl md:text-5xl font-black text-foreground drop-shadow-sm">{result.score}</span>
                  </div>
                </div>
                {result.rank && (
                  <div className="relative">
                    <div
                      className={`relative px-5 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-2 ${rankStyle?.badge ?? 'bg-primary text-primary-foreground border-primary/40'}`}
                    >
                      <span className="text-sm">🏅</span>
                      {result.rank}
                      <span className="absolute -right-3 top-1/2 -translate-y-1/2 h-3 w-3 rotate-45 rounded-sm bg-inherit border border-current opacity-70" />
                      <span className="absolute -left-3 top-1/2 -translate-y-1/2 h-3 w-3 -rotate-45 rounded-sm bg-inherit border border-current opacity-70" />
                    </div>
                  </div>
                )}
              </div>

              <div className="w-full max-w-md space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>نقاطك الحالية: {result.score}</span>
                  {nextThreshold ? <span>الهدف التالي: {nextThreshold}</span> : <span>أعلى مستوى</span>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {nextThreshold
                    ? `فاضلك ${pointsToNext} نقطة وتوصل للمستوى اللي بعده`
                    : 'أنت في أعلى مستوى'}
                </p>
              </div>
            </div>

            <div className="bg-muted/50 rounded-xl p-3">
              <p className="text-sm text-foreground leading-relaxed">{result.feedbackText}</p>
            </div>

            <Card className="border">
              <CardHeader className="pb-1">
                <CardTitle className="text-sm">تفاصيل النقاط</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {result.breakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground">مفيش نقاط اتحسبت في المحاولة دي.</p>
                ) : (
                  <div className="space-y-2">
                    {result.breakdown.map((item, i) => (
                      <div key={i} className="flex items-center justify-between gap-3">
                        <span className="text-sm text-foreground">{item.label}</span>
                        <span className={`text-sm font-bold ${item.points >= 0 ? 'text-success' : 'text-destructive'}`}>
                          {item.points >= 0 ? `+${item.points}` : item.points}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </CardContent>
        </Card>

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

        <Button onClick={onRestart} size="lg" className="w-full text-lg py-6 font-bold shadow-lg" variant="outline">
          العب مجدداً 🔄
        </Button>
      </div>
    </div>
  );
}
