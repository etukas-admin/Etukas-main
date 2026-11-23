import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

type AccountSubPageHeaderProps = {
  title: string;
  subtitle?: string;
  backTo?: string;
  rightSlot?: ReactNode;
};

export function AccountSubPageHeader({
  title,
  subtitle,
  backTo,
  rightSlot
}: AccountSubPageHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
      return;
    }
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/customer");
    }
  };

  return (
    <div className="sticky top-0 z-30 border-b border-gray-200/80 bg-white/95 backdrop-blur md:top-16">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            aria-label="Go back"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-etukas-black transition hover:bg-etukas-pink hover:text-etukas-red active:scale-95"
          >
            <ArrowLeft size={20} strokeWidth={2.3} />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-extrabold tracking-tight text-etukas-black sm:text-xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="truncate text-[11px] font-medium text-gray-500">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
      </div>
    </div>
  );
}
