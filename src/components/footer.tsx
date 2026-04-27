export function Footer() {
  return (
    <footer className="text-muted-foreground border-t border-dashed p-4 text-sm">
      <div className="mx-auto grid w-full max-w-3xl gap-4 wrap-break-word sm:grid-cols-2 sm:gap-6">
        <div>
          <p>
            Podatke zbral{' '}
            <ExternalLink href="https://gitlab.com/mitar">Mitar</ExternalLink>.
            Izvorna koda na{' '}
            <ExternalLink href="https://gitlab.com/wayback-automachine/cakalne-dobe">
              GitLab
            </ExternalLink>
            .
          </p>
          <p>
            Podatki pridobljeni iz{' '}
            <ExternalLink href="https://cakalnedobe.ezdrav.si/">
              eZdrav
            </ExternalLink>{' '}
            in{' '}
            <ExternalLink href="https://nijz.si/podatki/klasifikacije-in-sifranti/sifrant-vrst-zdravstvenih-storitev-vzs/">
              <abbr title="Šifrant vrst zdravstvenih storitev ">VZS</abbr>
            </ExternalLink>
            .
          </p>
        </div>
        <div>
          <p>
            Izdelal{' '}
            <ExternalLink href="https://github.com/jalezi">jalezi</ExternalLink>
            . Izvorna koda na{' '}
            <ExternalLink href="https://github.com/jalezi/cakalne-dobe">
              GitHub
            </ExternalLink>
            .
          </p>
          <p className="break-all sm:wrap-break-word">
            &copy; 2024 - {new Date().getFullYear()}{' '}
            <ExternalLink href="https://github.com/jalezi">
              github.com/jalezi
            </ExternalLink>
          </p>
        </div>
      </div>
    </footer>
  );
}

interface ExternalLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
}

function ExternalLink({ href, children, ...props }: ExternalLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="font-medium underline underline-offset-4"
      {...props}
    >
      {children}
    </a>
  );
}
