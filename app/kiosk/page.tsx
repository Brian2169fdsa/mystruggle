import type { Metadata } from "next";
import KioskShell from "./KioskShell";

export const metadata: Metadata = {
  title: "Kiosk Sign-in - My Struggle",
  description:
    "Quick, session-scoped sign-in for shared facility devices - auto sign-out keeps your account private.",
};

export default function KioskPage() {
  return <KioskShell />;
}
