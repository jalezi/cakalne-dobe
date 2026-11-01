// PROTOTYPE (throwaway). Stand-ins for next/navigation and next/dynamic so the
// variants can run as a single self-contained page (Claude artifact).
import {
  type ComponentType,
  lazy,
  type ReactNode,
  Suspense,
  useSyncExternalStore,
} from 'react';

const VARIANT_HASH = ['a', 'b', 'c', 'd'];
function initialParams() {
  const h = location.hash.replace('#', '').toLowerCase();
  const p = new URLSearchParams('p=1289'); // open on a real procedure
  if (VARIANT_HASH.includes(h)) p.set('variant', h.toUpperCase());
  return p;
}

let params = initialParams();
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useSearchParams() {
  return useSyncExternalStore(
    subscribe,
    () => params,
    () => params
  );
}

export function usePathname() {
  return '';
}

export function useRouter() {
  return {
    replace(url: string) {
      params = new URLSearchParams(url.split('?')[1] ?? '');
      try {
        const v = (params.get('variant') ?? 'A').toLowerCase();
        history.replaceState(null, '', `#${v}`);
      } catch {
        // hash is a convenience only
      }
      for (const l of listeners) l();
    },
  };
}

export default function dynamic<P extends object>(
  loader: () => Promise<ComponentType<P>>,
  opts?: { loading?: () => ReactNode }
) {
  const Lazy = lazy(() => loader().then((C) => ({ default: C })));
  return (props: P) => (
    <Suspense fallback={opts?.loading?.() ?? null}>
      <Lazy {...props} />
    </Suspense>
  );
}
