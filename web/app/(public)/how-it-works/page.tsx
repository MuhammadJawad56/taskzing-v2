import React from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { CheckCircle } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How It Works",
  description: "Learn how TaskZing works for both clients and professionals",
};

export default function HowItWorksPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-secondary-900 mb-4">How It Works</h1>
          <p className="text-xl text-secondary-600">
            Simple steps to get your tasks done or start offering your services
          </p>
        </div>

        {/* For Clients */}
        <div className="mb-16">
          <h2 className="text-3xl font-semibold text-secondary-900 mb-8 text-center">
            For Clients
          </h2>
          <p className="mb-6 text-center text-sm text-secondary-700">
            Need the legal details?{" "}
            <a
              href="/client-agreement-taskzing.pdf"
              download="TaskZing-Client-Agreement-Form.pdf"
              className="font-semibold text-primary-600 underline underline-offset-2 transition-colors hover:text-primary-700"
            >
              Download Client Agreement
            </a>
            .
          </p>
          <div className="space-y-6">
            {[
              {
                step: 1,
                title: "Post a Task",
                description:
                  "Describe what you need done, set your budget, and specify any requirements. Our platform makes it easy to create detailed task listings.",
              },
              {
                step: 2,
                title: "Receive Proposals",
                description:
                  "Qualified professionals will submit proposals with their rates and timelines. Review their profiles, ratings, and past work.",
              },
              {
                step: 3,
                title: "Choose a Professional",
                description:
                  "Select the best match for your needs. You can message professionals before making a decision to ensure they're the right fit.",
              },
              {
                step: 4,
                title: "Get It Done",
                description:
                  "Work with your chosen professional. Track progress, communicate easily, and make secure payments through our platform.",
              },
              {
                step: 5,
                title: "Review & Pay",
                description:
                  "Once the task is completed to your satisfaction, leave a review and release payment. Help others by sharing your experience.",
              },
            ].map((item) => (
              <Card key={item.step}>
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-xl font-bold text-primary-600">{item.step}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-secondary-900 mb-2">
                        {item.title}
                      </h3>
                      <p className="text-secondary-700">{item.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* For Professionals */}
        <div>
          <h2 className="text-3xl font-semibold text-secondary-900 mb-8 text-center">
            For Professionals
          </h2>
          <p className="mb-6 text-center text-sm text-secondary-700">
            Need the legal details?{" "}
            <a
              href="/service-provider-agreement-taskzing.pdf"
              download="TaskZing-Service-Provider-Agreement-Form.pdf"
              className="font-semibold text-primary-600 underline underline-offset-2 transition-colors hover:text-primary-700"
            >
              Download Service Provider Form
            </a>
            .
          </p>
          <div className="space-y-6">
            {[
              {
                step: 1,
                title: "Create Your Profile",
                description:
                  "Sign up as a provider and create a compelling profile. Add your skills, portfolio, and set your rates.",
              },
              {
                step: 2,
                title: "Browse Tasks",
                description:
                  "Explore available tasks in your area of expertise. Use filters to find opportunities that match your skills.",
              },
              {
                step: 3,
                title: "Submit Proposals",
                description:
                  "Submit detailed proposals for tasks you're interested in. Explain why you're the best fit and provide your quote.",
              },
              {
                step: 4,
                title: "Get Hired",
                description:
                  "When a client chooses you, communicate clearly, deliver quality work, and meet deadlines.",
              },
              {
                step: 5,
                title: "Get Paid & Build Reputation",
                description:
                  "Receive secure payments and build your reputation through positive reviews. More reviews mean more opportunities.",
              },
            ].map((item) => (
              <Card key={item.step}>
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-xl font-bold text-primary-600">{item.step}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-secondary-900 mb-2">
                        {item.title}
                      </h3>
                      <p className="text-secondary-700">{item.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Benefits */}
        <Card className="mt-12">
          <CardContent className="p-8">
            <h2 className="text-2xl font-semibold text-secondary-900 mb-6 text-center">
              Why Choose TaskZing?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                "Quick & Easy Hiring",
                "Easy communication",
                "Flexible Scheduling",
                "Fair pricing",
                "No middle man involved",
                "User-Friendly App",
              ].map((benefit) => (
                <div key={benefit} className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-primary-600 flex-shrink-0" />
                  <span className="text-secondary-700">{benefit}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

