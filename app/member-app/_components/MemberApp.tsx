"use client";

import { useEffect, useState } from "react";
import type {
  Course,
  Enrollment,
  SafeUser,
  SupportRequest,
} from "@/app/lib/types";
import TabBar, { type TabKey } from "./TabBar";
import HomeTab from "./HomeTab";
import LearnTab from "./LearnTab";
import LessonPlayer from "./LessonPlayer";
import GiveTab from "./GiveTab";
import ChatTab from "./ChatTab";
import MeTab from "./MeTab";
import PlanView, { type PlanGoal } from "./PlanView";
import CelebrationOverlay from "./CelebrationOverlay";
import { FEED_REFRESH_EVENT } from "@/app/components/feed/CommunityFeed";

export type Task = { label: string; done: boolean };
export type GuideState = "idle" | "asked" | "added";

/** Next incomplete lesson (1-based), or null when the course is done. */
export function nextLesson(
  course: Course,
  enrollment: Enrollment | undefined
): number | null {
  const done = new Set(enrollment?.completedLessons ?? []);
  for (let n = 1; n <= course.lessonCount; n++) if (!done.has(n)) return n;
  return null;
}

/** Full interactive member portal - phone shell + tab router + overlays. */
export default function MemberApp() {
  const [tab, setTab] = useState<TabKey>("home");
  const [lessonOpen, setLessonOpen] = useState(false);
  // My Plan (docs/13 Part C) - full-screen view within the shell, same
  // pattern as lessonOpen. Not a 6th tab.
  const [planOpen, setPlanOpen] = useState(false);
  // Recovery goals (enriched) - null until signed in + loaded.
  const [planGoals, setPlanGoals] = useState<PlanGoal[] | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [lessonDone, setLessonDone] = useState(false);
  const [quiz, setQuiz] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([
    { label: "Mood check-in with Marcus", done: true },
    { label: "Job interview at ABC Painting - 2:00 pm", done: false },
    { label: "ISE Course 3 · Lesson 2 - 12 min video", done: false },
  ]);
  const [heart3, setHeart3] = useState(false); // local fallback shared-win post
  const [vidCat, setVidCat] = useState("All");
  const [guideState, setGuideState] = useState<GuideState>("idle");
  const [askedLabel, setAskedLabel] = useState("");
  const [sharedWin, setSharedWin] = useState(false);
  // Signed-in session (null = signed out → styled demo everywhere).
  const [me, setMe] = useState<{
    user: SafeUser;
    requests: SupportRequest[];
  } | null>(null);
  // Real Learn data (signed in only; null = signed out → demo courses).
  const [learn, setLearn] = useState<{
    courses: Course[];
    enrollments: Enrollment[];
  } | null>(null);
  // Which real course the lesson player has open (null = demo lesson).
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  // Last real completion - feeds the celebration copy + the win post body.
  const [lastWin, setLastWin] = useState<{
    courseTitle: string;
    lesson: number;
    streak: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data?.user) return;
        setMe({ user: data.user, requests: data.requests ?? [] });
        // Recovery goals for the My Plan card + view (fire-and-forget).
        fetch("/api/recovery-goals")
          .then((r) => (r.ok ? r.json() : null))
          .then((g) => {
            if (!cancelled && g?.goals) setPlanGoals(g.goals);
          })
          .catch(() => {});
        const cRes = await fetch("/api/courses");
        if (!cRes.ok) return;
        const cData = await cRes.json();
        if (!cancelled && cData?.courses)
          setLearn({
            courses: cData.courses,
            enrollments: cData.enrollments ?? [],
          });
      } catch {
        // offline / signed out - keep demo behavior
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // My Tracker ring = % of completed one-tap tasks + the lesson itself.
  const doneCount = tasks.filter((t) => t.done).length + (lessonDone ? 1 : 0);
  const trackerPct = Math.round((doneCount / (tasks.length + 1)) * 100);
  const points = 640 + (lessonDone ? 10 : 0);

  const toggleTask = (i: number) =>
    setTasks((ts) => ts.map((t, j) => (j === i ? { ...t, done: !t.done } : t)));

  const goTab = (key: TabKey) => {
    setTab(key);
    setLessonOpen(false);
    setPlanOpen(false);
  };

  const openCourse = (courseId: string | null) => {
    setActiveCourseId(courseId);
    setLessonOpen(true);
  };

  const activeCourse =
    (learn && activeCourseId
      ? learn.courses.find((c) => c.id === activeCourseId)
      : undefined) ?? null;
  const activeEnrollment =
    (learn && activeCourseId
      ? learn.enrollments.find((e) => e.courseId === activeCourseId)
      : undefined) ?? undefined;
  const activeLesson = activeCourse
    ? nextLesson(activeCourse, activeEnrollment)
    : null;

  const completeLesson = async () => {
    // Signed in with a real course open → persist the completion.
    if (me && activeCourse && activeLesson) {
      try {
        const res = await fetch("/api/lessons/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseId: activeCourse.id,
            lesson: activeLesson,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setLearn((l) =>
            l
              ? {
                  ...l,
                  enrollments: [
                    ...l.enrollments.filter(
                      (e) => e.courseId !== activeCourse.id
                    ),
                    data.enrollment,
                  ],
                }
              : l
          );
          setMe((m) =>
            m
              ? {
                  ...m,
                  user: {
                    ...m.user,
                    points: data.points,
                    level: data.level,
                    streak: data.streak,
                  },
                }
              : m
          );
          setLastWin({
            courseTitle: activeCourse.title,
            lesson: activeLesson,
            streak: data.streak,
          });
        }
      } catch {
        // offline - celebrate locally anyway; server catches up next time
      }
    }
    setLessonDone(true);
    setCelebrating(true);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };

  const shareWin = async () => {
    setCelebrating(false);
    setLessonOpen(false);
    setTab("home");
    // Post the win to the live community feed when signed in;
    // fall back to the local card when signed out (or offline).
    const winBody = lastWin
      ? `Just completed Lesson ${lastWin.lesson} of ${lastWin.courseTitle} - +10 points and the streak lives on.`
      : "Just completed Lesson 2 of ISE Course 3 - made a decision. +10 points and the streak lives on.";
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: winBody, kind: "win" }),
      });
      if (!res.ok) throw new Error(String(res.status));
      window.dispatchEvent(new Event(FEED_REFRESH_EVENT));
    } catch {
      setSharedWin(true);
    }
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
        {planOpen && (
          <PlanView
            close={() => setPlanOpen(false)}
            user={me?.user ?? null}
            goals={planGoals}
            setGoals={setPlanGoals}
            onPoints={(points, level) =>
              setMe((m) =>
                m ? { ...m, user: { ...m.user, points, level } } : m
              )
            }
          />
        )}
        {!planOpen && tab === "home" && (
          <HomeTab
            tasks={tasks}
            toggleTask={toggleTask}
            trackerPct={trackerPct}
            heart3={heart3}
            toggleHeart3={() => setHeart3((v) => !v)}
            sharedWin={sharedWin}
            user={me?.user ?? null}
            planGoals={planGoals}
            openPlan={() => setPlanOpen(true)}
          />
        )}
        {!planOpen && tab === "learn" && !lessonOpen && (
          <LearnTab
            lessonDone={lessonDone}
            openLesson={() => openCourse(null)}
            vidCat={vidCat}
            setVidCat={setVidCat}
            learn={me ? learn : null}
            openCourse={openCourse}
          />
        )}
        {!planOpen && tab === "learn" && lessonOpen && (
          <LessonPlayer
            closeLesson={() => setLessonOpen(false)}
            quiz={quiz}
            setQuiz={setQuiz}
            completeLesson={completeLesson}
            courseTitle={activeCourse?.title}
            lessonNumber={activeLesson ?? undefined}
            lessonCount={activeCourse?.lessonCount}
          />
        )}
        {!planOpen && tab === "give" && <GiveTab />}
        {!planOpen && tab === "chat" && (
          <ChatTab
            guideState={guideState}
            askedLabel={askedLabel}
            askGuide={askGuide}
            addGuideTask={addGuideTask}
            resetGuide={resetGuide}
          />
        )}
        {!planOpen && tab === "me" && (
          <MeTab
            points={points}
            lessonDone={lessonDone}
            user={me?.user ?? null}
            requests={me?.requests ?? null}
          />
        )}

        <TabBar active={tab} onSelect={goTab} />

        {celebrating && (
          <CelebrationOverlay
            shareWin={shareWin}
            keepPrivate={keepPrivate}
            courseTitle={lastWin?.courseTitle}
            streakDay={lastWin?.streak}
          />
        )}
      </div>
    </div>
  );
}
