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

export const ChevronDownIcon = createIcon(<path d="m6 9 6 6 6-6" />);

export const MapPinIcon = createIcon(
  <>
    <path d="M12 21s7-6.5 7-11.5A7 7 0 0 0 5 9.5C5 14.5 12 21 12 21Z" />
    <circle cx="12" cy="9.5" r="2.2" />
  </>
);

export const ListIcon = createIcon(
  <>
    <path d="M8 6h13" />
    <path d="M8 12h13" />
    <path d="M8 18h13" />
    <path d="M3 6h.01" />
    <path d="M3 12h.01" />
    <path d="M3 18h.01" />
  </>
);

export const VideoIcon = createIcon(
  <>
    <rect x="3" y="6" width="12" height="12" rx="2" />
    <path d="m15 9.5 5-3v11l-5-3" />
  </>
);

export const LogOutIcon = createIcon(
  <>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </>
);

export const UserIcon = createIcon(
  <>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c1-3.5 3.8-6 7-6s6 2.5 7 6" />
  </>
);

export const BellIcon = createIcon(
  <>
    <path d="M6 8a6 6 0 0 1 12 0c0 3.3 1 5.3 2 6.5H4c1-1.2 2-3.2 2-6.5Z" />
    <path d="M9.5 18.5a2.5 2.5 0 0 0 5 0" />
  </>
);

export const AlertTriangleIcon = createIcon(
  <>
    <path d="M12 3.5 21 19.5H3L12 3.5Z" />
    <path d="M12 9.5v4" />
    <circle cx="12" cy="16.5" r="0.6" fill="currentColor" stroke="none" />
  </>
);

export const RefreshIcon = createIcon(
  <>
    <path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3" />
    <path d="M18 4v4h-4" />
    <path d="M6 20v-4h4" />
  </>
);

export const ArrowLeftIcon = createIcon(
  <>
    <path d="M19 12H5" />
    <path d="m11 18-6-6 6-6" />
  </>
);

export const PaperclipIcon = createIcon(
  <path d="M21 12.5 12.5 21a5 5 0 0 1-7-7L14 5.5a3.5 3.5 0 0 1 5 5L10.5 19a1.5 1.5 0 0 1-2-2l7-7" />
);

export const MessageSquareIcon = createIcon(
  <path d="M4 4h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H9l-5 4v-4H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" />
);

export const HistoryIcon = createIcon(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5v4.5l3.2 2" />
    <path d="M4.2 8.5 3 4.5" />
    <path d="M3 4.5 7 5.5" />
  </>
);
