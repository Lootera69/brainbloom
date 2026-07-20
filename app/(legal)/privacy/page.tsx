"use client";

import { LegalLayout } from "@/components/legal/LegalLayout";
import { GlassCard } from "@/components/ui/glass-card";

const sections = [
  {
    title: "I. The Scope of This Policy",
    content:
      "This Privacy Policy articulates how BrainBloom collects, processes, stores, and protects your personal information when you interact with our platform. We believe that privacy is not a concession but a fundamental right — one that demands transparency, intentionality, and rigorous stewardship. This document applies to all users of BrainBloom, irrespective of whether they access the platform as guests, registered users, or premium subscribers.",
  },
  {
    title: "II. What We Collect and Why",
    content:
      "We collect only that information which is instrumental to delivering and improving our cognitive enrichment services. This includes: (a) information you voluntarily provide — your name, email address, and avatar preference; (b) behavioural telemetry — puzzle completion rates, streak patterns, category preferences, and session duration, which help us refine the learning path; (c) technical metadata — browser type, device characteristics, and anonymised IP addresses, used solely for platform optimisation and abuse prevention. We do not collect sensitive biometric data, political or religious affiliations, or any information beyond what is demonstrably necessary for our pedagogical mission.",
  },
  {
    title: "III. The Philosophical Basis of Processing",
    content:
      "Your data is processed on the foundation of legitimate interest — the enhancement of a platform designed for intellectual cultivation — and, where required by applicable regulation, your explicit consent. We do not monetise your personal data through sale or brokerage. Our economic model rests on voluntary subscriptions and virtual goods, not on the commodification of user information. Every datum we hold is treated as a trust, not an asset.",
  },
  {
    title: "IV. Data Storage and Security Architecture",
    content:
      "Your information is stored on encrypted infrastructure provided by Firebase (Google Cloud Platform), with data centres located in compliance with applicable jurisdictional requirements. We employ industry-standard safeguards — including TLS encryption in transit, AES-256 encryption at rest, and strict access controls — to protect against unauthorised access, alteration, disclosure, or destruction. Despite our best efforts, no digital fortress is impregnable; we encourage you to exercise prudence in the information you choose to share.",
  },
  {
    title: "V. Third-Party Stewardship",
    content:
      "BrainBloom engages carefully selected third-party services to power its infrastructure: Firebase (authentication and database), imgbb (image hosting), and Google Identity Services (optional authentication). Each of these providers operates under contractual obligations that prohibit the unauthorised use or disclosure of your data. We do not permit third-party advertising networks, data brokers, or analytics firms with commercial surveillance models to operate within our ecosystem.",
  },
  {
    title: "VI. Cookies and Local Storage",
    content:
      "We use browser local storage and — minimally — functional cookies to persist your session, preferences, and progress across visits. These are strictly necessary for the platform's operation. We do not employ tracking cookies, cross-site fingerprinting, or any mechanism designed to profile you beyond the boundaries of BrainBloom. You may clear this data through your browser settings, though doing so may affect platform functionality.",
  },
  {
    title: "VII. Your Sovereignty Over Your Data",
    content:
      "You retain full and unequivocal ownership of your personal information. At any time, you may: (a) access the data we hold about you; (b) request correction of inaccuracies; (c) withdraw consent for processing where consent is the legal basis; (d) request deletion of your account and associated data, subject to legitimate retention obligations such as fraud prevention or legal compliance. To exercise any of these rights, contact us at the address provided below. We will respond within the timeframe prescribed by applicable law.",
  },
  {
    title: "VIII. Data Retention and Erasure",
    content:
      "We retain your personal information only as long as it serves the purpose for which it was collected — namely, the operation of your account and the delivery of our services. Upon account deletion, your data is purged within 90 days, except where limited retention is required by law or for the establishment, exercise, or defence of legal claims. Anonymised and aggregated data — stripped of all identifying markers — may be retained indefinitely for analytical purposes.",
  },
  {
    title: "IX. International Data Transfers",
    content:
      "As a platform accessible from across the globe, your data may be processed in jurisdictions other than your own. We ensure that any international transfer is governed by appropriate safeguards — including Standard Contractual Clauses or equivalent mechanisms — that maintain a level of data protection commensurate with the principles articulated in this policy.",
  },
  {
    title: "X. Children and Cognitive Privacy",
    content:
      "BrainBloom is not directed at individuals under the age of 13. We do not knowingly collect personal information from minors. If we become aware that a child under 13 has provided us with personal data, we will take prompt steps to delete such information. We encourage parents and guardians to participate in their children's digital lives with the same mindful engagement we encourage in all our users.",
  },
  {
    title: "XI. Amendments and Notification",
    content:
      "We may revise this Privacy Policy to reflect changes in our practices, legal requirements, or the evolving landscape of digital rights. Material changes will be communicated via the platform or through the email address associated with your account. We encourage you to review this policy periodically. The date of the most recent revision appears at the top of this document.",
  },
  {
    title: "XII. Our Dialogue",
    content:
      "Privacy is not a static legal construct — it is a living commitment, renewed with every interaction. Should you have questions, concerns, or reflections on how we handle your information, we welcome your correspondence. Write to us at the address below. We promise to respond not merely with compliance, but with comprehension.",
    contact: true,
  },
];

export default function PrivacyPage() {
  return (
    <LegalLayout>
      <GlassCard intensity="light" className="p-6 sm:p-8">
        <p className="leading-relaxed text-muted-foreground text-sm sm:text-base">
          Your trust is the foundation upon which BrainBloom is built. This
          Privacy Policy is our solemn account of how we honour that trust —
          detailing not just the mechanics of data processing, but the principles
          that guide every decision we make about your information.
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
            {section.contact && (
              <div className="mt-4 rounded-lg bg-muted/50 p-4 text-sm">
                <p className="font-medium text-foreground">Contact</p>
                <p className="mt-1 text-muted-foreground">
                  BrainBloom Privacy Stewardship
                  <br />
                  hello@brainblooms.vercel.app
                </p>
              </div>
            )}
          </div>
        </GlassCard>
      ))}

      <div className="pt-2 text-center">
        <p className="text-[11px] text-muted-foreground/40">
          BrainBloom · Your data, your dominion
        </p>
      </div>
    </LegalLayout>
  );
}
