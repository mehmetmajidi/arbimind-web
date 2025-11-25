import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import LayoutWrapper from "../components/LayoutWrapper";

// Using system fonts defined in globals.css to avoid network issues during Docker build
// Fonts are already configured in globals.css (Arial, Helvetica, sans-serif)

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
               <body>
                    <Providers>
                         <LayoutWrapper>{children}</LayoutWrapper>
                    </Providers>
               </body>
          </html>
     );
}
