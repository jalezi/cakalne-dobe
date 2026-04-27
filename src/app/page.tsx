export const dynamic = 'force-static';

export default function Home() {
  return (
    <main className="z-0 mx-auto flex min-h-[calc(100svh-9rem)] w-full max-w-3xl flex-col justify-center gap-8 px-4 py-12">
      <section className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Čakalne dobe
        </p>
        <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Stran je trenutno v prenovi.
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Javni prikaz čakalnih dob je trenutno umaknjen, medtem ko
          poenostavljam aplikacijo in zmanjšujem infrastrukturne stroške.
        </p>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Projekt ostaja aktiven, javni vmesnik pa bo vrnjen v preprostejši
          obliki.
        </p>
        <p className="max-w-2xl text-lg text-muted-foreground">
          Trenutno je na voljo le osnovna predstavitvena stran z obvestilom o
          stanju projekta.
        </p>
      </section>
    </main>
  );
}
