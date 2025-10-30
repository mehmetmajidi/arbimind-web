import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ApolloProvider } from "@apollo/client";
import { apolloClient } from "@/lib/apollo";

const geistSans = Geist({
     variable: "--font-geist-sans",
     subsets: ["latin"],
});

const geistMono = Geist_Mono({
     variable: "--font-geist-mono",
     subsets: ["latin"],
});

export const metadata: Metadata = {
     title: "ArbiMind",
     description: "Crypto price predictions",
};

export default function RootLayout({
     children,
}: Readonly<{
     children: React.ReactNode;
}>) {
     return (
          <html lang="en">
               <body className={`${geistSans.variable} ${geistMono.variable}`}>
                    <ApolloProvider client={apolloClient}>{children}</ApolloProvider>
               </body>
          </html>
     );
}
