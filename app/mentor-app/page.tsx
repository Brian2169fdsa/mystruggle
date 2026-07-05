import PrototypeMap from "../components/PrototypeMap";
import MentorApp from "./_components/MentorApp";

export const metadata = {
  title: "Mentor App — My Struggle",
};

export default function MentorAppPage() {
  return (
    <>
      <MentorApp />
      <PrototypeMap />
    </>
  );
}
