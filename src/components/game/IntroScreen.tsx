import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { mainScenario } from '@/data/scenario';

interface IntroScreenProps {
  onStartGame: () => void;
}

export function IntroScreen({ onStartGame }: IntroScreenProps) {
  const owner = mainScenario.characters.find(c => c.id === 'owner');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-secondary/30 via-background to-primary/10" dir="rtl">
      <div className="w-full max-w-2xl space-y-6">
        {/* Scene Header */}
        <div className="text-center space-y-2">
          <Badge variant="outline" className="text-sm px-4 py-1">
            🏪 {mainScenario.domain}
          </Badge>
          <h1 className="text-2xl font-bold text-foreground">{mainScenario.title}</h1>
        </div>

        {/* Owner Dialogue */}
        <Card className="shadow-xl border-2">
          <CardContent className="p-6">
            <div className="flex gap-4 items-start">
              {/* Avatar */}
              <div className="flex-shrink-0 w-20 h-20 rounded-full bg-secondary flex items-center justify-center text-4xl shadow-lg">
                {owner?.avatar}
              </div>
              
              {/* Dialogue */}
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-foreground">{owner?.name}</span>
                  <Badge variant="secondary" className="text-xs">{owner?.role}</Badge>
                </div>
                
                <div className="speech-bubble">
                  <p className="text-foreground leading-relaxed">
                    أهلاً بك يا مستشار! أنا محتاج مساعدتك...
                  </p>
                </div>
                
                <div className="speech-bubble">
                  <p className="text-foreground leading-relaxed font-medium text-destructive">
                    "{mainScenario.problem}"
                  </p>
                </div>
                
                <div className="speech-bubble">
                  <p className="text-muted-foreground">
                    ما أعرف إيش السبب! ساعدني أفهم المشكلة...
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hypotheses */}
        <Card className="shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <span>💭</span>
              الاحتمالات المطروحة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mainScenario.hypotheses.map((hypothesis, index) => (
              <div 
                key={hypothesis.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20"
              >
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>
                <p className="text-foreground">{hypothesis.text}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground text-center">
              💡 مهمتك: اجمع الأدلة، ارفض الفرضيات الخاطئة، ثم أعلن الحل الصحيح
            </p>
          </CardContent>
        </Card>

        {/* Start Button */}
        <Button 
          onClick={onStartGame} 
          size="lg" 
          className="w-full text-lg py-6 font-bold shadow-lg"
        >
          ابدأ التحقيق 🔍
        </Button>
      </div>
    </div>
  );
}
