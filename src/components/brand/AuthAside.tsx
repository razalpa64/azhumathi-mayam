import Image from 'next/image';

interface AuthAsideProps {
  headline: string;
  intro: string;
  items: { title: string; note: string }[];
}

/**
 * The dark editorial column on login / register.
 * One thought, then a short contents list — like the inside cover of a book.
 */
export function AuthAside({ headline, intro, items }: AuthAsideProps) {
  return (
    <aside className="hidden lg:flex lg:col-span-5 flex-col justify-between bg-burgundy-deep text-paper p-10 xl:p-14">
      <div>
        <div className="inline-flex items-center gap-3.5">
          <div className="relative h-12 w-12 overflow-hidden rounded-lg bg-burgundy-logo ring-1 ring-white/15">
            <Image
              src="/brand/logo.png"
              alt="അഴിമതി മയം"
              width={48}
              height={48}
              className="h-full w-full object-cover"
              priority
            />
          </div>
          <div className="leading-tight">
            <p className="font-malayalam text-xl font-bold">അഴിമതി മയം</p>
            <p className="text-xs text-paper/55">notes · syllabus · question papers</p>
          </div>
        </div>

        <h2 className="font-display mt-16 max-w-md text-[34px] font-medium leading-[1.15] xl:text-[38px]">
          {headline}
        </h2>
        <p className="mt-4 max-w-md text-[14.5px] leading-relaxed text-paper/70">{intro}</p>

        <ul className="mt-12 max-w-md divide-y divide-white/10 border-y border-white/10">
          {items.map((item, i) => (
            <li key={item.title} className="flex items-baseline gap-4 py-4">
              <span className="font-display text-sm text-paper/40">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <p className="text-[14.5px] font-semibold">{item.title}</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-paper/60">{item.note}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-14 flex items-center justify-between text-xs text-paper/45">
        <span className="font-malayalam font-semibold text-paper/70">അഴിമതി മയം</span>
        <span>for students, by semester</span>
      </p>
    </aside>
  );
}
