/**
 * The print view escapes the app shell.
 *
 * A sidebar and topbar around a document that is about to be printed is noise
 * on screen and, if any print CSS were missed, ink on paper. This layout
 * renders the page bare.
 */
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-white text-black">{children}</div>;
}
