"use client";

import { useState } from "react";
import TabBar, { type TabKey } from "./TabBar";
import HomeTab from "./HomeTab";
import LearnTab from "./LearnTab";
import LessonPlayer from "./LessonPlayer";
import GiveTab from "./GiveTab";
import ChatTab from "./ChatTab";
import MeTab from "./MeTab";
import CelebrationOverlay from "./CelebrationOverlay";

export type Task = { label: string; done: boolean };
export type GuideState = "idle" | "asked" | "added";

/** Full interactive member portal — phone shell + tab router + overlays. */
export default function MemberApp() {
  const [tab, setTab] = useState<TabKey>("home");
  const [lessonOpen, setLessonOpen] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [lessonDone, setLessonDone] = useState(false);
  const [quiz, setQuiz] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([
    { label: "Mood check-in with Marcus", done: true },
    { label: "Job interview at ABC Painting — 2:00 pm", done: false },
    { label: "ISE Course 3 · Lesson 2 — 12 min video", done: false },
  ]);
  const [heart1, setHeart1] = useState(false);
  const [heart2, setHeart2] = useState(false);
  const [heart3, setHeart3] = useState(false); // shared-win post
  const [vidCat, setVidCat] = useState("All");
  const [guideState, setGuideState] = useState<GuideState>("idle");
  const [askedLabel, setAskedLabel] = useState("");
  const [sharedWin, setSharedWin] = useState(false);

  // My Tracker ring = % of completed one-tap tasks + the lesson itself.
  const doneCount = tasks.filter((t) => t.done).length + (lessonDone ? 1 : 0);
  const trackerPct = Math.round((doneCount / (tasks.length + 1)) * 100);
  const points = 640 + (lessonDone ? 10 : 0);

  const toggleTask = (i: number) =>
    setTasks((ts) => ts.map((t, j) => (j === i ? { ...t, done: !t.done } : t)));

  const goTab = (key: TabKey) => {
    setTab(key);
    setLessonOpen(false);
  };

  const completeLesson = () => {
    setLessonDone(true);
    setCelebrating(true);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };

  const shareWin = () => {
    setCelebrating(false);
    setLessonOpen(false);
    setSharedWin(true);
    setTab("home");
  };
  const keepPrivate = () => {
    setCelebrating(false);
    setLessonOpen(false);
  };

  const askGuide = (label: string) => {
    setGuideState("asked");
    setAskedLabel(label);
  };
  const addGuideTask = () => {
    const taskLabel =
      askedLabel === "I need my driver's license back"
        ? "MVD reinstatement visit"
        : askedLabel === "Help me find a job"
          ? "Prep 3 interview answers"
          : "Ask Sarah about halfway house openings";
    setTasks((ts) => [...ts, { label: `From The Guide: ${taskLabel}`, done: false }]);
    setGuideState("added");
  };
  const resetGuide = () => {
    setGuideState("idle");
    setAskedLabel("");
  };

  return (
    <div className="flex min-h-screen justify-center bg-[#E8EDF4]">
      <div className="relative flex min-h-screen w-full max-w-[430px] flex-col bg-canvas shadow-[0_0_60px_rgba(11,37,69,.12)]">
        {tab === "home" && (
          <HomeTab
            tasks={tasks}
            toggleTask={toggleTask}
            trackerPct={trackerPct}
            heart1={heart1}
            toggleHeart1={() => setHeart1((v) => !v)}
            heart2={heart2}
            toggleHeart2={() => setHeart2((v) => !v)}
            heart3={heart3}
            toggleHeart3={() => setHeart3((v) => !v)}
            sharedWin={sharedWin}
          />
        )}
        {tab === "learn" && !lessonOpen && (
          <LearnTab
            lessonDone={lessonDone}
            openLesson={() => setLessonOpen(true)}
            vidCat={vidCat}
            setVidCat={setVidCat}
          />
        )}
        {tab === "learn" && lessonOpen && (
          <LessonPlayer
            closeLesson={() => setLessonOpen(false)}
            quiz={quiz}
            setQuiz={setQuiz}
            completeLesson={completeLesson}
          />
        )}
        {tab === "give" && <GiveTab />}
        {tab === "chat" && (
          <ChatTab
            guideState={guideState}
            askedLabel={askedLabel}
            askGuide={askGuide}
            addGuideTask={addGuideTask}
            resetGuide={resetGuide}
          />
        )}
        {tab === "me" && <MeTab points={points} lessonDone={lessonDone} />}

        <TabBar active={tab} onSelect={goTab} />

        {celebrating && (
          <CelebrationOverlay shareWin={shareWin} keepPrivate={keepPrivate} />
        )}
      </div>
    </div>
  );
}
