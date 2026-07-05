"use client";

import { useState } from "react";
import { LayoutGrid, Users, Heart, Flag, BarChart3 } from "lucide-react";
import PrototypeMap from "../components/PrototypeMap";
import Overview from "./_components/Overview";
import Participants from "./_components/Participants";
import ParticipantDetail from "./_components/ParticipantDetail";
import GivingDesk from "./_components/GivingDesk";
import Moderation from "./_components/Moderation";
import Reports from "./_components/Reports";
import type { GivingStep, ModStatus, Section, Verdict } from "./_components/types";

const WORDMARK_WHITE =
  "https://lirp.cdn-website.com/9777191e/dms3rep/multi/opt/Untitled+design+%2843%29-1920w.png";

const NAV = [
  { key: "overview", label: "Overview", Icon: LayoutGrid },
  { key: "participants", label: "Participants", Icon: Users },
  { key: "giving", label: "Giving desk", Icon: Heart },
  { key: "moderation", label: "Moderation", Icon: Flag },
  { key: "reports", label: "Reports", Icon: BarChart3 },
] as const;

export default function DashboardPage() {
  const [section, setSection] = useState<Section>("overview");
  const [riskOnly, setRiskOnly] = useState(false);
  const [givingStep, setGivingStep] = useState<GivingStep>("amount");
  const [redeemAmount, setRedeemAmount] = useState(20);
  const [pagePublic, setPagePublic] = useState(true);
  const [photoPublic, setPhotoPublic] = useState(false);
  const [modStatus, setModStatus] = useState<ModStatus>({
    jasmine: "pending",
    kevin: "pending",
  });

  // Crisis post is always held + pending, so it counts as 1.
  const pendingCount =
    1 + Object.values(modStatus).filter((v) => v === "pending").length;
  const activeKey = section === "detail" ? "participants" : section;

  const goParticipants = () => setSection("participants");
  const goModeration = () => setSection("moderation");
  const goGiving = () => setSection("giving");

  const setVerdict = (key: keyof ModStatus, verdict: Verdict) =>
    setModStatus((prev) => ({ ...prev, [key]: verdict }));

  return (
    <div className="flex min-h-screen">
      {/* SIDEBAR — dashboard shell, not the site Nav/Footer */}
      <aside className="sticky top-0 flex h-screen w-60 flex-none flex-col bg-navy-deep pb-6 pt-7">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={WORDMARK_WHITE}
          alt="My Struggle"
          className="mx-6 mb-[30px] h-[38px] w-auto self-start"
        />
        {NAV.map(({ key, label, Icon }) => {
          const on = activeKey === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSection(key)}
              className={
                "flex w-full cursor-pointer items-center gap-3 border-l-[3px] px-6 py-3 text-left text-sm " +
                (on
                  ? "border-blue-primary bg-[rgba(46,124,214,.14)] font-bold text-sky-tint"
                  : "border-transparent font-semibold text-white/65 hover:text-white/90")
              }
            >
              <Icon size={15} strokeWidth={2.4} />
              {label}
              {key === "moderation" && pendingCount > 0 && (
                <span className="ml-auto inline-flex h-5 items-center rounded-full bg-blue-primary px-2 text-[11px] font-bold text-white">
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
        <div className="mt-auto flex items-center gap-3 border-t border-white/10 px-6 pt-5">
          <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full bg-sky-tint text-sm font-extrabold text-indigo-brand">
            S
          </div>
          <div>
            <div className="text-[13px] font-bold text-white">Sarah K.</div>
            <div className="text-[11px] font-medium text-white/55">
              Laveen Center · staff
            </div>
          </div>
        </div>
      </aside>

      {/* CONTENT */}
      <main className="flex min-w-0 flex-1 flex-col gap-5 px-9 py-[30px] text-[15px]">
        {section === "overview" && (
          <Overview
            pendingCount={pendingCount}
            goParticipants={goParticipants}
            goModeration={goModeration}
          />
        )}
        {section === "participants" && (
          <Participants
            riskOnly={riskOnly}
            onToggleRisk={() => setRiskOnly((v) => !v)}
            onOpenDanielle={() => setSection("detail")}
          />
        )}
        {section === "detail" && (
          <ParticipantDetail
            pagePublic={pagePublic}
            photoPublic={photoPublic}
            onTogglePage={() => setPagePublic((v) => !v)}
            onTogglePhoto={() => setPhotoPublic((v) => !v)}
            redeemed={givingStep === "done" ? redeemAmount : 0}
            goParticipants={goParticipants}
            goGiving={goGiving}
          />
        )}
        {section === "giving" && (
          <GivingDesk
            step={givingStep}
            redeemAmount={redeemAmount}
            onSelectAmount={setRedeemAmount}
            onToPin={() => setGivingStep("pin")}
            onBackToAmount={() => setGivingStep("amount")}
            onConfirm={() => setGivingStep("done")}
            onReset={() => {
              setGivingStep("amount");
              setRedeemAmount(20);
            }}
          />
        )}
        {section === "moderation" && (
          <Moderation
            pendingCount={pendingCount}
            modStatus={modStatus}
            onVerdict={setVerdict}
            goParticipants={goParticipants}
          />
        )}
        {section === "reports" && <Reports />}
      </main>

      <PrototypeMap />
    </div>
  );
}
