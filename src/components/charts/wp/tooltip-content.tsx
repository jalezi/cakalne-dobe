import { Time } from '@/components/time';
import { cn } from '@/lib/utils';

type Payload = {
  value: string | number;
  name: string;
  color: string;
  stroke: string;
  payload: { x: Date };
  fill: string;
};

interface TooltipContentProps {
  active?: boolean;
  payload?: Payload[];

  lineStrokes: string[];
}
export function TooltipContent({
  active,
  payload,
  ...props
}: TooltipContentProps) {
  if (active && payload && payload.length > 0) {
    const { payload: pldBase } = payload[0];

    return (
      <div className="border bg-background p-2 text-foreground">
        <Time date={pldBase?.x} className="text-xs font-semibold" />
        <ul>
          {payload.map((pld: Payload, index) => {
            const color = props.lineStrokes[index] ?? pld.color;

            return (
              <li key={pld.name} style={{ color }} className={cn(`text-xs`)}>
                {`${pld.name} : ${pld.value}`}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }
  return null;
}
