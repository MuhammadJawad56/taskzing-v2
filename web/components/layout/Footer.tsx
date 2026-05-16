import React from "react";
import Link from "next/link";
import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react";

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-darkBlue-013 text-theme-secondaryText">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="text-xl font-bold mb-4 text-theme-secondaryText">TaskZing</h3>
            <p className="text-theme-accent4 text-sm mb-4">
              Connect with skilled professionals for all your task needs. Quality service, every time.
            </p>
            <div className="flex space-x-4">
              <a
                href="#"
                className="border-0 text-theme-accent4 transition-colors hover:text-theme-secondaryText"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="border-0 text-theme-accent4 transition-colors hover:text-theme-secondaryText"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="https://www.instagram.com/taskzing.official?igsh=MXQ4cjBpMmZzOGU0aA=="
                target="_blank"
                rel="noopener noreferrer"
                className="border-0 text-theme-accent4 transition-colors hover:text-theme-secondaryText"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="#"
                className="border-0 text-theme-accent4 transition-colors hover:text-theme-secondaryText"
                aria-label="LinkedIn"
              >
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4 text-theme-secondaryText">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/categories" className="text-theme-accent4 hover:text-theme-secondaryText transition-colors">
                  Browse Categories
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="text-theme-accent4 hover:text-theme-secondaryText transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-theme-accent4 hover:text-theme-secondaryText transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-theme-accent4 hover:text-theme-secondaryText transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-theme-accent4 hover:text-theme-secondaryText transition-colors">
                  Blog
                </Link>
              </li>
            </ul>
          </div>

          {/* For Providers */}
          <div>
            <h4 className="font-semibold mb-4 text-theme-secondaryText">For Providers</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/signup?role=provider" className="text-theme-accent4 hover:text-theme-secondaryText transition-colors">
                  Become a Provider
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-theme-accent4 hover:text-theme-secondaryText transition-colors">
                  Provider Pricing
                </Link>
              </li>
              <li>
                <a href="#" className="text-theme-accent4 hover:text-theme-secondaryText transition-colors">
                  Success Stories
                </a>
              </li>
              <li>
                <a href="#" className="text-theme-accent4 hover:text-theme-secondaryText transition-colors">
                  Provider Resources
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold mb-4 text-theme-secondaryText">Support</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="text-theme-accent4 hover:text-theme-secondaryText transition-colors">
                  Help Center
                </a>
              </li>
              <li>
                <a href="#" className="text-theme-accent4 hover:text-theme-secondaryText transition-colors">
                  Contact Us
                </a>
              </li>
              <li>
                <a href="#" className="text-theme-accent4 hover:text-theme-secondaryText transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className="text-theme-accent4 hover:text-theme-secondaryText transition-colors">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-theme-accent2">
          <p className="text-center text-sm text-theme-accent4">
            © {currentYear} TaskZing. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

