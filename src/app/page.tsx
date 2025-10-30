"use client";

import { gql, useQuery } from "@apollo/client";

const HEALTH = gql`
     query Health {
          health {
               name
               version
               status
          }
     }
`;

export default function Home() {
     const { data, loading, error } = useQuery(HEALTH);
     return (
          <main style={{ padding: 24 }}>
               <h1>ArbiMind</h1>
               {loading && <p>Loading...</p>}
               {error && <p style={{ color: "red" }}>Error: {error.message}</p>}
               {data && <pre>{JSON.stringify(data.health, null, 2)}</pre>}
          </main>
     );
}
