"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import WelcomeStep from "./steps/WelcomeStep";
import WhyStep from "./steps/WhyStep";
import AvatarStep from "./steps/AvatarStep";
import TourStep from "./steps/TourStep";
import ReadyStep from "./steps/ReadyStep";

interface OnboardingFlowProps {
  onComplete: () => void;
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);

  const totalSteps = 5;

  const goToNext = useCallback(() => {
    if (step < totalSteps - 1) {
      setStep((s) => s + 1);
    }
  }, [step]);

  const handleComplete = useCallback(() => {
    localStorage.setItem("brainbloom-onboarding-complete", "true");
    if (selectedAvatar) {
      localStorage.setItem("brainbloom-selected-avatar", selectedAvatar);
    }
    onComplete();
  }, [selectedAvatar, onComplete]);

  const handleSkip = useCallback(() => {
    localStorage.setItem("brainbloom-onboarding-complete", "true");
    onComplete();
  }, [onComplete]);

  const steps = [
    <WelcomeStep key="welcome" onNext={goToNext} />,
    <WhyStep key="why" onNext={goToNext} />,
    <AvatarStep
      key="avatar"
      selectedAvatar={selectedAvatar}
      onSelect={setSelectedAvatar}
      onNext={goToNext}
    />,
    <TourStep key="tour" onNext={goToNext} />,
    <ReadyStep key="ready" selectedAvatar={selectedAvatar} onComplete={handleComplete} />,
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Progress dots */}
      <div className="absolute left-0 right-0 top-0 z-10 flex justify-center gap-1.5 px-4 pt-6">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-300 ${
              i <= step ? "bg-primary" : "bg-muted/50 dark:bg-white/10"
            } ${i === step ? "w-6" : "w-3"}`}
          />
        ))}
      </div>

      {/* Skip button */}
      {step < totalSteps - 1 && (
        <button
          onClick={handleSkip}
          className="absolute right-4 top-4 z-10 rounded-lg px-3 py-1.5 text-xs text-muted-foreground/40 transition-colors hover:text-muted-foreground/70"
        >
          Skip
        </button>
      )}

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="flex-1 overflow-y-auto"
        >
          {steps[step]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
