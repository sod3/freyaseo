import Link from "next/link";
import { Award } from "lucide-react";
import { certificates } from "@/src/content/certificates";

export function CertificatesPreview({ href, label }: { href: string; label: string }) {
  return (
    <div className="certificate-preview-grid">
      {certificates.slice(0, 4).map((certificate) => (
        <div className="mini-certificate" key={certificate.title}>
          <Award className="h-6 w-6 text-[var(--primary)]" aria-hidden />
          <strong>{certificate.title}</strong>
          <span>{certificate.issuer}</span>
        </div>
      ))}
      <Link className="preview-link" href={href}>
        {label}
      </Link>
    </div>
  );
}
