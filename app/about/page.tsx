import Link from "next/link";
import Nav from "../components/Nav";
import Footer from "../components/Footer";
import PrototypeMap from "../components/PrototypeMap";

export default function About() {
  return (
    <>
      <Nav />

      {/* HERO */}
      <section className="relative flex min-h-[460px] items-center overflow-hidden bg-[repeating-linear-gradient(45deg,#DFEAF9_0_14px,#D2E2F5_14px_28px)]">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,37,69,.92)_0%,rgba(11,37,69,.55)_55%,rgba(11,37,69,.2)_100%)]" />
        <span className="absolute bottom-4 right-5 rounded-md bg-navy-deep/50 px-2.5 py-1 font-mono text-[11px] font-medium text-white/75">
          photo: community center, members + mentors together
        </span>
        <div className="relative mx-auto flex w-full max-w-[1200px] flex-col gap-5 px-6 py-20">
          <div className="text-[13px] font-bold tracking-[.12em] text-[#8FBCF0]">
            ABOUT US
          </div>
          <h1 className="max-w-[820px] text-[clamp(36px,4.5vw,58px)]/[1.08] font-extrabold tracking-[-0.02em] text-white">
            Turning Struggles Into{" "}
            <span className="script text-[1.24em] text-[#A9B4E8]">
              Strengths
            </span>
            , Together
          </h1>
        </div>
      </section>

      {/* OUR JOURNEY */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-[1200px] grid-cols-[minmax(300px,440px)_1fr] gap-20 px-6 py-[110px]">
          <div>
            <div className="text-[13px] font-bold uppercase tracking-[.12em] text-blue-primary">
              Our journey
            </div>
            <h2 className="mt-4 text-[44px]/[1.12] font-extrabold tracking-[-0.02em] text-ink-900">
              You wouldn&apos;t go to a car mechanic for chest pains.
            </h2>
          </div>
          <div className="flex flex-col gap-[22px] text-[17px]/[1.75] text-ink-600">
            <p className="m-0">
              So why should someone fighting addiction, homelessness, or
              reentry take their guidance from people who have only read about
              it? My Struggle was founded in 2021 by Brian Reinhart and Wayne
              Giles on one conviction: lived experience is expertise.
            </p>
            <p className="m-0">
              Every mentor in our program has been through the struggle
              themselves. Every program we run — outreach centers, Position of
              Neutrality, QR Code Giving, transitional housing — was built by
              people who needed it once and didn&apos;t have it.
            </p>
            <p className="m-0">
              We started in Laveen, Arizona, with a folding table and a
              question:{" "}
              <em className="text-ink-900">
                &ldquo;How can I help you?&rdquo;
              </em>{" "}
              That question is still the whole model.
            </p>
          </div>
        </div>
      </section>

      {/* TRUE IMPACT STATS */}
      <section className="border-y border-sky-tint bg-canvas">
        <div className="mx-auto max-w-[1200px] px-6 py-[90px]">
          <div className="text-center text-[13px] font-bold uppercase tracking-[.12em] text-blue-primary">
            True impact
          </div>
          <div className="mt-11 grid grid-cols-4 gap-8 text-center">
            {[
              { n: "15,000+", l: "people mentored", green: false },
              {
                n: "6,000+",
                l: "families touched by generational change",
                green: false,
              },
              { n: "200+", l: "members reintegrated", green: false },
              { n: "90%", l: "program success rate", green: true },
            ].map((s) => (
              <div key={s.l}>
                <div
                  className={
                    "tnum text-[56px] font-extrabold tracking-[-0.02em] " +
                    (s.green ? "text-success" : "text-blue-primary")
                  }
                >
                  {s.n}
                </div>
                <div className="mt-2 text-[15px] font-medium text-ink-600">
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COST OF INACTION */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-[1200px] grid-cols-[1fr_minmax(300px,480px)] items-center gap-[90px] px-6 py-[110px]">
          <div className="flex flex-col gap-5">
            <div className="text-[13px] font-bold uppercase tracking-[.12em] text-blue-primary">
              The cost of inaction
            </div>
            <h2 className="m-0 text-[44px]/[1.12] font-extrabold tracking-[-0.02em] text-ink-900">
              Doing nothing costs America{" "}
              <span className="script text-[56px]">trillions</span>
            </h2>
            <div className="text-[17px]/[1.75] text-ink-600">
              Left unaddressed, homelessness, addiction, and incarceration are
              projected to cost the U.S. economy{" "}
              <strong className="text-ink-900">$10 trillion by 2030</strong>.
              Prevention through mentorship and reintegration costs a fraction
              — and returns people, not just dollars.
            </div>
            <div className="mt-2 flex flex-col gap-3">
              {[
                { c: "#2E7CD6", l: "Healthcare — 40%" },
                { c: "#4E5B9B", l: "Incarceration — 30%" },
                { c: "#8FBCF0", l: "Lost productivity — 20%" },
                { c: "#C7DBF4", l: "Other costs — 10%" },
              ].map((r) => (
                <div
                  key={r.l}
                  className="flex items-center gap-3 text-[15px] font-semibold text-ink-900"
                >
                  <span
                    className="h-3.5 w-3.5 rounded"
                    style={{ background: r.c }}
                  />
                  {r.l}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="flex h-[400px] w-[400px] items-center justify-center rounded-full bg-[conic-gradient(#2E7CD6_0_40%,#4E5B9B_40%_70%,#8FBCF0_70%_90%,#C7DBF4_90%_100%)] shadow-[0_8px_30px_rgba(11,37,69,.12)]">
              <div className="flex h-[256px] w-[256px] flex-col items-center justify-center rounded-full bg-white text-center">
                <div className="tnum text-[52px] font-extrabold tracking-[-0.02em] text-navy-deep">
                  $10T
                </div>
                <div className="mt-1 text-[14px] font-semibold text-ink-600">
                  projected cost
                  <br />
                  by 2030
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PULL QUOTE */}
      <section className="bg-navy-deep">
        <div className="mx-auto max-w-[900px] px-6 py-[100px] text-center">
          <div className="text-[36px]/[1.35] font-extrabold tracking-[-0.02em] text-white">
            &ldquo;How can I help you? Let&apos;s talk — tell me about{" "}
            <span className="script text-[46px] text-[#A9B4E8]">you</span>
            .&rdquo;
          </div>
          <div className="mt-6 text-[13px] font-bold tracking-[.12em] text-[#8FBCF0]">
            THE FIRST WORDS EVERY MEMBER HEARS
          </div>
        </div>
      </section>

      {/* STORIES OF TRANSFORMATION */}
      <section className="bg-canvas">
        <div className="mx-auto max-w-[1200px] px-6 py-[100px]">
          <div className="text-center">
            <div className="text-[13px] font-bold uppercase tracking-[.12em] text-blue-primary">
              Stories of transformation
            </div>
            <h2 className="mt-3.5 text-[44px]/[1.1] font-extrabold tracking-[-0.02em] text-ink-900">
              Real people, real{" "}
              <span className="script text-[56px]">journeys</span>
            </h2>
          </div>
          <div className="mt-14 grid grid-cols-3 gap-7">
            <Link
              href="/give"
              className="block overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(11,37,69,.06)] hover:shadow-[0_8px_24px_rgba(11,37,69,.12)]"
            >
              <div className="photo-ph flex h-[240px] items-end p-3">
                <span className="photo-cap text-[10px]">
                  photo: member portrait
                </span>
              </div>
              <div className="px-7 py-6">
                <div className="text-[18px] font-bold text-ink-900">
                  Danielle&apos;s journey
                </div>
                <div className="mt-2 text-[14px]/[1.65] text-ink-600">
                  GED, first job, transitional housing — in eight months.
                </div>
                <div className="mt-3 text-[14px] font-bold text-blue-primary">
                  Support her journey →
                </div>
              </div>
            </Link>
            {[
              {
                cap: "photo: mentor + mentee",
                title: "Marcus, mentor",
                body: "One year sober, now walking beside three members.",
              },
              {
                cap: "photo: reunion moment",
                title: "Robert, alumni",
                body: "Reached Independent with $1,400 in reentry savings.",
              },
            ].map((c) => (
              <div
                key={c.title}
                className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(11,37,69,.06)]"
              >
                <div className="photo-ph flex h-[240px] items-end p-3">
                  <span className="photo-cap text-[10px]">{c.cap}</span>
                </div>
                <div className="px-7 py-6">
                  <div className="text-[18px] font-bold text-ink-900">
                    {c.title}
                  </div>
                  <div className="mt-2 text-[14px]/[1.65] text-ink-600">
                    {c.body}
                  </div>
                  <div className="mt-3 text-[14px] font-bold text-blue-primary">
                    Read the story →
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT BAND */}
      <section className="bg-sky-tint">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-10 px-6 py-16">
          <div>
            <div className="text-[28px] font-extrabold tracking-[-0.02em] text-navy-deep">
              Come see a center for yourself.
            </div>
            <div className="mt-2 text-[15px] font-medium text-ink-600">
              6614 W Harwell Rd, Laveen AZ 85339 · 602-402-7197 ·
              info@themystruggles.com
            </div>
          </div>
          <Link
            href="/mentor"
            className="inline-flex h-[52px] flex-none items-center rounded-full bg-blue-primary px-8 text-base font-bold text-white shadow-[0_6px_16px_rgba(46,124,214,.28)] hover:bg-blue-hover"
          >
            Get in touch
          </Link>
        </div>
      </section>

      <Footer />
      <PrototypeMap />
    </>
  );
}
