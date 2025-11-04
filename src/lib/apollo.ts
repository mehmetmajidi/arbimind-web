import { ApolloClient, InMemoryCache, HttpLink, from, ApolloLink } from "@apollo/client";
import { onError } from "@apollo/client/link/error";
import { RetryLink } from "@apollo/client/link/retry";

const uri = process.env.NEXT_PUBLIC_GRAPHQL_URL ?? "http://localhost:8000/graphql";

// Error handling link
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
     if (graphQLErrors) {
          graphQLErrors.forEach(({ message, locations, path, extensions }) => {
               console.error(`[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`);

               // Handle rate limiting (429)
               if (extensions?.code === "TOO_MANY_REQUESTS" || extensions?.statusCode === 429) {
                    console.warn("Rate limit exceeded. Please wait before making more requests.");
               }
          });
     }

     if (networkError) {
          // Better error handling for network errors
          const errorMessage = networkError.message || String(networkError);

          // Don't log "Failed to fetch" if backend is not running (it's expected in dev)
          if (errorMessage.includes("Failed to fetch") || errorMessage.includes("NetworkError")) {
               console.warn("[Network error]: Cannot connect to backend API. " + "Make sure the backend is running at " + uri);
          } else {
               console.error(`[Network error]: ${errorMessage}`, networkError);
          }

          // Handle network errors gracefully
          if ("statusCode" in networkError) {
               const statusCode = networkError.statusCode;
               if (statusCode === 429) {
                    console.warn("Rate limit exceeded. Please wait before retrying.");
               } else if (statusCode === 503) {
                    console.warn("Service temporarily unavailable. Please try again later.");
               }
          }
     }
});

// Retry link with exponential backoff
const retryLink = new RetryLink({
     delay: {
          initial: 300,
          max: Infinity,
          jitter: true,
     },
     attempts: {
          max: 3,
          retryIf: (error, _operation) => {
               // Retry on network errors, but not on GraphQL errors
               if (error?.networkError) {
                    const networkError = error.networkError;
                    // Don't retry on 4xx errors (except 429)
                    if ("statusCode" in networkError) {
                         const statusCode = networkError.statusCode;
                         // Retry on 429 (rate limit) and 5xx errors
                         return statusCode === 429 || (statusCode >= 500 && statusCode < 600);
                    }
                    // Retry on connection errors
                    return true;
               }
               return false;
          },
     },
});

// HTTP link
const httpLink = new HttpLink({
     uri,
     credentials: "include", // Include credentials for CORS
     fetchOptions: {
          mode: "cors",
     },
});

export const apolloClient = new ApolloClient({
     link: from([errorLink, retryLink, httpLink]),
     cache: new InMemoryCache({
          // Cache configuration
          typePolicies: {
               Query: {
                    fields: {
                         // Cache predictions per symbol/horizon
                         predictPrice: {
                              keyArgs: ["symbol", "horizon"],
                              merge(existing, incoming) {
                                   return incoming;
                              },
                         },
                    },
               },
          },
     }),
     // Default options
     defaultOptions: {
          watchQuery: {
               errorPolicy: "all", // Return partial data even if errors
               fetchPolicy: "cache-and-network", // Use cache but also fetch
          },
          query: {
               errorPolicy: "all",
               fetchPolicy: "cache-first", // Use cache first, then network
          },
          mutate: {
               errorPolicy: "all",
          },
     },
     // Enable error tracking in development (Next.js 16+ way)
     ...(process.env.NODE_ENV === "development" && {
          devtools: { enabled: true },
     }),
});
