import type { ReactNode, SVGProps } from "react";

function createIcon(path: ReactNode) {
  return function IconComponent(props: SVGProps<SVGSVGElement>) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
        {...props}
      >
        {path}
      </svg>
    );
  };
}

export const HomeIcon = createIcon(
  <>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
  </>
);

export const FolderIcon = createIcon(
  <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
);

export const CheckSquareIcon = createIcon(
  <>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="m8 12 3 3 5-6" />
  </>
);

export const UsersIcon = createIcon(
  <>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 19c.6-3 3-5 5.5-5s4.9 2 5.5 5" />
    <circle cx="17" cy="9" r="2.6" />
    <path d="M15.5 19c.4-2.2 1.7-3.9 3.5-4.6" />
  </>
);

export const LockIcon = createIcon(
  <>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
    <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
  </>
);

export const MenuIcon = createIcon(
  <>
    <path d="M4 6h16" />
    <path d="M4 12h16" />
    <path d="M4 18h16" />
  </>
);

export const XIcon = createIcon(
  <>
    <path d="M6 6l12 12" />
    <path d="M18 6 6 18" />
  </>
);

export const SearchIcon = createIcon(
  <>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-3.6-3.6" />
  </>
);

export const PlusIcon = createIcon(<path d="M12 5v14M5 12h14" />);

export const MoreVerticalIcon = createIcon(
  <>
    <circle cx="12" cy="5" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="12" cy="19" r="1.2" fill="currentColor" stroke="none" />
  </>
);

export const TrashIcon = createIcon(
  <>
    <path d="M4 7h16" />
    <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
  </>
);

export const PencilIcon = createIcon(
  <>
    <path d="M4 20h4L20 8l-4-4L4 16v4Z" />
    <path d="M13.5 6.5 17.5 10.5" />
  </>
);

export const CalendarIcon = createIcon(
  <>
    <rect x="3.5" y="5" width="17" height="16" rx="2" />
    <path d="M16 3v4M8 3v4M3.5 10h17" />
  </>
);

export const ClockIcon = createIcon(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 8v4l3 2" />
  </>
);

export const TargetIcon = createIcon(
  <>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="4.2" />
    <circle cx="12" cy="12" r="0.8" fill="currentColor" stroke="none" />
  </>
);

export const InboxIcon = createIcon(
  <>
    <path d="M4 12h4l1.5 3h5L16 12h4" />
    <path d="M5.5 6h13L20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6l1.5-6Z" />
  </>
);

export const ChevronRightIcon = createIcon(<path d="m9 6 6 6-6 6" />);
