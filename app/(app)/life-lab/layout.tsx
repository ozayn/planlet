import { LifeLabToastProvider } from "@/components/life-lab/life-lab-toast";

export default function LifeLabLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <LifeLabToastProvider>{children}</LifeLabToastProvider>;
}
