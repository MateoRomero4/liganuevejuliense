import type { Metadata } from "next";
import { Alata } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/navbar";
import Footer from "@/components/footer"; 
import { Suspense } from 'react'
const alata = Alata({ 
  weight: "400",
  subsets: ["latin"],
  variable: "--font-alata",
});

export const metadata: Metadata = {
  title: "Liga Nuevejuliense de Fútbol",
  description: "Tabla de posiciones, fixture y prode oficial de la Liga de Fútbol de 9 de Julio.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${alata.className} min-h-screen flex flex-col`}>
        <Suspense fallback={null}>
  <Navbar />
</Suspense>
        
        <main className="flex-grow container mx-auto px-4 py-8">
          {children}
        </main>
        
        <Footer />
      </body>
    </html>
  );
}