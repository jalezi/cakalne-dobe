import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="flex flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <p className="text-muted-foreground text-7xl font-bold">404</p>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Stran ni bila najdena</h1>
        <p className="text-muted-foreground">
          Stran, ki jo iščete, ne obstaja ali je bila premaknjena.
        </p>
      </div>
      <Button render={<Link href="/" />}>Nazaj na domačo stran</Button>
    </main>
  );
}
