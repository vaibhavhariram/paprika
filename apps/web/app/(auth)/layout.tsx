import Link from "next/link";
import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mb-8">
        <Link href="/" className="flex items-center gap-2 text-xl tracking-tight">
          <Image src="/logo.svg" alt="" width={32} height={14} className="h-6 w-auto" />
          Paprika
        </Link>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
