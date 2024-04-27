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
  label?: number;
}
export function TooltipContent({ active, payload }: TooltipContentProps) {
  if (active && payload && payload.length > 0) {
    const { payload: pldBase } = payload[0];

    return (
      <div className="border bg-background p-2 text-foreground">
        <Time date={pldBase?.x} className="text-xs font-semibold" />
        <ul>
          {payload.map((pld: Payload, index) => {
            document.body.style.setProperty(
              `--tooltip-color-${index}`,
              pld.color
            );

            return (
              <li
                style={{ color: pld.color }}
                key={pld.name}
                className={cn(`text-xs`)}
              >
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
