import React from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple, transparent pricing for clients and professionals",
};

export default function PricingPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-secondary-900 mb-4">Pricing</h1>
          <p className="text-xl text-secondary-600">
            Simple, transparent pricing for everyone
          </p>
        </div>

        {/* For Clients */}
        <div className="mb-16">
          <h2 className="text-3xl font-semibold text-secondary-900 mb-8 text-center">
            For Clients
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Free Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-secondary-900">$0</span>
                  <span className="text-secondary-600">/month</span>
                </div>
                <ul className="space-y-3 mb-6">
                  {[
                    "Post unlimited tasks",
                    "Browse professionals",
                    "Receive proposals",
                    "Basic support",
                  ].map((feature) => (
                    <li key={feature} className="flex items-center">
                      <Check className="h-5 w-5 text-primary-600 mr-2" />
                      <span className="text-secondary-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/signup">
                  <Button variant="primary" className="w-full">
                    Get Started
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary-600">
              <CardHeader>
                <CardTitle>Premium Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-secondary-900">$9.99</span>
                  <span className="text-secondary-600">/month</span>
                </div>
                <ul className="space-y-3 mb-6">
                  {[
                    "Everything in Free",
                    "Priority support",
                    "Featured task listings",
                    "Advanced search filters",
                    "Analytics dashboard",
                  ].map((feature) => (
                    <li key={feature} className="flex items-center">
                      <Check className="h-5 w-5 text-primary-600 mr-2" />
                      <span className="text-secondary-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/signup">
                  <Button variant="primary" className="w-full">
                    Upgrade to Premium
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* For Professionals */}
        <div>
          <h2 className="text-3xl font-semibold text-secondary-900 mb-8 text-center">
            For Professionals
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Starter</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-secondary-900">5%</span>
                  <span className="text-secondary-600"> commission</span>
                </div>
                <ul className="space-y-3 mb-6">
                  {[
                    "Submit proposals",
                    "Basic profile",
                    "Standard support",
                  ].map((feature) => (
                    <li key={feature} className="flex items-center">
                      <Check className="h-5 w-5 text-primary-600 mr-2" />
                      <span className="text-secondary-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/signup?role=provider">
                  <Button variant="outline" className="w-full">
                    Get Started
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-2 border-primary-600">
              <CardHeader>
                <CardTitle>Professional</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-secondary-900">3%</span>
                  <span className="text-secondary-600"> commission</span>
                </div>
                <ul className="space-y-3 mb-6">
                  {[
                    "Everything in Starter",
                    "Featured profile",
                    "Priority in search",
                    "Advanced analytics",
                    "Priority support",
                  ].map((feature) => (
                    <li key={feature} className="flex items-center">
                      <Check className="h-5 w-5 text-primary-600 mr-2" />
                      <span className="text-secondary-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/signup?role=provider">
                  <Button variant="primary" className="w-full">
                    Upgrade
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Enterprise</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-secondary-900">Custom</span>
                </div>
                <ul className="space-y-3 mb-6">
                  {[
                    "Everything in Professional",
                    "Dedicated account manager",
                    "Custom integrations",
                    "White-label options",
                    "Volume discounts",
                  ].map((feature) => (
                    <li key={feature} className="flex items-center">
                      <Check className="h-5 w-5 text-primary-600 mr-2" />
                      <span className="text-secondary-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/contact">
                  <Button variant="outline" className="w-full">
                    Contact Sales
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* FAQ */}
        <Card className="mt-12">
          <CardContent className="p-8">
            <h2 className="text-2xl font-semibold text-secondary-900 mb-6 text-center">
              Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-secondary-900 mb-2">
                  How does payment work?
                </h3>
                <p className="text-secondary-600">
                  Payments are processed securely through our platform. Funds are held in escrow
                  until the task is completed to your satisfaction.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-secondary-900 mb-2">
                  Can I change my plan?
                </h3>
                <p className="text-secondary-600">
                  Yes, you can upgrade or downgrade your plan at any time. Changes take effect
                  immediately.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-secondary-900 mb-2">
                  Are there any hidden fees?
                </h3>
                <p className="text-secondary-600">
                  No, our pricing is transparent. The only fees are the commission for
                  professionals and optional premium plans for clients.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

