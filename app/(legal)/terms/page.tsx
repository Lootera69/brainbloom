"use client";

import { LegalLayout } from "@/components/legal/LegalLayout";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";

const sections = [
  {
    title: "I. Our Covenant with You",
    content:
      "By accessing or interacting with the BrainBloom platform, you enter into a reciprocal agreement rooted in mutual respect and intellectual integrity. These Terms constitute the entire and exclusive understanding between you and BrainBloom, superseding any prior agreements or contemporaneous communications. If you dissent from any provision herein, your sole recourse is to refrain from using the platform. Continued engagement signifies informed and unequivocal acceptance.",
  },
  {
    title: "II. The Nature of Our Offering",
    content:
      "BrainBloom provides a curated ecosystem of cognitive enrichment — puzzles, riddles, ciphers, wonders, and pedagogical content — designed to cultivate disciplined thinking and intellectual curiosity. Our platform is offered as an instrument of personal growth, not as a diagnostic tool, therapeutic intervention, or substitute for professional judgment. We make no claim, explicit or implied, regarding the transferability of cognitive gains to domains beyond the platform's scope.",
  },
  {
    title: "III. Account Stewardship",
    content:
      "You bear sole and indivisible responsibility for the confidentiality of your credentials and for all activity conducted under your account. Should you detect unauthorised access, a breach of cryptographic integrity, or any anomalous behaviour, you must notify us forthwith. BrainBloom shall not be liable for any loss or damage arising from your failure to safeguard your authentication credentials. Accounts determined to be fraudulent, impersonated, or created through automated means are subject to immediate revocation.",
  },
  {
    title: "IV. Intellectual Sovereignty",
    content:
      "All content within the BrainBloom platform — including puzzles, text, graphics, algorithms, audio-visual material, and the distinctive arrangement thereof — constitutes intellectual property protected by copyright, trademark, and applicable international treaties. You are granted a limited, non-exclusive, non-transferable, revocable licence to access and use this content solely for personal, non-commercial enrichment. No part of the platform may be reproduced, distributed, modified, or exploited for commercial purposes without our explicit written consent. User-generated submissions, including puzzle creations, grant BrainBloom a perpetual, royalty-free licence to host, display, and distribute such content within the platform.",
  },
  {
    title: "V. The Compass of Conduct",
    content:
      "We hold our community to a standard of reasoned discourse and ethical engagement. You agree to refrain from: (a) deploying any automated mechanism — bots, scrapers, scripts, or analogous agents — to interact with the platform; (b) disrupting the functional integrity of our services through denial-of-force attacks, injection, or reverse engineering; (c) submitting content that is unlawful, deceptive, harassing, or that infringes upon the rights of any third party; (d) exploiting the platform for any purpose that contravenes applicable law or these Terms. Violation of these precepts may result in account suspension, content removal, or legal recourse.",
  },
  {
    title: "VI. Economic Architecture",
    content:
      "BrainBloom operates on a freemium model. Core features are accessible without charge; premium tiers, virtual currencies (gems, hearts, streak freezes), and subscription-based offerings are subject to separate pricing terms as displayed within the platform. All purchases are final and non-refundable except where mandated by applicable consumer protection law. We reserve the right to modify pricing structures, product offerings, or the allocation of virtual goods upon reasonable notice. Virtual goods hold no monetary value and are not redeemable for currency.",
  },
  {
    title: "VII. Limitation of Liability",
    content:
      "To the fullest extent permitted by law, BrainBloom, its affiliates, directors, and contributors shall not be liable for any indirect, incidental, special, consequential, or punitive damages — including but not limited to loss of data, cognitive benefit, opportunity, or goodwill — arising from your use of or inability to use the platform. Our aggregate liability shall not exceed the total amount paid by you to BrainBloom in the twelve months preceding the claim. This limitation does not apply to liability for gross negligence, fraud, or death or personal injury caused by our negligence where such limitation is prohibited.",
  },
  {
    title: "VIII. Disclaimer of Warranties",
    content:
      "The BrainBloom platform is provided on an 'as is' and 'as available' basis, without warranties of any kind, whether express, implied, or statutory. We expressly disclaim all implied warranties of merchantability, fitness for a particular purpose, title, and non-infringement. We do not warrant that the platform will be uninterrupted, error-free, secure, or that identified defects will be corrected. Some jurisdictions do not allow the exclusion of implied warranties, so this exclusion may not apply to you in its entirety.",
  },
  {
    title: "IX. Termination and Suspension",
    content:
      "Either party may terminate this agreement at any time. You may cease using the platform at your discretion. BrainBloom reserves the right to suspend or terminate your access — without prior notice — for conduct that we, in our sole judgment, deem to violate the spirit or letter of these Terms, or that exposes the platform or its community to risk. Upon termination, your licence to access the platform ceases immediately, though provisions relating to intellectual property, liability, and dispute resolution shall survive.",
  },
  {
    title: "X. Dispute Resolution and Governing Law",
    content:
      "These Terms shall be governed by and construed in accordance with the laws of the Republic of India. Any dispute arising out of or relating to these Terms or your use of BrainBloom shall first be submitted to good-faith negotiation. Should resolution prove elusive, the dispute shall be referred to binding arbitration in accordance with the Arbitration and Conciliation Act, 1996. The seat of arbitration shall be New Delhi. Each party bears its own costs unless the arbitrator determines otherwise. You agree that any cause of action must be commenced within one year of its accrual.",
  },
  {
    title: "XI. Amendments and Notice",
    content:
      "We reserve the right to revise these Terms at any time. Material changes will be communicated through the platform or via the email address associated with your account. Your continued use of BrainBloom after the effective date of revised Terms constitutes acceptance of those changes. It is your responsibility to review these Terms periodically. The date of the most recent revision appears at the top of this document.",
  },
  {
    title: "XII. A Final Reflection",
    content:
      "These Terms are not merely a legal instrument — they are an ethical framework designed to preserve the integrity of a space dedicated to intellectual cultivation. We invite you to engage with BrainBloom not as a consumer of content, but as a participant in a shared endeavour of cognitive discovery. The mind is a landscape; we merely provide the map. The journey remains yours.",
  },
];

export default function TermsPage() {
  return (
    <LegalLayout>
      <GlassCard intensity="light" className="p-6 sm:p-8">
        <p className="leading-relaxed text-muted-foreground text-sm sm:text-base">
          Welcome to BrainBloom. These Terms of Service constitute a binding
          agreement between you — the seeker of knowledge — and BrainBloom. They
          are crafted with care to honour both your autonomy and the integrity of
          our shared intellectual space. Please read them with the same attention
          you would bring to any meaningful covenant.
        </p>
      </GlassCard>

      {sections.map((section, i) => (
        <GlassCard
          key={i}
          intensity="light"
          className="p-6 sm:p-8 transition-all hover:shadow-md"
        >
          <h2 className="mb-4 text-base font-bold text-foreground sm:text-lg">
            <span className="mr-2 text-primary">{section.title}</span>
          </h2>
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground sm:text-base sm:leading-relaxed">
            <p>{section.content}</p>
          </div>
        </GlassCard>
      ))}

      <div className="pt-2 text-center">
        <p className="text-[11px] text-muted-foreground/40">
          BrainBloom · A sanctuary for the curious mind
        </p>
      </div>
    </LegalLayout>
  );
}
