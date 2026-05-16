import React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "TaskZing Privacy Policy",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-theme-primaryText mb-8">Privacy Policy</h1>
        
        <div className="prose prose-lg max-w-none space-y-6 text-theme-primaryText">
          <section>
            <h2 className="text-2xl font-semibold text-theme-primaryText mb-4">Introduction</h2>
            <p className="text-theme-accent4">
              This Privacy Policy describes how TaskZing collects, uses, and protects your personal information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-theme-primaryText mb-4">Information We Collect</h2>
            <p className="text-theme-accent4">
              We collect information that you provide directly to us, including your name, email address, phone number, and other contact information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-theme-primaryText mb-4">How We Use Your Information</h2>
            <p className="text-theme-accent4">
              We use the information we collect to provide, maintain, and improve our services, process transactions, and communicate with you.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-theme-primaryText mb-4">Data Security</h2>
            <p className="text-theme-accent4">
              We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-theme-primaryText mb-4">Contact Us</h2>
            <p className="text-theme-accent4">
              If you have any questions about this Privacy Policy, please contact us at privacy@taskzing.com.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

