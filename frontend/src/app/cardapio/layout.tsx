import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cardápio | Dr. Pudim",
  description: "Veja nosso cardápio e faça seu pedido pelo WhatsApp.",
};

export default function CardapioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
