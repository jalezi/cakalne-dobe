import Link from 'next/link';
import { ThemeToggler } from './theme-toggler';
import { Button } from './ui/button';

export function Header() {
  return (
    <header className="sticky top-0 left-0 z-50 flex items-center bg-transparent p-4 backdrop-blur-lg">
      <Button
        render={<Link href="/" aria-current="page" />}
        variant="link"
        className="px-0"
      >
        Domov
      </Button>
      <div className="ml-auto flex items-center">
        <ThemeToggler className="ml-2 aspect-square" />
      </div>
    </header>
  );
}
