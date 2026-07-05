export interface QuestTemplate {
  id: string;
  title: string;
  description: string;
  target: number;
  reward: number;
  icon: string;
}

export const questTemplates: QuestTemplate[] = [
  {
    id: "complete-challenges",
    title: "Challenge Master",
    description: "Complete challenges",
    target: 3,
    reward: 15,
    icon: "zap",
  },
  {
    id: "earn-xp",
    title: "XP Hunter",
    description: "Earn XP",
    target: 50,
    reward: 20,
    icon: "flame",
  },
  {
    id: "streak-keeper",
    title: "Streak Keeper",
    description: "Maintain your streak",
    target: 1,
    reward: 10,
    icon: "heart",
  },
];
