"use client";

import "./globals.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { queryClient } from "@/lib/queryClient";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>The Book Haven</title>
        <meta
          name="description"
          content="Explore knowledge preserved forever. A renowned and classy digital library."
        />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                fontFamily: "DM Sans, system-ui, sans-serif",
                background: "#1e293b",
                color: "#f8fafc",
                borderRadius: "8px",
              },
              success: { iconTheme: { primary: "#1a5276", secondary: "#fff" } },
              error: { iconTheme: { primary: "#dc2626", secondary: "#fff" } },
            }}
          />
        </QueryClientProvider>
      </body>
    </html>
  );
}
