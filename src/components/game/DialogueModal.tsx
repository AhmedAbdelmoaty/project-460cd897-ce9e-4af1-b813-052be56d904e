import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ActionId, EvidenceId } from '@/types/game';
import { mainScenario } from '@/data/scenario';

interface DialogueModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionId: ActionId | null;
  onEvidenceDiscovered: (evidenceId: EvidenceId) => void;
  discoveredEvidence: EvidenceId[];
}

export function DialogueModal({ 
  isOpen, 
  onClose, 
  actionId, 
  onEvidenceDiscovered,
  discoveredEvidence 
}: DialogueModalProps) {
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [evidenceShown, setEvidenceShown] = useState(false);

  if (!actionId) return null;

  const dialogue = mainScenario.dialogues[actionId];
  const character = dialogue.character 
    ? mainScenario.characters.find(c => c.id === dialogue.character)
    : null;
  const evidence = dialogue.evidenceId 
    ? mainScenario.evidence.find(e => e.id === dialogue.evidenceId)
    : null;

  const isLastLine = currentLineIndex >= dialogue.lines.length - 1;
  const alreadyDiscovered = evidence && discoveredEvidence.includes(evidence.id);

  const handleNext = () => {
    if (isLastLine) {
      if (dialogue.hasEvidence && evidence && !alreadyDiscovered && !evidenceShown) {
        setEvidenceShown(true);
      } else {
        handleClose();
      }
    } else {
      setCurrentLineIndex(prev => prev + 1);
    }
  };

  const handleClose = () => {
    setCurrentLineIndex(0);
    setEvidenceShown(false);
    onClose();
  };

  const handleSaveEvidence = () => {
    if (evidence) {
      onEvidenceDiscovered(evidence.id);
    }
    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {character ? (
              <>
                <span className="text-3xl">{character.avatar}</span>
                <div>
                  <div className="font-bold">{character.name}</div>
                  <Badge variant="secondary" className="text-xs">{character.role}</Badge>
                </div>
              </>
            ) : (
              <>
                <span className="text-3xl">📋</span>
                <div className="font-bold">مراجعة المستندات</div>
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!evidenceShown ? (
            <>
              {/* Dialogue bubble */}
              <div className="speech-bubble min-h-[80px]">
                <p className="text-foreground leading-relaxed">
                  {dialogue.lines[currentLineIndex]}
                </p>
              </div>

              {/* Progress dots */}
              <div className="flex justify-center gap-2">
                {dialogue.lines.map((_, idx) => (
                  <div 
                    key={idx}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      idx === currentLineIndex ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                ))}
              </div>

              {/* Next button */}
              <Button onClick={handleNext} className="w-full">
                {isLastLine ? (dialogue.hasEvidence && !alreadyDiscovered ? 'التالي' : 'إغلاق') : 'التالي'}
              </Button>
            </>
          ) : (
            <>
              {/* Evidence discovered */}
              <div className="text-center space-y-4">
                <div className="text-5xl">💡</div>
                <h3 className="text-lg font-bold text-info">اكتشفت دليلاً!</h3>
                
                <div className="card-evidence rounded-xl p-4">
                  <p className="text-foreground font-medium">
                    {evidence?.text}
                  </p>
                </div>
              </div>

              <Button onClick={handleSaveEvidence} className="w-full bg-info hover:bg-info/90">
                سجّل هذا الدليل 📝
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
