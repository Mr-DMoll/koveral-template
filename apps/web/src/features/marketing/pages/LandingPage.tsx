"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Project {
  name:     string;
  category: string;
  desc:     string;
  tag:      string;
  color:    string;
}

interface Service {
  icon:  string;
  title: string;
  desc:  string;
}

// ─── DATA ─────────────────────────────────────────────────────────────────────
const SERVICES: Service[] = [
  { icon: "◈", title: "Web Applications",    desc: "Full-stack platforms and portals built to scale. From SaaS products to internal tools." },
  { icon: "◉", title: "Mobile Solutions",    desc: "Cross-platform mobile apps that work in low-bandwidth environments, built for real users." },
  { icon: "⬡", title: "Community Systems",   desc: "Technology that serves communities — fund management, transparency tools, social infrastructure." },
  { icon: "◎", title: "Automation & AI",     desc: "Intelligent workflows that eliminate manual processes and let your team focus on what matters." },
];

const PROJECTS: Project[] = [
  { name: "Fhata",    category: "Community Tech", desc: "School sports league funding platform. Alumni give monthly, funds go directly to service providers — no corruption, full transparency.", tag: "Live",        color: "#84cc16" },
  { name: "O-Bit",    category: "Agency Tech",    desc: "A complete agency operating system. Project lifecycle, AI document generation, client portals, and automated invoicing.", tag: "In Use",      color: "#3b82f6" },
  { name: "Client Project", category: "Web App", desc: "We take on client projects that align with our values — building software that works for people, not against them.", tag: "Open",        color: "#a855f7" },
];

const PROCESS = [
  { step: "01", title: "Intake",    desc: "Submit your project brief. We review within 24 hours." },
  { step: "02", title: "Scope",     desc: "We generate a detailed scope, timeline, and budget." },
  { step: "03", title: "Build",     desc: "Your dedicated team delivers milestone by milestone." },
  { step: "04", title: "Launch",    desc: "Live site, handover docs, and ongoing support." },
];

// ─── COMPONENTS ───────────────────────────────────────────────────────────────



// ─── HERO ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section style={{
      minHeight: "100vh", position: "relative",
      display: "flex", alignItems: "center",
      padding: "120px 40px 80px",
      overflow: "hidden",
    }}>
      {/* Background glow */}
      <div style={{
        position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)",
        width: "600px", height: "600px", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(132,204,22,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Grid lines */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
        backgroundSize: "80px 80px",
      }} />

      <div style={{ maxWidth: "1100px", margin: "0 auto", width: "100%", position: "relative", zIndex: 1 }}>
        {/* Eyebrow */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: "8px",
          padding: "6px 14px",
          background: "rgba(132,204,22,0.08)",
          border: "1px solid rgba(132,204,22,0.2)",
          borderRadius: "999px", marginBottom: "32px",
        }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#84cc16", animation: "pulse 2s infinite" }} />
          <span style={{ fontSize: "12px", fontWeight: 600, color: "#84cc16", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Technology for communities
          </span>
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: "clamp(48px, 7vw, 88px)",
          fontWeight: 900, lineHeight: 1.0,
          color: "#fff", letterSpacing: "-0.03em",
          marginBottom: "28px",
          fontFamily: "'Georgia', serif",
        }}>
          No one<br />
          <span style={{ color: "#84cc16", fontStyle: "italic" }}>left behind.</span>
        </h1>

        {/* Sub */}
        <p style={{
          fontSize: "clamp(16px, 2vw, 20px)",
          color: "rgba(255,255,255,0.5)",
          maxWidth: "520px", lineHeight: 1.7,
          marginBottom: "48px",
          fontWeight: 400,
        }}>
          Koveral builds technology that transforms communities and delivers software that works. We take on projects that matter — and we build our own.
        </p>

        {/* CTAs */}
        <div style={{ display: "flex", gap: "14px", flexWrap: "wrap" }}>
          <Link href="/intake" style={{
            padding: "14px 32px",
            background: "#84cc16", borderRadius: "10px",
            fontSize: "15px", fontWeight: 700, color: "#0a0f1a",
            textDecoration: "none", transition: "transform 0.15s, opacity 0.15s",
            display: "inline-block",
          }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
          >
            Start a project →
          </Link>
          <a href="#work" style={{
            padding: "14px 32px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "10px", fontSize: "15px", fontWeight: 600,
            color: "rgba(255,255,255,0.7)", textDecoration: "none",
            transition: "border-color 0.15s",
            display: "inline-block",
          }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.3)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
          >
            See our work
          </a>
        </div>

        {/* Stats */}
        <div style={{
          display: "flex", gap: "48px", marginTop: "80px",
          borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "40px",
          flexWrap: "wrap",
        }}>
          {[
            { value: "2",        label: "Products built"       },
            { value: "∞",        label: "Communities served"   },
            { value: "100%",     label: "Transparent delivery" },
            { value: "0-Bit",    label: "Powered by"           },
          ].map(({ value, label }) => (
            <div key={label}>
              <p style={{ fontSize: "32px", fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</p>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", marginTop: "4px" }}>{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── WORK ─────────────────────────────────────────────────────────────────────
function Work() {
  return (
    <section id="work" style={{ padding: "100px 40px", position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        {/* Section label */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "60px" }}>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#84cc16", textTransform: "uppercase", letterSpacing: "0.1em" }}>Our Work</span>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
        </div>

        <h2 style={{ fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", marginBottom: "16px", fontFamily: "'Georgia', serif" }}>
          Building things<br />that <span style={{ color: "#84cc16", fontStyle: "italic" }}>actually matter.</span>
        </h2>
        <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.4)", marginBottom: "60px", maxWidth: "480px", lineHeight: 1.7 }}>
          From community platforms to client software — every product we build solves a real problem for real people.
        </p>

        {/* Project cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
          {PROJECTS.map((p) => (
            <div
              key={p.name}
              style={{
                padding: "32px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: "16px",
                transition: "border-color 0.2s, transform 0.2s",
                cursor: "default",
                position: "relative", overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = `${p.color}40`;
                (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)";
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
              }}
            >
              {/* Glow */}
              <div style={{ position: "absolute", top: 0, right: 0, width: "120px", height: "120px", background: `radial-gradient(circle, ${p.color}15 0%, transparent 70%)`, pointerEvents: "none" }} />

              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "20px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{p.category}</span>
                <span style={{
                  fontSize: "10px", fontWeight: 700, padding: "3px 10px",
                  borderRadius: "999px", background: `${p.color}15`,
                  color: p.color, border: `1px solid ${p.color}30`,
                  textTransform: "uppercase", letterSpacing: "0.06em",
                }}>
                  {p.tag}
                </span>
              </div>

              <h3 style={{ fontSize: "28px", fontWeight: 900, color: "#fff", marginBottom: "12px", letterSpacing: "-0.02em", fontFamily: "'Georgia', serif" }}>{p.name}</h3>
              <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── SERVICES ─────────────────────────────────────────────────────────────────
function Services() {
  return (
    <section id="services" style={{ padding: "100px 40px", position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "60px" }}>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#84cc16", textTransform: "uppercase", letterSpacing: "0.1em" }}>Services</span>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "60px", alignItems: "start" }}>
          <div>
            <h2 style={{ fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.1, fontFamily: "'Georgia', serif" }}>
              We build.<br />
              <span style={{ color: "rgba(255,255,255,0.3)" }}>You grow.</span>
            </h2>
            <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.4)", marginTop: "20px", lineHeight: 1.7, maxWidth: "400px" }}>
              Whether you need a web app, a mobile solution, or a custom community platform — we have the team and the process to deliver it right.
            </p>
            <Link href="/intake" style={{
              display: "inline-block", marginTop: "32px",
              padding: "12px 24px", background: "rgba(132,204,22,0.1)",
              border: "1px solid rgba(132,204,22,0.3)",
              borderRadius: "8px", fontSize: "14px", fontWeight: 600,
              color: "#84cc16", textDecoration: "none",
            }}>
              Start a conversation →
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
            {SERVICES.map((s, i) => (
              <div
                key={s.title}
                style={{
                  padding: "24px",
                  borderRadius: "12px",
                  transition: "background 0.2s",
                  cursor: "default",
                }}
                onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"}
                onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = "transparent"}
              >
                <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "20px", color: "#84cc16", flexShrink: 0, marginTop: "2px" }}>{s.icon}</span>
                  <div>
                    <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#fff", marginBottom: "6px" }}>{s.title}</h3>
                    <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>{s.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── PROCESS ──────────────────────────────────────────────────────────────────
function Process() {
  return (
    <section id="process" style={{ padding: "100px 40px", position: "relative", zIndex: 1 }}>
      {/* Background strip */}
      <div style={{
        position: "absolute", inset: 0,
        background: "rgba(132,204,22,0.02)",
        borderTop: "1px solid rgba(255,255,255,0.04)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }} />

      <div style={{ maxWidth: "1100px", margin: "0 auto", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "60px" }}>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#84cc16", textTransform: "uppercase", letterSpacing: "0.1em" }}>Process</span>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
        </div>

        <h2 style={{ fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", marginBottom: "16px", fontFamily: "'Georgia', serif" }}>
          How we deliver.
        </h2>
        <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.4)", marginBottom: "60px", lineHeight: 1.7, maxWidth: "480px" }}>
          Every project runs on O-Bit — our own operating system. You get a client portal, real-time progress tracking, and transparent invoicing. No surprises.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "2px" }}>
          {PROCESS.map((p, i) => (
            <div key={p.step} style={{
              padding: "32px 24px",
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.05)",
              borderRadius: "12px",
              position: "relative",
            }}>
              {/* Connector */}
              {i < PROCESS.length - 1 && (
                <div style={{
                  position: "absolute", right: "-13px", top: "50%", transform: "translateY(-50%)",
                  width: "24px", height: "1px", background: "rgba(132,204,22,0.3)",
                  zIndex: 2,
                }} />
              )}
              <p style={{ fontSize: "11px", fontWeight: 700, color: "#84cc16", marginBottom: "16px", letterSpacing: "0.08em" }}>{p.step}</p>
              <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#fff", marginBottom: "10px", letterSpacing: "-0.02em" }}>{p.title}</h3>
              <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>{p.desc}</p>
            </div>
          ))}
        </div>

        {/* Portal callout */}
        <div style={{
          marginTop: "40px", padding: "28px 32px",
          background: "rgba(132,204,22,0.06)",
          border: "1px solid rgba(132,204,22,0.15)",
          borderRadius: "12px",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "24px",
          flexWrap: "wrap",
        }}>
          <div>
            <p style={{ fontSize: "15px", fontWeight: 700, color: "#fff", marginBottom: "4px" }}>
              Your dedicated client portal
            </p>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>
              Track progress, review documents, approve milestones, and pay invoices — all in one place.
            </p>
          </div>
          <Link href="/login" style={{
            padding: "10px 22px", background: "#84cc16", borderRadius: "8px",
            fontSize: "13px", fontWeight: 700, color: "#0a0f1a", textDecoration: "none",
            whiteSpace: "nowrap",
          }}>
            Access portal
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── ABOUT ────────────────────────────────────────────────────────────────────
function About() {
  return (
    <section id="about" style={{ padding: "100px 40px", position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "60px" }}>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#84cc16", textTransform: "uppercase", letterSpacing: "0.1em" }}>About</span>
          <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "80px", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: "24px", fontFamily: "'Georgia', serif" }}>
              Cover all.<br />
              <span style={{ color: "#84cc16", fontStyle: "italic" }}>Koveral.</span>
            </h2>
            <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.5)", lineHeight: 1.8, marginBottom: "20px" }}>
              The name says it all. Koveral was founded on a simple belief: technology should leave no one behind. We build software for communities who need it most, and we take on client projects to fund that mission.
            </p>
            <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.5)", lineHeight: 1.8 }}>
              Our first product, Fhata, helps schools raise funds for sports leagues — keeping learners off the streets and connected to their communities. Every rand that flows through Fhata goes directly to service providers. Zero corruption. Full transparency.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {[
              { label: "Mission",    value: "Technology that transforms lives, not just workflows." },
              { label: "Approach",   value: "We build our own products and take client projects. Both fund the same mission." },
              { label: "Delivery",   value: "Every client project runs on O-Bit — transparent, milestone-based, no surprises." },
              { label: "Community",  value: "Fhata is our first community product. More are coming." },
            ].map(({ label, value }) => (
              <div key={label} style={{
                padding: "20px 24px",
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: "10px",
              }}>
                <p style={{ fontSize: "11px", fontWeight: 700, color: "#84cc16", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>{label}</p>
                <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────
function CTA() {
  return (
    <section style={{ padding: "80px 40px", position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: "800px", margin: "0 auto", textAlign: "center" }}>
        <div style={{
          padding: "64px 48px",
          background: "rgba(132,204,22,0.05)",
          border: "1px solid rgba(132,204,22,0.15)",
          borderRadius: "24px",
          position: "relative", overflow: "hidden",
        }}>
          {/* Glow */}
          <div style={{ position: "absolute", top: "-50%", left: "50%", transform: "translateX(-50%)", width: "400px", height: "400px", background: "radial-gradient(circle, rgba(132,204,22,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />

          <p style={{ fontSize: "12px", fontWeight: 700, color: "#84cc16", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "20px" }}>
            Ready to build?
          </p>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", marginBottom: "16px", fontFamily: "'Georgia', serif", lineHeight: 1.1 }}>
            Let's create something<br />that matters.
          </h2>
          <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.4)", marginBottom: "36px", lineHeight: 1.7 }}>
            Tell us about your project. We'll respond within 24 hours with a clear scope and timeline.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/intake" style={{
              padding: "14px 36px", background: "#84cc16", borderRadius: "10px",
              fontSize: "15px", fontWeight: 700, color: "#0a0f1a", textDecoration: "none",
              transition: "opacity 0.15s", display: "inline-block",
            }}>
              Start a project →
            </Link>
            <Link href="/login" style={{
              padding: "14px 36px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "10px", fontSize: "15px", fontWeight: 600,
              color: "rgba(255,255,255,0.6)", textDecoration: "none",
              display: "inline-block",
            }}>
              Client portal
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── FOOTER ───────────────────────────────────────────────────────────────────

// ─── LANDING PAGE ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div style={{ fontFamily: "'system-ui', sans-serif" }}>
      <Hero />
      <Work />
      <Services />
      <Process />
      <About />
      <CTA />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #080c18; }
        ::-webkit-scrollbar-thumb { background: rgba(132,204,22,0.3); border-radius: 3px; }
      `}</style>
    </div>
  );
}
