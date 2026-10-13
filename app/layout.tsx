import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BlackCore CRM | Visão geral",
  description: "Painel de vendas e relacionamento BlackCore CRM.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
