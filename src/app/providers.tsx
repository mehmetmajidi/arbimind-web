"use client";

import { ApolloProvider } from "@apollo/client";
import { apolloClient } from "@/lib/apollo";
import { ExchangeProvider } from "@/contexts/ExchangeContext";

export function Providers({ children }: { children: React.ReactNode }) {
     return (
          <ApolloProvider client={apolloClient}>
               <ExchangeProvider>{children}</ExchangeProvider>
          </ApolloProvider>
     );
}
