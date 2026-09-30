import Link from "next/link";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";

export const metadata = {
  title: "ALAGEUM.COM",
  description: "Corporate B2B platform foundation",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>
        <AuthProvider>
          <header className="header">
            <div className="container headerInner">
              <Link href="/" className="brand">ALAGEUM.COM</Link>
              <nav className="nav">
                <Link href="/catalog">Каталог</Link>
                <Link href="/b2b">B2B кабинет</Link>
                <Link href="/ai">AI-помощник</Link>
                <Link href="/login">Войти</Link>
              </nav>
            </div>
          </header>
          <main className="container main">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}

