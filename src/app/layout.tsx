import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rockbot — Local Operating Team",
  description: "A model-agnostic local agent console for Dillon OS.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f7f7f5",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <span
          aria-hidden="true"
          className="direction-contract"
          data-direction-contract="Grok Bot shell topology; Protocol 54 evidence semantics; light operating console; model switch anchored at sidebar bottom"
          dangerouslySetInnerHTML={{
            __html: "<!-- DIRECTION CONTRACT: Grok Bot shell topology; Protocol 54 evidence semantics; light operating console; model switch anchored at sidebar bottom. -->",
          }}
        />
        {children}
      </body>
    </html>
  );
}
