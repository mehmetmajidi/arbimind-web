interface ExchangeAccountSelectorProps {
     selectedAccountId: number | null;
}

export default function ExchangeAccountSelector({ selectedAccountId }: ExchangeAccountSelectorProps) {
     if (selectedAccountId) return null;

     return (
          <div style={{
               marginBottom: "24px",
               padding: "24px",
               backgroundColor: "rgba(234, 179, 8, 0.15)",
               border: "1px solid rgba(234, 179, 8, 0.3)",
               borderRadius: "8px",
               color: "#eab308"
          }}>
               ⚠️ Please select an exchange account from the header to view available symbols
          </div>
     );
}

