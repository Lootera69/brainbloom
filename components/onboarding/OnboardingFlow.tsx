"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import WelcomeStep from "./steps/WelcomeStep";
import WhyStep from "./steps/WhyStep";
import AvatarStep from "./steps/AvatarStep";
import TourStep from "./steps/TourStep";
import ReadyStep from "./steps/ReadyStep";
import OnboardingBackground from "./OnboardingBackground";
import BloomProgress from "./BloomProgress";

interface OnboardingFlowProps {
  onComplete: () => void;
}

export default function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(0);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [goals, setGoals] = useState<string[]>([]);

  const totalSteps = 5;

  const goToNext = useCallback(() => {
    setStep((s) => Math.min(s + 1, totalSteps - 1));
  }, []);

  const toggleGoal = useCallback((id: string) => {
    setGoals((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  }, []);

  const handleComplete = useCallback(() => {
    localStorage.setItem("brainbloom-onboarding-complete", "true");
    if (selectedAvatar) {
      localStorage.setItem("brainbloom-selected-avatar", selectedAvatar);
    }
    if (goals.length) {
      localStorage.setItem("brainbloom-goals", JSON.stringify(goals));
    }
    onComplete();
  }, [selectedAvatar, goals, onComplete]);

  const handleSkip = useCallback(() => {
    localStorage.setItem("brainbloom-onboarding-complete", "true");
    onComplete();
  }, [onComplete]);

  const steps = [
    <WelcomeStep key="welcome" onNext={goToNext} />,
    <WhyStep key="why" selected={goals} onToggle={toggleGoal} onNext={goToNext} />,
    <AvatarStep
      key="avatar"
      selectedAvatar={selectedAvatar}
      onSelect={setSelectedAvatar}
      onNext={goToNext}
    />,
    <TourStep key="tour" onNext={goToNext} />,
    <ReadyStep
      key="ready"
      selectedAvatar={selectedAvatar}
      goals={goals}
      onComplete={handleComplete}
    />,
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <OnboardingBackground />

      {/* Growing-bloom progress */}
      <div className="absolute left-0 right-0 top-0 z-10 flex justify-center px-4 pt-5">
        <BloomProgress step={step} total={totalSteps} />
      </div>

      {/* Skip button */}
      {step < totalSteps - 1 && (
        <button
          onClick={handleSkip}
          className="absolute right-4 top-6 z-10 rounded-lg px-3 py-1.5 text-xs text-muted-foreground/40 transition-colors hover:text-muted-foreground/70"
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
          className="relative z-[1] flex-1 overflow-y-auto"
        >
          {steps[step]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
