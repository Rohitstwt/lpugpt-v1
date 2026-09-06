"use client";

import type { UIBlock } from "@/types/ui-blocks";
import { RouteCard } from "@/components/cards/RouteCard";
import { BuildingCard } from "@/components/cards/BuildingCard";
import { FacultyCard } from "@/components/cards/FacultyCard";
import { EventCard } from "@/components/cards/EventCard";
import { NoticeCard } from "@/components/cards/NoticeCard";
import { LibraryCard } from "@/components/cards/LibraryCard";
import { HostelCard } from "@/components/cards/HostelCard";
import { SourcesCard } from "@/components/cards/SourcesCard";
import { NearbyPlacesCard } from "@/components/cards/NearbyPlacesCard";
import { QuickActionsCard } from "@/components/cards/QuickActionsCard";
import { AttendanceCard } from "@/components/cards/AttendanceCard";
import { FeeCard } from "@/components/cards/FeeCard";
import { TimetableCard } from "@/components/cards/TimetableCard";
import { AgentRunCard } from "@/components/cards/AgentRunCard";
import { AgentImageCard } from "@/components/cards/AgentImageCard";
import { PaymentResultCard } from "@/components/cards/PaymentResultCard";
import { LiveBrowserCard } from "@/components/cards/LiveBrowserCard";
import { AgentConfirmCard } from "@/components/cards/AgentConfirmCard";
import { AssignmentSessionCard } from "@/components/cards/AssignmentSessionCard";
import { LeaveSessionCard } from "@/components/cards/LeaveSessionCard";
import { GradesCard } from "@/components/cards/GradesCard";
import { AssignmentsCard } from "@/components/cards/AssignmentsCard";
import { AttendanceCalcCard } from "@/components/cards/AttendanceCalcCard";
import { CgpaCard } from "@/components/cards/CgpaCard";
import { ResultsChartsCard } from "@/components/cards/ResultsChartsCard";
import { CampusNavCard } from "@/components/cards/CampusNavCard";
import { CampusMap } from "@/components/maps/CampusMap";

function TextBlock({
  content,
  citations,
}: {
  content: string;
  citations?: Array<{ id: string; title: string; source: string; snippet?: string }>;
}) {
  const parts = content.split(/(\*\*[^*]+\*\*)/g);
  return (
    <div className="space-y-3">
      <div className="whitespace-pre-wrap text-[15px] leading-7 text-text">
        {parts.map((part, i) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return (
              <strong key={i} className="font-semibold">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </div>
      {citations && citations.length > 0 && <SourcesCard sources={citations} />}
    </div>
  );
}

export function MessageRenderer({
  blocks,
  onQuickAction,
}: {
  blocks: UIBlock[];
  onQuickAction?: (query: string) => void;
}) {
  return (
    <div className="space-y-2">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "text":
            return (
              <TextBlock
                key={i}
                content={block.content}
                citations={block.citations}
              />
            );
          case "route_card":
            return (
              <div key={i} className="space-y-4">
                {block.text && <TextBlock content={block.text} />}
                <RouteCard data={block.data} />
                {block.data.fromLat && block.data.toLat && (
                  <CampusMap
                    centerLat={(block.data.fromLat + block.data.toLat) / 2}
                    centerLng={(block.data.fromLng! + block.data.toLng!) / 2}
                    markers={[
                      {
                        lat: block.data.fromLat,
                        lng: block.data.fromLng!,
                        label: block.data.from,
                      },
                      {
                        lat: block.data.toLat,
                        lng: block.data.toLng!,
                        label: block.data.to,
                      },
                    ]}
                  />
                )}
              </div>
            );
          case "building_card":
            return <BuildingCard key={i} data={block.data} />;
          case "faculty_card":
            return <FacultyCard key={i} data={block.data} />;
          case "event_card":
            return <EventCard key={i} data={block.data} />;
          case "notice_card":
            return <NoticeCard key={i} data={block.data} />;
          case "library_card":
            return <LibraryCard key={i} data={block.data} />;
          case "hostel_card":
            return <HostelCard key={i} data={block.data} />;
          case "sources_card":
            return <SourcesCard key={i} sources={block.data.sources} />;
          case "campus_map":
            return (
              <CampusMap
                key={i}
                centerLat={block.data.centerLat}
                centerLng={block.data.centerLng}
                zoom={block.data.zoom}
                markers={block.data.markers}
              />
            );
          case "nearby_places":
            return <NearbyPlacesCard key={i} data={block.data} />;
          case "quick_actions":
            return (
              <QuickActionsCard
                key={i}
                data={block.data}
                onAction={onQuickAction}
              />
            );
          case "attendance_card":
            return <AttendanceCard key={i} data={block.data} />;
          case "fee_card":
            return <FeeCard key={i} data={block.data} />;
          case "agent_run":
            return <AgentRunCard key={i} data={block.data} />;
          case "agent_image":
            return <AgentImageCard key={i} data={block.data} />;
          case "payment_result":
            return <PaymentResultCard key={i} data={block.data} />;
          case "live_browser":
            return <LiveBrowserCard key={i} data={block.data} />;
          case "agent_confirm":
            return <AgentConfirmCard key={i} data={block.data} />;
          case "assignment_session":
            return <AssignmentSessionCard key={i} data={block.data} />;
          case "leave_session":
            return <LeaveSessionCard key={i} data={block.data} />;
          case "grades_card":
            return <GradesCard key={i} data={block.data} />;
          case "assignments_card":
            return <AssignmentsCard key={i} data={block.data} />;
          case "attendance_calc_card":
            return <AttendanceCalcCard key={i} data={block.data} />;
          case "cgpa_card":
            return <CgpaCard key={i} data={block.data} />;
          case "results_charts_card":
            return <ResultsChartsCard key={i} data={block.data} />;
          case "campus_nav":
            return <CampusNavCard key={i} data={block.data} />;
          case "timetable_card":
            return <TimetableCard key={i} data={block.data} />;
          case "faq_card":
            return (
              <div
                key={i}
                className="rounded-2xl border border-border bg-surface p-5"
              >
                <p className="font-semibold">{block.data.question}</p>
                <p className="mt-2 text-sm text-text-muted leading-relaxed">
                  {block.data.answer}
                </p>
              </div>
            );
          case "search_result":
            return (
              <div
                key={i}
                className="rounded-xl border border-border bg-bg-elevated p-4"
              >
                <p className="font-medium text-sm">{block.data.title}</p>
                <p className="mt-1 text-sm text-text-muted">{block.data.snippet}</p>
                {block.data.source && (
                  <p className="mt-2 text-xs text-orange">{block.data.source}</p>
                )}
              </div>
            );
          case "restaurant_card":
            return (
              <div
                key={i}
                className="rounded-2xl border border-border bg-surface p-5"
              >
                <p className="font-semibold">{block.data.name}</p>
                {block.data.cuisine && (
                  <p className="text-sm text-text-muted">{block.data.cuisine}</p>
                )}
                {block.data.distance && (
                  <p className="mt-1 text-xs text-orange">{block.data.distance}</p>
                )}
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
