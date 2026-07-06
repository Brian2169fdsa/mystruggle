import Link from "next/link";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import PrototypeMap from "../components/PrototypeMap";
import MentorForm from "./_components/MentorForm";

export const metadata = {
  title: "Become a Mentor - My Struggle",
  description:
    "Your struggle is someone's map. If you've been through it and out the other side, you're exactly who we're looking for.",
};

const WHY_MENTOR = [
  {
    n: "01",
    title: "Lived experience is expertise",
    desc: "You don't need a degree. You need the road behind you and the willingness to walk it again beside someone else.",
  },
  {
    n: "02",
    title: "One member, one journey",
    desc: "You're matched with one member at a time. Weekly check-ins, milestone celebrations, honest conversations.",
  },
  {
    n: "03",
    title: "Trained and supported",
    desc: "Mentor training, the mentor app, and center staff behind you. You're never the only safety net.",
  },
];

const TRAINING = [
  "Position of Neutrality foundations (2 sessions)",
  "Boundaries, crisis escalation, and when to call staff",
  "Using the mentor app: check-ins, session logs, cheers",
  "Shadowing an experienced mentor for your first month",
];

export default function Mentor() {
  return (
    <>
      <Nav />

      {/* HERO */}
      <section className="relative flex min-h-[440px] items-center overflow-hidden bg-navy-deep bg-[url('/mentor-hero.png')] bg-[center_30%] bg-cover bg-no-repeat">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,37,69,.92)_0%,rgba(11,37,69,.55)_55%,rgba(11,37,69,.15)_100%)]" />
        <div className="relative mx-auto flex w-full max-w-[1200px] flex-col gap-5 px-5 py-16 lg:px-6 lg:py-20">
          <div className="text-[12px] font-bold tracking-[.12em] text-[#8FBCF0] lg:text-[13px]">
            BECOME A MENTOR
          </div>
          <h1 className="max-w-[800px] text-[clamp(36px,4.6vw,58px)]/[1.08] font-extrabold tracking-[-0.02em] text-white">
            Your struggle is someone&apos;s{" "}
            <span className="script text-[1.24em] text-[#A9B4E8]">map</span>
          </h1>
          <p className="max-w-[560px] text-[18px]/[1.6] font-medium text-white/[.88]">
            If you&apos;ve been through it and out the other side, you&apos;re
            exactly who we&apos;re looking for.
          </p>
        </div>
      </section>

      {/* WHY MENTOR - 01/02/03 */}
      <section className="bg-white">
        <div className="mx-auto max-w-[1200px] px-5 py-16 lg:px-6 lg:py-[100px]">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-7">
            {WHY_MENTOR.map((c) => (
              <div key={c.n} className="rounded-2xl bg-canvas px-6 py-8 lg:px-8 lg:py-9">
                <div className="text-[40px] font-extrabold text-[rgba(78,91,155,.25)]">
                  {c.n}
                </div>
                <div className="mt-2.5 text-[20px] font-bold text-ink-900">
                  {c.title}
                </div>
                <div className="mt-2.5 text-[15px]/[1.7] text-ink-600">
                  {c.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* APPLY */}
      <section className="bg-canvas">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-start gap-10 px-5 py-16 lg:grid-cols-[1fr_minmax(360px,620px)] lg:gap-20 lg:px-6 lg:py-[100px]">
          <div className="flex flex-col gap-5 lg:pt-5">
            <div className="text-[12px] font-bold uppercase tracking-[.12em] text-blue-primary lg:text-[13px]">
              Apply
            </div>
            <h2 className="text-[34px]/[1.12] font-extrabold tracking-[-0.02em] text-ink-900 lg:text-[44px]/[1.12]">
              Tell us about <span className="script text-[42px] lg:text-[56px]">you</span>
            </h2>
            <div className="text-[17px]/[1.75] text-ink-600">
              Applications take five minutes. A center coordinator calls you
              within a week - a real conversation, not a screening.
            </div>
            <div className="mt-2 rounded-2xl bg-white px-6 py-6 shadow-[0_1px_3px_rgba(11,37,69,.06)] lg:px-8 lg:py-7">
              <div className="text-[15px] font-bold text-ink-900">
                What mentor training covers
              </div>
              <div className="mt-3.5 flex flex-col gap-2.5 text-[14px]/[1.5] font-medium text-ink-600">
                {TRAINING.map((t) => (
                  <div key={t} className="flex items-center gap-2.5">
                    <span className="h-2 w-2 flex-none rotate-45 rounded-[2px] bg-blue-primary" />
                    {t}
                  </div>
                ))}
              </div>
            </div>
            <Link
              href="/mentor-app"
              className="mt-1.5 inline-flex items-center gap-2 text-[15px] font-bold text-blue-primary"
            >
              Preview the mentor app →
            </Link>
          </div>

          <MentorForm />
        </div>
      </section>

      <Footer />
      <PrototypeMap />
    </>
  );
}
