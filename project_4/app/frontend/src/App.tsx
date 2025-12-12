/**
 * Main application component for the Product Catalog.
 *
 * Responsibilities:
 * - Setup React Router for page navigation
 * - Define routes for list, detail, and 404 pages
 * - Provide theme context to all pages
 * - Render header and footer consistently across routes
 */

import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { ProductDetailPage } from "@/pages/ProductDetailPage";
import { ProductListPage } from "@/pages/ProductListPage";
import { ThemeProvider } from "@/lib/theme-provider";
import "./index.css";

/**
 * Main App component with routing and theme support.
 *
 * Routes:
 * - "/" - Product list page (with filters, favorites, pagination, stock)
 * - "/products/:productId" - Product detail page
 * - "*" - 404 Not Found page
 */
export function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-background">
          {/* Header section */}
          <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="container mx-auto px-4 py-6">
              <div className="flex items-center justify-between">
                <Link to="/" className="hover:opacity-80 transition-opacity">
                  <h1 className="text-3xl font-bold">Product Catalog</h1>
                </Link>
                <ThemeToggle />
              </div>
            </div>
          </header>

          {/* Main content area - routes render here */}
          <main>
            <Routes>
              <Route path="/" element={<ProductListPage />} />
              <Route path="/products/:productId" element={<ProductDetailPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>

          {/* Footer */}
          <footer className="border-t mt-12 py-6">
            <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
              <p>Product Catalog API - Module 1 Exercise</p>
            </div>
          </footer>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
