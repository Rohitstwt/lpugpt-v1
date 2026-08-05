"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Calendar,
  MapPin,
  Sparkles,
  Bell,
  Building2,
  GraduationCap,
  Search,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SuggestedQuestions } from "@/components/home/SuggestedQuestions";

type CampusData = {
  events: Array<{
    id: string;
    title: string;
    description?: string;
    date: string;
    time?: string;
    location?: string;
    category?: string;
  }>;
  notices: Array<{
    id: string;
    title: string;
    body: string;
    category?: string;
    priority?: string;
    createdAt: string;
  }>;
  buildings: Array<{ id: string; name: string; block?: string; description?: string }>;
  faculty: Array<{ id: string; name: string; department?: string; designation?: string }>;
};

export function HomeExperience() {
  const router = useRouter();
  const { data: campus } = useQuery<CampusData>({
    queryKey: ["campus"],
    queryFn: async () => {
      const res = await fetch("/api/campus");
      if (!res.ok) throw new Error("Failed to load campus data");
      return res.json();
    },
  });

  function handleSearch(query: string) {
    const trimmed = query.trim();
    if (!trimmed) return;
    router.push(`/app?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg">
      {/* Ambient gradient */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-orange/8 blur-3xl" />
        <div className="absolute top-1/3 right-0 h-80 w-80 rounded-full bg-orange/5 blur-3xl" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <motion.span
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          className="font-display text-xl font-700 text-orange"
        >
          LPUGPT
        </motion.span>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-xl px-4 py-2 text-sm text-text-muted transition hover:text-text"
          >
            Log in
          </Link>
          <Button asChild size="sm">
            <Link href="/register">Get started</Link>
          </Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-24">
        {/* Hero */}
        <section className="mx-auto max-w-3xl pt-16 text-center sm:pt-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="mb-6 gap-1.5 px-3 py-1">
              <Sparkles className="h-3 w-3" />
              AI Operating System for LPU
            </Badge>
            <h1 className="font-display text-5xl font-700 tracking-tight text-text sm:text-7xl">
              Your campus,
              <br />
              <span className="text-orange">reimagined.</span>
            </h1>
            <p className="mt-6 text-lg text-text-muted sm:text-xl">
              Navigate campus, discover events, find faculty, and get answers —
              all through beautiful, interactive experiences. Not another chatbot.
            </p>
          </motion.div>

          {/* Search */}
          <motion.form
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-10"
            onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.querySelector("input");
              if (input) handleSearch(input.value);
            }}
          >
            <div className="relative mx-auto max-w-2xl">
              <Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted" />
              <Input
                placeholder="How do I go from Block 38 to Block 13?"
                className="h-14 rounded-2xl pl-14 pr-32 text-base shadow-xl shadow-black/20 border-orange/20 focus-visible:ring-orange/40"
              />
              <Button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl"
                size="sm"
              >
                Ask LPUGPT
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </motion.form>

          <SuggestedQuestions onSelect={handleSearch} className="mt-8" />
        </section>

        {/* Campus highlights grid */}
        <section className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* Events */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="h-full">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="h-5 w-5 text-orange" />
                  <h2 className="font-display font-700">Upcoming Events</h2>
                </div>
                <div className="space-y-3">
                  {campus?.events.slice(0, 3).map((event) => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => handleSearch(event.title)}
                      className="w-full rounded-xl bg-bg-elevated p-3 text-left transition hover:bg-surface-hover"
                    >
                      <p className="font-medium text-sm">{event.title}</p>
                      <p className="mt-1 text-xs text-text-muted">
                        {new Date(event.date).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                        })}
                        {event.location && ` · ${event.location}`}
                      </p>
                    </button>
                  ))}
                  {!campus?.events.length && (
                    <p className="text-sm text-text-muted">Loading events…</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Notices */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="h-full">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Bell className="h-5 w-5 text-orange" />
                  <h2 className="font-display font-700">Trending Notices</h2>
                </div>
                <div className="space-y-3">
                  {campus?.notices.slice(0, 3).map((notice) => (
                    <button
                      key={notice.id}
                      type="button"
                      onClick={() => handleSearch(notice.title)}
                      className="w-full rounded-xl bg-bg-elevated p-3 text-left transition hover:bg-surface-hover"
                    >
                      <div className="flex items-center gap-2">
                        {notice.priority === "urgent" && (
                          <Badge variant="destructive" className="text-[10px]">
                            Urgent
                          </Badge>
                        )}
                        <p className="font-medium text-sm line-clamp-1">{notice.title}</p>
                      </div>
                      <p className="mt-1 text-xs text-text-muted line-clamp-2">
                        {notice.body}
                      </p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Quick explore */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="sm:col-span-2 lg:col-span-1"
          >
            <Card className="h-full">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="h-5 w-5 text-orange" />
                  <h2 className="font-display font-700">Explore Campus</h2>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: Building2, label: "Buildings", query: "Show campus buildings" },
                    { icon: GraduationCap, label: "Faculty", query: "CSE faculty directory" },
                    { icon: Calendar, label: "Events", query: "Upcoming campus events" },
                    { icon: MapPin, label: "Navigate", query: "How do I go from Block 38 to Block 13?" },
                  ].map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => handleSearch(item.query)}
                      className="flex flex-col items-center gap-2 rounded-xl border border-border bg-bg-elevated p-4 transition hover:border-orange/30 hover:bg-surface-hover"
                    >
                      <item.icon className="h-5 w-5 text-orange" />
                      <span className="text-xs font-medium">{item.label}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </section>

        {/* CTA */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-16 text-center"
        >
          <p className="text-text-muted">
            Built on public campus knowledge. No university permissions required.
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link href="/register">
              Start exploring
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </motion.section>
      </main>
    </div>
  );
}
