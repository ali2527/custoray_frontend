import type { Metadata } from "next";
import { Geist_Mono, Noto_Naskh_Arabic, Poppins } from "next/font/google";
import { RootProviders } from "@/components/root-providers";
import { ThemeProvider } from "@/components/theme/theme-provider";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoNaskh = Noto_Naskh_Arabic({
  variable: "--font-arabic",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Custoray",
  description: "Customer and Inventory Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/assets/logo-6.png" sizes="any" />
      </head>
      <body
        suppressHydrationWarning
        className={`${poppins.variable} ${geistMono.variable} ${notoNaskh.variable} font-sans antialiased`}
      >
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{sessionStorage.removeItem("custoray.accessToken");}catch(e){}try{var keep={"custoray-appearance-v1":1,"custoray-app-preferences-v1":1,"custoray-notification-prefs-v1":1};var drop=[];for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(!k||k.indexOf("custoray-")!==0)continue;if(keep[k]||k.indexOf("custoray-table-settings-v1:")===0)continue;drop.push(k);}for(var j=0;j<drop.length;j++)localStorage.removeItem(drop[j]);}catch(e){}try{var p=JSON.parse(localStorage.getItem("custoray-appearance-v1")||"null");if(!p)return;var r=document.documentElement;var hex=/^#([0-9a-fA-F]{6})$/;if(p.colorTheme==="custom"&&hex.test(p.customColor||"")){r.setAttribute("data-theme","custom");r.style.setProperty("--primary",p.customColor);r.style.setProperty("--ring",p.customColor);r.style.setProperty("--sidebar-primary",p.customColor);}else if(p.colorTheme&&p.colorTheme!=="green"){r.setAttribute("data-theme",p.colorTheme);}r.setAttribute("data-density",p.compactLayout?"compact":"comfortable");r.setAttribute("data-reduce-motion",p.reduceMotion?"true":"false");var sizes={sm:"0.875rem",base:"0.9375rem",lg:"1.125rem",xl:"1.25rem"};if(sizes[p.fontSize])r.style.setProperty("--app-font-size",sizes[p.fontSize]);var lang=p.language;var rtl=lang==="ar"||lang==="ur";if(lang==="en"||lang==="ar"||lang==="ur"){r.setAttribute("lang",lang);r.setAttribute("dir",rtl?"rtl":"ltr");}}catch(e){}})();`,
          }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <RootProviders>{children}</RootProviders>
        </ThemeProvider>
      </body>
    </html>
  );
}
