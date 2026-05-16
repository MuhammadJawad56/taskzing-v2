import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "TaskZing Terms and Conditions",
};

export default function TermsConditionsPage() {
  const termsSections = [
    {
      title: "1. Acceptance of Terms",
      content:
        "By signing up on TaskZing, you agree to comply with and be legally bound by these Terms of Service, our Privacy Policy, and any other applicable rules or policies. These terms constitute a legally binding agreement between you and TaskZing Inc., a Canadian corporation operating in compliance with both Canadian and United States laws and regulations.",
    },
    {
      title: "2. Eligibility",
      content:
        "You must be at least 18 years old to use TaskZing (or the age of majority in your jurisdiction). By signing up, you confirm that all the information provided is accurate and complete. You must be legally capable of entering into binding contracts under applicable Canadian and U.S. laws. Users must be residents of Canada or the United States to use our services.",
    },
    {
      title: "3. Account Security",
      content:
        "You are responsible for maintaining the confidentiality of your account credentials and are fully responsible for all activities that occur under your account. You must immediately notify TaskZing of any unauthorized use of your account.",
    },
    {
      title: "4. Compliance with Laws",
      content:
        "All users agree to comply with applicable local, provincial/state, and federal laws in Canada and the United States. This includes but is not limited to employment laws, tax obligations, business licensing requirements, consumer protection laws, privacy laws (PIPEDA in Canada, CCPA/state privacy laws in the U.S.), anti-discrimination laws, and workplace safety regulations. Users are responsible for understanding and complying with all applicable laws in their jurisdiction.",
    },
    {
      title: "5. Prohibited Conduct",
      content:
        "Users are prohibited from using false identities or misleading information, transmitting viruses or malicious code, attempting to gain unauthorized access to the platform, abusing or harassing other users, and violating any applicable laws or regulations.",
    },
    {
      title: "6. Limitation of Liability",
      content:
        "TaskZing is a marketplace platform and does not employ, guarantee, or warrant the quality of services rendered by providers. We are not liable for direct or indirect damages from use of the app, except as required by Canadian consumer protection laws (Competition Act) and applicable U.S. state consumer protection laws.",
    },
    {
      title: "7. Account Termination",
      content:
        "We reserve the right to suspend or terminate any account at our discretion for violations of these terms or conduct harmful to the platform or other users. Termination procedures comply with Canadian consumer protection requirements (Competition Act) and applicable U.S. state consumer protection laws.",
    },
    {
      title: "8. Modifications",
      content:
        "We may update these Terms & Conditions at any time. Continued use of the app after updates constitutes acceptance of the revised terms. Users will be notified of significant changes in accordance with applicable Canadian and U.S. consumer protection laws.",
    },
    {
      title: "9. Governing Law",
      content:
        "These Terms are governed by the laws of Canada and the United States, including applicable provincial/state laws where the user resides. Any disputes will be resolved in accordance with applicable legal procedures in both countries.",
    },
    {
      title: "10. Dispute Resolution",
      content:
        "TaskZing provides limited mediation support in case of disputes but does not guarantee resolution. Users are encouraged to resolve issues directly with providers when possible. Formal disputes may be subject to applicable arbitration or court procedures.",
    },
  ];

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="mb-2 text-4xl font-bold text-theme-primaryText dark:text-white">
          Terms & Conditions
        </h1>
        <p className="mb-8 text-sm text-theme-accent4 dark:text-white/80">
          Last Updated: December 2024
        </p>

        <div className="max-w-none space-y-8">
          <p className="text-base font-medium leading-7 text-theme-primaryText dark:text-white">
            Welcome to TaskZing. These Terms and Conditions govern your access to and use of the
            TaskZing platform. By accessing or using TaskZing, you agree to be bound by these
            terms.
          </p>

          {termsSections.map((section) => (
            <section key={section.title} className="space-y-3">
              <h2 className="text-2xl font-semibold text-theme-primaryText dark:text-white">
                {section.title}
              </h2>
              <p className="text-base leading-7 text-theme-accent4 dark:text-white/85">
                {section.content}
              </p>
            </section>
          ))}

          <section className="space-y-3">
            <h2 className="text-2xl font-semibold text-theme-primaryText dark:text-white">
              Contact Us
            </h2>
            <p className="text-base leading-7 text-theme-accent4 dark:text-white/85">
              If you have any questions about these Terms and Conditions, please contact us at{" "}
              <a
                href="mailto:support@taskzing.com"
                className="font-semibold text-theme-primaryText underline dark:text-white"
              >
                support@taskzing.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

