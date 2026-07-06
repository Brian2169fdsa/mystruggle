import type { Metadata } from "next";
import PrototypeMap from "../components/PrototypeMap";
import MemberApp from "./_components/MemberApp";

export const metadata: Metadata = {
  title: "Member App - My Struggle",
  description:
    "The My Struggle member portal - tracker, courses, community, giving, and The Guide.",
};

export default function MemberAppPage() {
  return (
    <>
      <MemberApp />
      <PrototypeMap />
    </>
  );
}
