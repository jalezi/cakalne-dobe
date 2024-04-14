export function Footer() {
  return (
    <footer className="border-t-[1px] border-dashed p-4 text-sm ">
      <div className="space-y-4">
        <div>
          <p>
            Podatke zbral{' '}
            <a
              href="https://gitlab.com/mitar"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4"
            >
              Mitar
            </a>
            . Izvorna koda na{' '}
            <a
              href="https://gitlab.com/mitar/cakalne-dobe"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4"
            >
              GitLab
            </a>
          </p>
          <p>
            Podatki pridobljeni iz{' '}
            <a
              href="https://cakalnedobe.ezdrav.si/"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4"
            >
              eZdrav
            </a>{' '}
            in{' '}
            <a
              href="https://nijz.si/podatki/klasifikacije-in-sifranti/sifrant-vrst-zdravstvenih-storitev-vzs/"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4"
            >
              <abbr title="Šifrant vrst zdravstvenih storitev ">VZS</abbr>
            </a>
            .
          </p>
        </div>
        <div>
          <p>
            Izdelal{' '}
            <a
              href="https://github.com/jalezi"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4"
            >
              jalezi
            </a>
            . Izvorna koda na{' '}
            <a
              href="https://github.com/jalezi/cakalne-dobe"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4"
            >
              GitHub
            </a>
            .
          </p>
          <p>
            &copy; 2024 - {new Date().getFullYear()} https://github.com/jalezi
          </p>
        </div>
      </div>
    </footer>
  );
}
