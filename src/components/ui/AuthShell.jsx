const LOGO = "https://ik.imagekit.io/ny6yinyut/cosmosgenLogo/cosmosgen-logo.png?updatedAt=1788413075959";

/**
 * The frame every sign-in and sign-up screen sits in.
 *
 * The five auth screens each had their own idea of what a login looked like -
 * one on near-black, one on slate, one split down the middle - so which door
 * you came through changed what the company appeared to be. They share this
 * now: paper, one card, the lockup above it, and the role named plainly so
 * nobody signs in at the wrong door.
 *
 * The faint wash behind the card is a single radial, not a gradient across
 * the page. It gives the card something to sit on without the screen turning
 * into decoration.
 */
const AuthShell = ({ role, title, subtitle, children, footer, width = "sm" }) => (
    <div className="relative min-h-screen flex items-center justify-center bg-canvas px-4 py-10 overflow-hidden">
        <div
            aria-hidden
            className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-[520px] w-[820px] rounded-full opacity-70"
            style={{ background: "radial-gradient(closest-side, #eaf3fc, transparent)" }}
        />

        <div className={"relative w-full " + (width === "lg" ? "max-w-2xl" : width === "md" ? "max-w-md" : "max-w-sm")}>
            <div className="flex items-center justify-center gap-2.5 mb-7">
                <img src={LOGO} alt="Cosmosgen" className="h-8" />
                <div className="flex flex-col">
                    <span className="font-display font-semibold text-[17px] tracking-tight leading-none text-ink">
                        Cosmosgen
                    </span>
                    <span className="text-[9px] text-ink-faint uppercase tracking-[0.16em] leading-none mt-1">
                        Engineers Pvt. Ltd.
                    </span>
                </div>
            </div>

            <div className="cg-lift px-7 py-8 sm:px-9 sm:py-10">
                {role && (
                    <span className="cg-pill bg-sunken text-ink-soft uppercase tracking-[0.1em] mb-5">
                        {role}
                    </span>
                )}

                {title && <h1 className="cg-h1 mb-1.5">{title}</h1>}
                {subtitle && <p className="cg-sub mb-7">{subtitle}</p>}

                {children}
            </div>

            {footer && <div className="mt-6 text-center">{footer}</div>}
        </div>
    </div>
);

export default AuthShell;
