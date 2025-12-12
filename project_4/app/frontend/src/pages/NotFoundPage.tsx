/**
 * 404 Not Found page component.
 *
 * Displayed when user navigates to a non-existent route.
 */

import { Link } from "react-router-dom";

/**
 * Simple 404 page with link back to home.
 */
export function NotFoundPage() {
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <h2 className="text-4xl font-bold mb-4">Page Not Found</h2>
      <p className="text-muted-foreground mb-8">The page you're looking for doesn't exist.</p>
      <Link to="/" className="text-primary hover:underline">
        Return to Product Catalog
      </Link>
    </div>
  );
}
