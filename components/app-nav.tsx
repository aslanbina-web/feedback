import Link from "next/link";

export function AppNav() {
  return (
    <nav className="nav" aria-label="Main navigation">
      <Link href="/">Home</Link>
      <Link href="/discover">Discover</Link>
      <Link href="/queue">Tasks</Link>
      <Link href="/history">History</Link>
      <Link href="/profile">My Card</Link>
    </nav>
  );
}
