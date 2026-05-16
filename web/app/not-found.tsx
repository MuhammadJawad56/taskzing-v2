import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-md mx-auto text-center">
        <h1 className="text-6xl font-bold text-secondary-900 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-secondary-900 mb-4">
          Page Not Found
        </h2>
        <p className="text-secondary-600 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link href="/">
          <Button variant="primary" size="lg">
            Go Home
          </Button>
        </Link>
      </div>
    </div>
  );
}

