import { Time } from '@/components/time';
import { cn } from '@/lib/utils';

type Payload = {
  value: string | number;
  name: string;
  color: string;
  stroke: string;
  payload: { x: Date | string };
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

    const xAxisLabel =
      pldBase?.x instanceof Date ? (
        <Time
          date={pldBase?.x.toLocaleString('en-US', {
            timeZone: 'Europe/Ljubljana',
          })}
        />
      ) : (
        pldBase?.x
      );

    return (
      <div className="border bg-background p-2 text-foreground">
        <p className="max-w-64 truncate text-xs font-semibold">{xAxisLabel}</p>
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
