import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Shield, Users, ArrowRight, ArrowLeft, Sparkles, Check } from "lucide-react";

const ONBOARDING_KEY = "disbunk_onboarding_complete";

export function useOnboarding() {
  const isComplete = localStorage.getItem(ONBOARDING_KEY) === "true";
  const markComplete = () => localStorage.setItem(ONBOARDING_KEY, "true");
  return { isComplete, markComplete };
}

interface OnboardingModalProps {
  open: boolean;
  onComplete: () => void;
}

const stepIcons = [FileText, Shield, Users];
const stepColors = [
  "bg-primary/10 text-primary",
  "bg-success/10 text-success",
  "bg-warning/10 text-warning",
];

export function OnboardingModal({ open, onComplete }: OnboardingModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const steps = [
    {
      titleKey: "onboarding.step1Title",
      descKey: "onboarding.step1Desc",
      action: () => navigate("/claims/new"),
    },
    {
      titleKey: "onboarding.step2Title",
      descKey: "onboarding.step2Desc",
      action: () => navigate("/evidence"),
    },
    {
      titleKey: "onboarding.step3Title",
      descKey: "onboarding.step3Desc",
      action: () => navigate("/teams"),
    },
  ];

  const handleSkip = () => {
    onComplete();
  };

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const Icon = stepIcons[step];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleSkip()}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        {/* Header banner */}
        {step === 0 && (
          <div className="bg-primary/5 border-b border-border px-6 pt-8 pb-6 text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold tracking-tight">
                {t("onboarding.welcome")}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground mt-1">
                {t("onboarding.welcomeDesc")}
              </DialogDescription>
            </DialogHeader>
          </div>
        )}

        {/* Step content */}
        <div className="px-6 py-6">
          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === step
                    ? "w-8 bg-primary"
                    : i < step
                    ? "w-2 bg-primary/40"
                    : "w-2 bg-border"
                }`}
              />
            ))}
          </div>

          {/* Step card */}
          <div className="text-center space-y-4 animate-fade-in" key={step}>
            <div className={`inline-flex h-16 w-16 items-center justify-center rounded-2xl ${stepColors[step]}`}>
              <Icon className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-foreground tracking-tight">
                <span className="font-mono text-xs text-muted-foreground mr-2">
                  {String(step + 1).padStart(2, "0")}
                </span>
                {t(steps[step].titleKey)}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
                {t(steps[step].descKey)}
              </p>
            </div>

            {/* Checklist of what this step enables */}
            <div className="pt-2">
              {step === 0 && (
                <StepChecklist items={[
                  "Report suspicious claims with context",
                  "Track claim status from pending to verified",
                  "Demo claim pre-filled for your first try",
                ]} />
              )}
              {step === 1 && (
                <StepChecklist items={[
                  "Upload screenshots, documents, and links",
                  "Tag evidence by type for easy filtering",
                  "Build a shared evidence vault with your team",
                ]} />
              )}
              {step === 2 && (
                <StepChecklist items={[
                  "Coordinate investigations in real-time",
                  "Assign claims to team members",
                  "Track team performance and impact",
                ]} />
              )}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="border-t border-border px-6 py-4 flex items-center justify-between bg-muted/30">
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={handleSkip}>
            {t("onboarding.skip")}
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" size="sm" onClick={handleBack} className="gap-1">
                <ArrowLeft className="h-3.5 w-3.5" />
                {t("onboarding.previous")}
              </Button>
            )}
            <Button size="sm" onClick={handleNext} className="gap-1">
              {step === steps.length - 1 ? (
                <>
                  {t("onboarding.finish")}
                  <Sparkles className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  {t("onboarding.next")}
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function StepChecklist({ items }: { items: string[] }) {
  return (
    <div className="space-y-2 text-left max-w-xs mx-auto">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2.5">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/10 mt-0.5">
            <Check className="h-3 w-3 text-success" />
          </div>
          <span className="text-xs text-muted-foreground leading-relaxed">{item}</span>
        </div>
      ))}
    </div>
  );
}
