"use client";

import { useEffect } from "react";

export default function Home() {
  useEffect(() => {
    // ── Count-up with easing ──
    function countUp(
      el: HTMLElement,
      target: number,
      prefix: string,
      suffix: string,
      duration: number,
      from?: number
    ) {
      const start = performance.now();
      const startVal = from || 0;
      const isFloat = String(target).includes(".");
      function tick(now: number) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const current = isFloat
          ? (startVal + (target - startVal) * eased).toFixed(1)
          : Math.floor(startVal + (target - startVal) * eased).toLocaleString();
        el.textContent = prefix + current + suffix;
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }

    // ── Scroll observer: sections ──
    const sectionObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in-view");
          }
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll(".reveal").forEach((el) => sectionObs.observe(el));

    // ── Scroll observer: staggered children ──
    const childObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const children = e.target.querySelectorAll(
            ".type-item, .step, .faq-item"
          );
          children.forEach((child, i) => {
            (child as HTMLElement).style.transitionDelay = i * 0.07 + "s";
            child.classList.add("in-view");
          });
          childObs.unobserve(e.target);
        });
      },
      { threshold: 0.1 }
    );
    document
      .querySelectorAll(".types-grid, .steps, .faq-list")
      .forEach((el) => childObs.observe(el));

    // ── Two-sided cards slide in ──
    const sideObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.querySelectorAll(".side").forEach((side, i) => {
            (side as HTMLElement).style.transitionDelay = i * 0.15 + "s";
            side.classList.add("in-view");
          });
          sideObs.unobserve(e.target);
        });
      },
      { threshold: 0.15 }
    );
    document
      .querySelectorAll(".two-sided-grid")
      .forEach((el) => sideObs.observe(el));

    // ── Prize count-up + metric pop ──
    const prizeEl = document.querySelector(".challenge-prize") as HTMLElement | null;
    if (prizeEl) {
      prizeEl.textContent = "$100";
      setTimeout(() => {
        countUp(prizeEl, 10000, "$", "", 2000, 100);
        const metrics = document.querySelectorAll(".metric-value");
        metrics.forEach((m, i) => {
          setTimeout(() => {
            m.classList.add("counted");
            if (i === 0) countUp(m as HTMLElement, 3.2, "", "%", 1200);
            if (i === 1) countUp(m as HTMLElement, 5000, "", "", 1400);
            if (i === 2) (m as HTMLElement).textContent = "14d";
          }, 600 + i * 300);
        });
        setTimeout(() => prizeEl.classList.add("prize-counted"), 2100);
      }, 300);
    }

    // ── Smooth scroll for anchors ──
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener("click", (e) => {
        const href = a.getAttribute("href");
        if (href) {
          const t = document.querySelector(href);
          if (t) {
            e.preventDefault();
            t.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }
      });
    });

    // Cleanup
    return () => {
      sectionObs.disconnect();
      childObs.disconnect();
      sideObs.disconnect();
    };
  }, []);

  return (
    <>
      {/* NAV */}
      <nav>
        <div className="nav-inner">
          <div className="logo">Beat My Funnel</div>
          <div className="nav-links">
            <a href="#get-started" className="nav-cta">
              Post a Challenge
            </a>
            <a href="#get-started" className="nav-cta">
              Enter a Challenge
            </a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="container">
          <p className="hero-eyebrow hero-anim hero-anim-1">Private Beta</p>

          <h1 className="hero-anim hero-anim-2">
            Don&apos;t pitch for the work.
            <br />
            Win it.
          </h1>

          <p className="hero-sub hero-anim hero-anim-3">
            Beat My Funnel is a performance marketplace where brands post
            challenges and operators compete to prove they&apos;re better.
            Winners get paid — and often get the client.
          </p>

          {/* Pill slider */}
          <div className="pill-slider hero-anim hero-anim-4">
            <div className="pill-track">
              <span
                className="pill"
                style={
                  {
                    "--pill-clr": "#4ea7fc",
                    "--pill-bg": "rgba(78,167,252,0.06)",
                  } as React.CSSProperties
                }
              >
                <span className="pill-icon">📄</span> Landing Pages
              </span>
              <span
                className="pill"
                style={
                  {
                    "--pill-clr": "#fc7840",
                    "--pill-bg": "rgba(252,120,64,0.06)",
                  } as React.CSSProperties
                }
              >
                <span className="pill-icon">🎨</span> Ad Creative
              </span>
              <span
                className="pill"
                style={
                  {
                    "--pill-clr": "#f0bf00",
                    "--pill-bg": "rgba(240,191,0,0.06)",
                  } as React.CSSProperties
                }
              >
                <span className="pill-icon">✉️</span> Email Flows
              </span>
              <span
                className="pill"
                style={
                  {
                    "--pill-clr": "#27a644",
                    "--pill-bg": "rgba(39,166,68,0.06)",
                  } as React.CSSProperties
                }
              >
                <span className="pill-icon">💰</span> Pricing Pages
              </span>
              <span
                className="pill"
                style={
                  {
                    "--pill-clr": "#00b8cc",
                    "--pill-bg": "rgba(0,184,204,0.06)",
                  } as React.CSSProperties
                }
              >
                <span className="pill-icon">🏠</span> Homepage
              </span>
              <span
                className="pill"
                style={
                  {
                    "--pill-clr": "#5e6ad2",
                    "--pill-bg": "rgba(94,106,210,0.06)",
                  } as React.CSSProperties
                }
              >
                <span className="pill-icon">📈</span> ROAS
              </span>
              <span
                className="pill"
                style={
                  {
                    "--pill-clr": "#eb5757",
                    "--pill-bg": "rgba(235,87,87,0.06)",
                  } as React.CSSProperties
                }
              >
                <span className="pill-icon">🎯</span> CVR
              </span>
              <span
                className="pill"
                style={
                  {
                    "--pill-clr": "#4ea7fc",
                    "--pill-bg": "rgba(78,167,252,0.06)",
                  } as React.CSSProperties
                }
              >
                <span className="pill-icon">💵</span> CPA
              </span>
              <span
                className="pill"
                style={
                  {
                    "--pill-clr": "#fc7840",
                    "--pill-bg": "rgba(252,120,64,0.06)",
                  } as React.CSSProperties
                }
              >
                <span className="pill-icon">📬</span> Open Rate
              </span>
              <span
                className="pill"
                style={
                  {
                    "--pill-clr": "#00b8cc",
                    "--pill-bg": "rgba(0,184,204,0.06)",
                  } as React.CSSProperties
                }
              >
                <span className="pill-icon">🛒</span> Add to Cart
              </span>
              <span
                className="pill"
                style={
                  {
                    "--pill-clr": "#5e6ad2",
                    "--pill-bg": "rgba(94,106,210,0.06)",
                  } as React.CSSProperties
                }
              >
                <span className="pill-icon">💳</span> Checkout
              </span>
              <span
                className="pill"
                style={
                  {
                    "--pill-clr": "#27a644",
                    "--pill-bg": "rgba(39,166,68,0.06)",
                  } as React.CSSProperties
                }
              >
                <span className="pill-icon">⚡</span> A/B Test
              </span>
              {/* duplicate for seamless loop */}
              <span
                className="pill"
                style={
                  {
                    "--pill-clr": "#4ea7fc",
                    "--pill-bg": "rgba(78,167,252,0.06)",
                  } as React.CSSProperties
                }
              >
                <span className="pill-icon">📄</span> Landing Pages
              </span>
              <span
                className="pill"
                style={
                  {
                    "--pill-clr": "#fc7840",
                    "--pill-bg": "rgba(252,120,64,0.06)",
                  } as React.CSSProperties
                }
              >
                <span className="pill-icon">🎨</span> Ad Creative
              </span>
              <span
                className="pill"
                style={
                  {
                    "--pill-clr": "#f0bf00",
                    "--pill-bg": "rgba(240,191,0,0.06)",
                  } as React.CSSProperties
                }
              >
                <span className="pill-icon">✉️</span> Email Flows
              </span>
              <span
                className="pill"
                style={
                  {
                    "--pill-clr": "#27a644",
                    "--pill-bg": "rgba(39,166,68,0.06)",
                  } as React.CSSProperties
                }
              >
                <span className="pill-icon">💰</span> Pricing Pages
              </span>
              <span
                className="pill"
                style={
                  {
                    "--pill-clr": "#00b8cc",
                    "--pill-bg": "rgba(0,184,204,0.06)",
                  } as React.CSSProperties
                }
              >
                <span className="pill-icon">🏠</span> Homepage
              </span>
              <span
                className="pill"
                style={
                  {
                    "--pill-clr": "#5e6ad2",
                    "--pill-bg": "rgba(94,106,210,0.06)",
                  } as React.CSSProperties
                }
              >
                <span className="pill-icon">📈</span> ROAS
              </span>
              <span
                className="pill"
                style={
                  {
                    "--pill-clr": "#eb5757",
                    "--pill-bg": "rgba(235,87,87,0.06)",
                  } as React.CSSProperties
                }
              >
                <span className="pill-icon">🎯</span> CVR
              </span>
              <span
                className="pill"
                style={
                  {
                    "--pill-clr": "#4ea7fc",
                    "--pill-bg": "rgba(78,167,252,0.06)",
                  } as React.CSSProperties
                }
              >
                <span className="pill-icon">💵</span> CPA
              </span>
              <span
                className="pill"
                style={
                  {
                    "--pill-clr": "#fc7840",
                    "--pill-bg": "rgba(252,120,64,0.06)",
                  } as React.CSSProperties
                }
              >
                <span className="pill-icon">📬</span> Open Rate
              </span>
              <span
                className="pill"
                style={
                  {
                    "--pill-clr": "#00b8cc",
                    "--pill-bg": "rgba(0,184,204,0.06)",
                  } as React.CSSProperties
                }
              >
                <span className="pill-icon">🛒</span> Add to Cart
              </span>
              <span
                className="pill"
                style={
                  {
                    "--pill-clr": "#5e6ad2",
                    "--pill-bg": "rgba(94,106,210,0.06)",
                  } as React.CSSProperties
                }
              >
                <span className="pill-icon">💳</span> Checkout
              </span>
              <span
                className="pill"
                style={
                  {
                    "--pill-clr": "#27a644",
                    "--pill-bg": "rgba(39,166,68,0.06)",
                  } as React.CSSProperties
                }
              >
                <span className="pill-icon">⚡</span> A/B Test
              </span>
            </div>
          </div>

          {/* THE LIVE CHALLENGE CARD */}
          <div className="challenge-card hero-anim hero-anim-5">
            <div className="challenge-header">
              <div className="challenge-status">
                <div className="status-dot"></div>
                <span style={{ color: "var(--accent)" }}>Live</span>
              </div>
              <span className="challenge-type">Landing Page CVR</span>
            </div>

            <div className="challenge-body">
              <div className="challenge-prize">$10,000</div>
              <div className="challenge-label">
                Prize in escrow — verified via Shopify
              </div>

              <div className="challenge-metrics">
                <div className="metric">
                  <div className="metric-value">3.2%</div>
                  <div className="metric-label">Current CVR</div>
                </div>
                <div className="metric">
                  <div className="metric-value">5,000</div>
                  <div className="metric-label">Sessions</div>
                </div>
                <div className="metric">
                  <div className="metric-value">14d</div>
                  <div className="metric-label">Time Left</div>
                </div>
              </div>
            </div>

            <div className="challenge-footer">
              <div className="escrow-status">
                <svg
                  className="escrow-icon"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                Funds locked in escrow
              </div>
              <span className="entries-count">3 entries</span>
            </div>
          </div>

          {/* CTA */}
          <div className="hero-cta-group hero-anim hero-anim-6">
            <div className="dual-cta">
              <div className="cta-path">
                <a href="#get-started" className="btn-primary">
                  Post a Challenge
                </a>
                <span className="cta-micro">For brands &amp; founders</span>
              </div>
              <div className="cta-path">
                <a href="#get-started" className="btn-secondary">
                  Enter a Challenge
                </a>
                <span className="cta-micro">For operators &amp; builders</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <hr className="divider" />

      {/* PROBLEM */}
      <section className="problem reveal">
        <div className="container">
          <h2>The way performance work gets hired is broken.</h2>
          <p>
            Brands pay retainers before seeing a single result. Operators pitch
            with decks instead of proof. Everyone loses except the agencies.
          </p>
          <p>
            Beat My Funnel flips it — you set the bar, you only pay if someone
            clears it.
          </p>
          <p className="kicker kicker-accent">
            Trust isn&apos;t a handshake — it&apos;s $10,000 in escrow.
          </p>
        </div>
      </section>

      <hr className="divider" />

      {/* MANIFESTO */}
      <section className="manifesto reveal">
        <div className="container">
          <div className="manifesto-inner">
            <h2>A new wave of work is coming.</h2>
            <p className="manifesto-body">The pitch deck era is over.</p>
            <p className="manifesto-body">
              The best operators in the world shouldn&apos;t have to sell
              themselves with decks and proposals. They should prove it with
              results.
            </p>
            <p className="manifesto-body">
              And the best brands shouldn&apos;t have to gamble on retainers.
              They should pay for performance.
            </p>
            <p className="manifesto-body">
              Beat My Funnel is how the next generation of operators breaks in —
              and how smart brands find the talent everyone else missed.
            </p>
            <p className="manifesto-kicker">Show your work. Win the room.</p>
          </div>
        </div>
      </section>

      <hr className="divider" />

      {/* SOCIAL PROOF */}
      <section className="social-proof reveal">
        <div className="container">
          <div className="social-proof-header">
            <p className="section-label">This is already happening</p>
            <h2>
              Founders are already doing this.
              <br />
              We&apos;re building the home for it.
            </h2>
          </div>

          {/* Featured challenge tweets */}
          <div className="featured-tweets">
            <div className="featured-tweet">
              <div className="featured-tweet-header">
                <div className="featured-tweet-avatar">J</div>
                <div className="featured-tweet-author">
                  <div className="featured-tweet-name">Jacob</div>
                  <div className="featured-tweet-handle">@jforjacob</div>
                </div>
                <span className="featured-tweet-badge">$15k Challenge</span>
              </div>
              <p className="featured-tweet-body">
                Will pay any landing page builder <strong>$15k</strong> if they
                can beat the performance of our current main landing page (which
                is a pdp)
                <br />
                <br />
                Can be any style you wish (listicle, advertorial, sales page,
                pdp)
                <br />
                <br />
                If it doesn&apos;t beat our current page I will pay{" "}
                <strong>$0</strong>
                <br />
                <br />
                If your up for it, dm me
              </p>
              <div className="featured-tweet-stats">
                <span>233 likes</span>
                <span>73 replies</span>
              </div>
              <p className="featured-tweet-date">Feb 27, 2026</p>
            </div>

            <div className="featured-tweet">
              <div className="featured-tweet-header">
                <div className="featured-tweet-avatar">Z</div>
                <div className="featured-tweet-author">
                  <div className="featured-tweet-name">Zach Stuck</div>
                  <div className="featured-tweet-handle">@zachmstuck</div>
                </div>
                <span className="featured-tweet-badge">$30k Challenge</span>
              </div>
              <p className="featured-tweet-body">
                Well @jforjacob offered $15k, so I&apos;ll offer double.
                <br />
                <br />
                <strong>$30k</strong> to whoever can beat our top compression
                sock funnel for HollowSocks.com
                <br />
                <br />
                If your page can hit 100k sessions at a higher Northbeam
                1DCROAS, the money is yours.
                <br />
                <br />
                Could be as simple as a lander or pdp update.
              </p>
              <div className="featured-tweet-stats">
                <span>152 likes</span>
                <span>34 replies</span>
              </div>
              <p className="featured-tweet-date">Mar 21, 2026</p>
            </div>
          </div>

          {/* Operator responses */}
          <div className="responses-section">
            <p className="responses-label">The operators responded</p>
            <div className="marquee-container">
              <div className="marquee-row marquee-row--left">
                <div className="marquee-card">
                  <div className="marquee-avatar marquee-avatar--accent">B</div>
                  <div>
                    <span className="marquee-name">Brandon Doyle</span>
                    <span className="marquee-handle">@Brandondoyle</span>
                  </div>
                  <span className="marquee-text">
                    &quot;I&apos;m ready Jacob!&quot;
                  </span>
                </div>
                <div className="marquee-card">
                  <div className="marquee-avatar marquee-avatar--accent">J</div>
                  <div>
                    <span className="marquee-name">Jason Applebaum</span>
                    <span className="marquee-handle">@Jason______A</span>
                  </div>
                  <span className="marquee-text">
                    &quot;I love this!&quot;
                  </span>
                </div>
                <div className="marquee-card">
                  <div className="marquee-avatar marquee-avatar--accent">D</div>
                  <div>
                    <span className="marquee-name">Dave</span>
                    <span className="marquee-handle">@DaveDiederen</span>
                  </div>
                  <span className="marquee-text">
                    &quot;Let&apos;s freaking get it! Just messaged 🙏🏽&quot;
                  </span>
                </div>
                <div className="marquee-card">
                  <div className="marquee-avatar marquee-avatar--accent">S</div>
                  <div>
                    <span className="marquee-name">Stefan Georgi</span>
                    <span className="marquee-handle">@StefanGeorgi</span>
                  </div>
                  <span className="marquee-text">
                    &quot;I&apos;ll take a crack&quot;
                  </span>
                </div>
                {/* duplicate for seamless loop */}
                <div className="marquee-card">
                  <div className="marquee-avatar marquee-avatar--accent">B</div>
                  <div>
                    <span className="marquee-name">Brandon Doyle</span>
                    <span className="marquee-handle">@Brandondoyle</span>
                  </div>
                  <span className="marquee-text">
                    &quot;I&apos;m ready Jacob!&quot;
                  </span>
                </div>
                <div className="marquee-card">
                  <div className="marquee-avatar marquee-avatar--accent">J</div>
                  <div>
                    <span className="marquee-name">Jason Applebaum</span>
                    <span className="marquee-handle">@Jason______A</span>
                  </div>
                  <span className="marquee-text">
                    &quot;I love this!&quot;
                  </span>
                </div>
                <div className="marquee-card">
                  <div className="marquee-avatar marquee-avatar--accent">D</div>
                  <div>
                    <span className="marquee-name">Dave</span>
                    <span className="marquee-handle">@DaveDiederen</span>
                  </div>
                  <span className="marquee-text">
                    &quot;Let&apos;s freaking get it! Just messaged 🙏🏽&quot;
                  </span>
                </div>
                <div className="marquee-card">
                  <div className="marquee-avatar marquee-avatar--accent">S</div>
                  <div>
                    <span className="marquee-name">Stefan Georgi</span>
                    <span className="marquee-handle">@StefanGeorgi</span>
                  </div>
                  <span className="marquee-text">
                    &quot;I&apos;ll take a crack&quot;
                  </span>
                </div>
              </div>
              <div className="marquee-row marquee-row--right">
                <div className="marquee-card">
                  <div className="marquee-avatar marquee-avatar--green">B</div>
                  <div>
                    <span className="marquee-name">Brandon Doyle</span>
                    <span className="marquee-handle">@Brandondoyle</span>
                  </div>
                  <span className="marquee-text">
                    &quot;I&apos;d love to try&quot;
                  </span>
                </div>
                <div className="marquee-card">
                  <div className="marquee-avatar marquee-avatar--green">D</div>
                  <div>
                    <span className="marquee-name">Daniel</span>
                    <span className="marquee-handle">@DanielDoor8</span>
                  </div>
                  <span className="marquee-text">
                    &quot;Interested&quot;
                  </span>
                </div>
                <div className="marquee-card">
                  <div className="marquee-avatar marquee-avatar--green">P</div>
                  <div>
                    <span className="marquee-name">Paddy</span>
                    <span className="marquee-handle">@paddymedia</span>
                  </div>
                  <span className="marquee-text">
                    &quot;Messaged&quot;
                  </span>
                </div>
                <div className="marquee-card">
                  <div className="marquee-avatar marquee-avatar--green">T</div>
                  <div>
                    <span className="marquee-name">The Funnel Professor</span>
                    <span className="marquee-handle">@DTC_Quizbuilder</span>
                  </div>
                  <span className="marquee-text">&quot;🧡&quot;</span>
                </div>
                {/* duplicate for seamless loop */}
                <div className="marquee-card">
                  <div className="marquee-avatar marquee-avatar--green">B</div>
                  <div>
                    <span className="marquee-name">Brandon Doyle</span>
                    <span className="marquee-handle">@Brandondoyle</span>
                  </div>
                  <span className="marquee-text">
                    &quot;I&apos;d love to try&quot;
                  </span>
                </div>
                <div className="marquee-card">
                  <div className="marquee-avatar marquee-avatar--green">D</div>
                  <div>
                    <span className="marquee-name">Daniel</span>
                    <span className="marquee-handle">@DanielDoor8</span>
                  </div>
                  <span className="marquee-text">
                    &quot;Interested&quot;
                  </span>
                </div>
                <div className="marquee-card">
                  <div className="marquee-avatar marquee-avatar--green">P</div>
                  <div>
                    <span className="marquee-name">Paddy</span>
                    <span className="marquee-handle">@paddymedia</span>
                  </div>
                  <span className="marquee-text">
                    &quot;Messaged&quot;
                  </span>
                </div>
                <div className="marquee-card">
                  <div className="marquee-avatar marquee-avatar--green">T</div>
                  <div>
                    <span className="marquee-name">The Funnel Professor</span>
                    <span className="marquee-handle">@DTC_Quizbuilder</span>
                  </div>
                  <span className="marquee-text">&quot;🧡&quot;</span>
                </div>
              </div>
            </div>
          </div>

          <p className="social-proof-kicker">
            $45,000 in public challenges posted this week — with no platform, no
            escrow, and no verification. Until now.
          </p>
        </div>
      </section>

      <hr className="divider" />

      {/* HOW IT WORKS */}
      <section className="how-it-works reveal">
        <div className="container">
          <p className="section-label">How it works</p>
          <h2>Three steps. You only pay if you lose.</h2>

          <div className="steps">
            <div className="step">
              <p className="step-number">Step 01</p>
              <h3>Post your challenge</h3>
              <p>
                Define your metric, set your prize, deposit funds into escrow.
                Your money is locked until the challenge resolves — no
                exceptions.
              </p>
            </div>
            <div className="step">
              <p className="step-number">Step 02</p>
              <h3>The best operators compete</h3>
              <p>
                CRO experts, copywriters, and funnel builders submit their
                version. You review entries before anything goes live.
              </p>
            </div>
            <div className="step">
              <p className="step-number">Step 03</p>
              <h3>Winner gets paid. Often gets the client.</h3>
              <p>
                We verify the result via your Shopify or GA4 data. If they beat
                you, the prize transfers automatically. The best brands go
                further — they hire the winner.
              </p>
            </div>
          </div>
        </div>
      </section>

      <hr className="divider" />

      {/* CHALLENGE TYPES */}
      <section className="challenge-types reveal">
        <div className="container">
          <p className="section-label">Challenge types</p>
          <h2>What can you put up for a challenge?</h2>
          <p className="section-sub">
            Every challenge has a preset win condition defined before anyone
            starts. No ambiguity. No disputes.
          </p>

          <div className="types-grid">
            <div className="type-item">
              <p className="type-name">Landing Page / Funnel</p>
              <p className="type-metric">Beat my CVR at X sessions</p>
            </div>
            <div className="type-item">
              <p className="type-name">Ad Creative</p>
              <p className="type-metric">Beat my CPA or ROAS at $X spend</p>
            </div>
            <div className="type-item">
              <p className="type-name">Email</p>
              <p className="type-metric">
                Beat my open + click rate on the same segment
              </p>
            </div>
            <div className="type-item">
              <p className="type-name">Homepage</p>
              <p className="type-metric">
                Beat my add-to-cart rate at X sessions
              </p>
            </div>
            <div className="type-item">
              <p className="type-name">Pricing Page</p>
              <p className="type-metric">
                Beat my checkout conversion at X sessions
              </p>
            </div>
          </div>
        </div>
      </section>

      <hr className="divider" />

      {/* TWO-SIDED VALUE */}
      <section id="get-started" className="two-sided reveal">
        <div className="container">
          <p className="section-label">Get started</p>
          <h2 className="two-sided-headline">Which side are you on?</h2>
          <div className="two-sided-grid">
            <div className="side brand-side">
              <p className="side-label brand">For Brands &amp; Founders</p>
              <h3>Stop hiring on pitch decks. Hire on proof.</h3>
              <p className="side-body">
                The operator who beats your challenge just proved they&apos;re
                better than whoever you&apos;re paying right now. That&apos;s
                your next hire.
              </p>
              <ul>
                <li>
                  <span className="check">✓</span> Define the metric and win
                  condition
                </li>
                <li>
                  <span className="check">✓</span> Funds locked in escrow from
                  day one
                </li>
                <li>
                  <span className="check">✓</span> Review every submission
                  before it goes live
                </li>
                <li>
                  <span className="check">✓</span> Full refund if nobody beats
                  your numbers
                </li>
                <li>
                  <span className="check">✓</span> Find your next great
                  operator in the process
                </li>
              </ul>
              <button
                className="btn-side btn-side-brand"
                data-tf-popup="QdRhZ5Ik"
                data-tf-size="70"
                data-tf-medium="snippet"
              >
                Post a Challenge
              </button>
              <p className="side-trust">
                Free to post. You only pay if someone beats your numbers.
              </p>
            </div>

            <div className="side operator-side">
              <p className="side-label operator">
                For CRO Experts &amp; Operators
              </p>
              <h3>Your results are your resume.</h3>
              <p className="side-body">
                You can&apos;t get a meeting with a $30M brand. But you can beat
                their funnel — and let the numbers speak for you.
              </p>
              <ul>
                <li>
                  <span className="check">✓</span> Browse open challenges with
                  guaranteed payouts
                </li>
                <li>
                  <span className="check">✓</span> Compete on real metrics, not
                  pitches
                </li>
                <li>
                  <span className="check">✓</span> Build a verified win record
                  brands can actually trust
                </li>
                <li>
                  <span className="check">✓</span> Get paid automatically when
                  you win
                </li>
                <li>
                  <span className="check">✓</span> Win the challenge. Land the
                  client.
                </li>
              </ul>
              <button
                className="btn-side btn-side-operator"
                data-tf-popup="nuvgiyXg"
                data-tf-size="70"
                data-tf-medium="snippet"
              >
                Enter a Challenge
              </button>
              <p className="side-trust">
                Free to enter. The full prize amount is yours if you win.
              </p>
            </div>
          </div>
        </div>
      </section>

      <hr className="divider" />

      {/* FAQ */}
      <section className="faq reveal">
        <div className="container">
          <h2>Questions</h2>

          <div className="faq-list">
            <details className="faq-item" open>
              <summary>
                What is Beat My Funnel? <span className="icon">+</span>
              </summary>
              <div className="answer">
                A performance marketplace where brands post challenges with real
                money in escrow. Operators compete to beat the brand&apos;s
                current metrics. Winners get paid automatically — and the best
                brands hire the winner. No pitch decks. No retainers. Just
                results.
              </div>
            </details>

            <details className="faq-item">
              <summary>
                How do challenges work? <span className="icon">+</span>
              </summary>
              <div className="answer">
                Brand defines a metric and current baseline (e.g. 3.2% CVR).
                Sets a prize and deposits it into escrow. Operators apply and
                submit their version. The platform verifies results via Shopify
                or GA4. If someone beats the baseline at the minimum traffic
                threshold, the prize releases automatically.
              </div>
            </details>

            <details className="faq-item">
              <summary>
                How does escrow work? <span className="icon">+</span>
              </summary>
              <div className="answer">
                Funds are held by the platform from the moment a challenge goes
                live. The brand cannot withdraw them during the challenge window.
                If nobody beats the baseline, the full prize is refunded. If
                someone wins, the prize transfers automatically upon
                verification.
              </div>
            </details>

            <details className="faq-item">
              <summary>
                How are results verified? <span className="icon">+</span>
              </summary>
              <div className="answer">
                We connect directly to your Shopify store or GA4 account via
                OAuth — read-only access, no changes ever made. The platform
                reads CVR, sessions, and conversion data directly. No
                screenshots. No self-reported numbers.
              </div>
            </details>

            <details className="faq-item">
              <summary>
                What types of challenges can I post?{" "}
                <span className="icon">+</span>
              </summary>
              <div className="answer">
                Landing pages, ad creative, email flows, homepages, pricing
                pages — anything with a measurable metric.
              </div>
            </details>

            <details className="faq-item">
              <summary>
                What does it cost? <span className="icon">+</span>
              </summary>
              <div className="answer">
                Free to post. Free to enter. We take 15% of the prize on top of
                the payout when a challenge is won — charged to the brand.
                Operators always receive the full advertised prize.
              </div>
            </details>

            <details className="faq-item">
              <summary>
                How do submissions work? Isn&apos;t this spec work?{" "}
                <span className="icon">+</span>
              </summary>
              <div className="answer">
                No. This isn&apos;t open entry where 20 people build blindly.
                Operators apply with a quick pitch — who they are, relevant wins,
                why they&apos;d beat it. The brand selects 3–5 finalists. Only
                finalists build and submit. That&apos;s a real competition with
                real odds, not a lottery.
              </div>
            </details>

            <details className="faq-item">
              <summary>
                What do non-winners get? <span className="icon">+</span>
              </summary>
              <div className="answer">
                Every finalist submission — win or lose — becomes a verified
                public entry on your operator profile. Finalists who don&apos;t
                win earn a &quot;Shortlisted&quot; badge. The brand is required
                to leave written feedback on every submission. And brands can
                reach out to hire any finalist directly through the platform —
                your best work doesn&apos;t go to waste.
              </div>
            </details>

            <details className="faq-item">
              <summary>
                How does the application process work?{" "}
                <span className="icon">+</span>
              </summary>
              <div className="answer">
                Brand posts a challenge. Operators apply for free — a quick pitch
                covering their background, relevant wins, and why they&apos;d
                beat the current metrics. The brand reviews applications and
                selects 3–5 finalists. Only those finalists build and submit
                their version. Results are verified automatically.
              </div>
            </details>
          </div>
        </div>
      </section>

      <hr className="divider" />

      {/* FINAL CTA */}
      <section className="final-cta reveal">
        <div className="container">
          <h2>
            The best operators are waiting.
            <br />
            Give them something to beat.
          </h2>
          <p>Free to post. Free to enter. You only pay if someone wins.</p>
          <div className="btn-group">
            <div className="cta-path">
              <a href="#get-started" className="btn-primary">
                Post a Challenge
              </a>
              <span className="cta-micro">For brands &amp; founders</span>
            </div>
            <div className="cta-path">
              <a href="#get-started" className="btn-secondary">
                Enter a Challenge
              </a>
              <span className="cta-micro">For operators &amp; builders</span>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-inner">
          <div className="footer-left">Beat My Funnel</div>
          <div className="footer-center">
            The performance marketplace for the next wave of work.
          </div>
          <div className="footer-right">Escrow powered by Stripe</div>
        </div>
      </footer>
    </>
  );
}
