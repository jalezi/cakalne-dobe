export const dynamic = 'force-static';

export default function Home() {
  return (
    <main className="z-0 mx-auto flex w-full max-w-3xl flex-1 flex-col justify-start px-4 py-10 sm:px-6 sm:py-12 lg:justify-center">
      <section className="space-y-4 sm:space-y-5">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Čakalne dobe
        </p>
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">
          Stran je trenutno v prenovi.
        </h1>
        <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
          Javni prikaz čakalnih dob je trenutno umaknjen, medtem ko
          poenostavljam aplikacijo in zmanjšujem infrastrukturne stroške.
        </p>
        <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
          Projekt ostaja aktiven, javni vmesnik pa bo vrnjen v preprostejši
          obliki.
        </p>
        <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
          Trenutno je na voljo le osnovna predstavitvena stran z obvestilom o
          stanju projekta.
        </p>
      </section>
    </main>
  );
}
