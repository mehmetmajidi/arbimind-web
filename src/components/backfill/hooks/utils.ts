import { getApiV1Base } from "@/lib/apiBaseUrl";
export const API_URL = getApiV1Base();

export const getAuthToken = () => {
     return localStorage.getItem("auth_token") || "";
};

export const calculatePages = (interval: string, years: number = 2) => {
     const candlesPerYear: Record<string, number> = {
          "1m": 525600,
          "5m": 105120,
          "15m": 35040,
          "30m": 17520,
          "1h": 8760,
          "4h": 2190,
          "1d": 365,
     };
     const totalCandles = (candlesPerYear[interval] || 8760) * years;
     return Math.ceil(totalCandles / 1000);
};

export const getStatusColor = (status: string) => {
     switch (status) {
          case "running":
               return "bg-green-500/20 text-green-400 border-green-500/30";
          case "paused":
               return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
          case "completed":
               return "bg-blue-500/20 text-blue-400 border-blue-500/30";
          case "failed":
               return "bg-red-500/20 text-red-400 border-red-500/30";
          default:
               return "bg-gray-500/20 text-gray-400 border-gray-500/30";
     }
};

export const calculateProgress = (currentPage: number, totalPages: number) => {
     if (totalPages === 0) return 0;
     return (currentPage / totalPages) * 100;
};

