/** Homepage hero video supplied for the AgroPulse project. */
export function HeroArt() {
  return (
    <div className="relative mx-auto aspect-[16/10] w-full max-w-lg overflow-hidden rounded-3xl border border-border bg-[#0b1716] shadow-pop">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        src="/joydip-agritech.mp4"
        poster="/agropulse-field.png"
        autoPlay
        muted
        loop
        playsInline
        controls
        preload="metadata"
        aria-label="AgroPulse agriculture showcase video"
      />
    </div>
  );
}
