import { MarkdownContent } from "@/components/life-lab/markdown-content";
import {
  parseLifeLabTimeline,
  type LifeLabTimelineItem,
} from "@/lib/life-lab/timeline";

type LifeLabTimelineProps = {
  content: string;
  maxItems?: number;
};

function TimelineRows({ items }: { items: LifeLabTimelineItem[] }) {
  return (
    <>
      {items.map((item, index) => (
        <tr key={`${item.timestamp}-${index}`}>
          <td className="ui-timeline-time">
            <span>{item.timestamp}</span>
          </td>
          <td className="ui-timeline-moment">
            <MarkdownContent content={item.description} compact />
          </td>
        </tr>
      ))}
    </>
  );
}

export function LifeLabTimeline({
  content,
  maxItems,
}: LifeLabTimelineProps) {
  const parsed = parseLifeLabTimeline(content);
  const items = maxItems ? parsed.slice(0, maxItems) : parsed;

  if (items.length === 0) {
    return <MarkdownContent content={content} compact />;
  }

  return (
    <div className="ui-timeline-scroll">
      <table className="ui-timeline-table">
        <caption className="sr-only">Timeline moments</caption>
        <colgroup>
          <col className="ui-timeline-time-column" />
          <col />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">Time</th>
            <th scope="col">Moment</th>
          </tr>
        </thead>
        <tbody>
          <TimelineRows items={items} />
        </tbody>
      </table>
    </div>
  );
}
