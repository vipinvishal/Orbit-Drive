import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Orbit Drive",
  description: "How Orbit Drive collects, uses, and protects your data.",
};

const LAST_UPDATED = "August 24, 2026";

export default function PrivacyPage() {
  return (
    <div className="page stack" style={{ gap: 28, maxWidth: 760 }}>
      <div>
        <h1 style={{ fontSize: 30 }}>Privacy Policy</h1>
        <p className="muted mono" style={{ fontSize: 12.5, marginTop: 6 }}>
          Last updated {LAST_UPDATED}
        </p>
      </div>

      <Section title="Overview">
        <p>
          Orbit Drive pools multiple Google Drive accounts you own into a single, unified drive. This
          policy explains what data we collect when you use Orbit Drive, why we collect it, and how it&rsquo;s
          protected — in particular, exactly what access we request from your Google account and what we
          do (and don&rsquo;t) do with it.
        </p>
      </Section>

      <Section title="What we access in your Google account">
        <p>
          When you connect a Google account, Orbit Drive requests the{" "}
          <code className="mono" style={{ fontSize: 13 }}>drive.file</code> scope only — Google&rsquo;s narrowest
          Drive permission. This scope only grants access to files that Orbit Drive itself creates or that
          you explicitly open with Orbit Drive.
        </p>
        <ul style={{ margin: "10px 0 0", paddingLeft: 20, lineHeight: 1.8 }}>
          <li>
            We <strong>cannot</strong> see, list, or read the rest of your Google Drive — files you didn&rsquo;t
            upload through Orbit Drive are invisible to us.
          </li>
          <li>
            We use this access to upload files you send through Orbit Drive, list and download files you&rsquo;ve
            already uploaded, and delete files when you explicitly delete them (including, if you choose,
            deleting them from Google Drive itself, not just from Orbit Drive&rsquo;s records).
          </li>
          <li>We also read your Google account email address and Drive storage quota, to identify your account and show how much space is used.</li>
        </ul>
      </Section>

      <Section title="What we store">
        <p>When you use Orbit Drive, we store:</p>
        <ul style={{ margin: "10px 0 0", paddingLeft: 20, lineHeight: 1.8 }}>
          <li>Your email address, used to identify your Orbit Drive account.</li>
          <li>
            OAuth tokens for each connected Google account — these let Orbit Drive act on your behalf
            without storing your Google password, and are never stored or transmitted in plain text. On
            the web, tokens are <strong>encrypted at rest</strong> on our servers. On the Android app,
            tokens never leave your device at all — they&rsquo;re encrypted locally using Android&rsquo;s own
            Keystore, and our servers never see them.
          </li>
          <li>
            File metadata — filename, size, file type, a content checksum used to avoid storing duplicate
            copies, and the folder it lives in within Orbit Drive&rsquo;s virtual filesystem.
          </li>
        </ul>
        <p style={{ marginTop: 10 }}>
          We do <strong>not</strong> keep a separate copy of your file contents — the files themselves stay
          in Google Drive. Orbit Drive stores metadata and routes each upload to the right connected
          account; Google Drive remains the source of truth for the actual file data.
        </p>
      </Section>

      <Section title="What we never do">
        <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
          <li>We never sell your data or share it with third parties for advertising or marketing.</li>
          <li>We never access files you didn&rsquo;t upload through Orbit Drive.</li>
          <li>
            We never use your data to train AI or machine learning models.
          </li>
        </ul>
      </Section>

      <Section title="Deleting your data" id="deleting-your-data">
        <p>
          Disconnecting a Google account removes its stored OAuth tokens immediately. You can choose
          whether disconnecting also deletes the files that account was holding from Google Drive itself,
          or just from Orbit Drive&rsquo;s records while leaving the files untouched in Drive. Deleting a file or
          folder in Orbit Drive removes its metadata from our database; if you choose to also delete it from
          Google Drive, that deletion happens immediately and cannot be undone.
        </p>
        <p style={{ marginTop: 10 }}>
          To request deletion of your entire Orbit Drive account and all associated data, contact us at the
          email below.
        </p>
      </Section>

      <Section title="Security">
        <p>
          All traffic between your browser and Orbit Drive is encrypted (HTTPS). Google account sessions
          use OAuth 2.0 with PKCE. On the web, OAuth tokens are encrypted at rest on our servers; on the
          Android app, tokens are encrypted on-device using Android&rsquo;s Keystore and never reach our
          servers at all. Orbit Drive sessions use signed, expiring tokens rather than storing your
          password.
        </p>
      </Section>

      <Section title="Children's privacy">
        <p>Orbit Drive is not directed at children under 13, and we do not knowingly collect data from them.</p>
      </Section>

      <Section title="Changes to this policy">
        <p>
          If this policy changes, we&rsquo;ll update the date at the top of this page. Continued use of Orbit
          Drive after a change means you accept the updated policy.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          Questions about this policy, or requests to delete your data, can be sent to{" "}
          <a href="mailto:support@orbitdrive.space">support@orbitdrive.space</a>.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id}>
      <h2 style={{ fontSize: 17, fontFamily: "var(--font-body)", fontWeight: 700 }}>{title}</h2>
      <div className="muted" style={{ marginTop: 8, fontSize: 14.5, lineHeight: 1.7 }}>
        {children}
      </div>
    </section>
  );
}
