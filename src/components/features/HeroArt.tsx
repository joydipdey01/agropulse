/** Homepage hero video: plays like a background animation, with no player controls. */
export function HeroArt() {
  return (
    <div className="relative mx-auto aspect-[16/10] w-full max-w-lg overflow-hidden rounded-3xl border border-border bg-[#0b1716] shadow-pop">
      <video
        className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
        src="/joydip-agritech.mp4"
        poster="/agropulse-field.png"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        disablePictureInPicture
        disableRemotePlayback
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}
