// PROTOTYPE (throwaway, branch prototype/ui-current-state): the maintenance
// page is swapped for three UI variants. See src/components/prototype/.
import { Suspense } from 'react';
import { PrototypeHome } from '@/components/prototype/variants';

export const dynamic = 'force-static';

export default function Home() {
  return (
    <Suspense>
      <PrototypeHome />
    </Suspense>
  );
}
