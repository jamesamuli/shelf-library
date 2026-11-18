import Image from "next/image";
import logo from "@/public/efb-logo.png";

/**
 * The school's own mark, shown beside the Shelf lockup. The source PNG is
 * 1352 px and ~900 KB; a static import lets next/image serve a resized copy
 * sized to `className`, so the header never downloads the original.
 */
export function EfbLogo({ className = "size-14" }: { className?: string }) {
  return (
    <Image
      src={logo}
      alt="École Française de Bujumbura"
      sizes="128px"
      className={`${className} shrink-0 rounded-full`}
    />
  );
}
