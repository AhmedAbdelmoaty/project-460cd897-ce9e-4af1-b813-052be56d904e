import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface WelcomeScreenProps {
  onStart: () => void;
}

export function WelcomeScreen({ onStart }: WelcomeScreenProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-accent/10" dir="rtl">
      <Card className="w-full max-w-lg text-center shadow-2xl border-2">
        <CardContent className="p-8 space-y-8">
          {/* Logo/Title */}
          <div className="space-y-4">
            <div className="text-7xl mb-4">🔍</div>
            <h1 className="text-4xl font-bold text-primary">المُحلّل</h1>
            <p className="text-lg text-muted-foreground">
              لعبة محاكاة التفكير بالأدلة
            </p>
          </div>

          {/* Description */}
          <div className="bg-muted/50 rounded-xl p-4 space-y-2">
            <p className="text-foreground leading-relaxed">
              أنت مستشار أعمال متخصص في حل المشاكل.
            </p>
            <p className="text-muted-foreground text-sm">
              صاحب المتجر طلب مساعدتك لمعرفة سبب هبوط المبيعات.
            </p>
          </div>

          {/* Rules hint */}
          <div className="text-sm text-muted-foreground space-y-1">
            <p>🎯 اجمع الأدلة من الشخصيات</p>
            <p>❌ ارفض الفرضيات الخاطئة بالدليل</p>
            <p>✅ أعلن الحل الصحيح</p>
          </div>

          {/* Start Button */}
          <Button 
            onClick={onStart} 
            size="lg" 
            className="w-full text-lg py-6 font-bold shadow-lg hover:shadow-xl transition-all"
          >
            ابدأ المهمة 🚀
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
