"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { colors } from "./designSystem";
import { MdChevronRight, MdHome } from "react-icons/md";

interface BreadcrumbItem {
    label: string;
    path: string;
}

interface BreadcrumbProps {
    items?: BreadcrumbItem[];
    showHome?: boolean;
}

export default function Breadcrumb({ items, showHome = true }: BreadcrumbProps) {
    const pathname = usePathname();

    // Auto-generate breadcrumb from pathname if items not provided
    const breadcrumbItems: BreadcrumbItem[] = items || (() => {
        const paths = pathname.split("/").filter(Boolean);
        const result: BreadcrumbItem[] = [];
        
        paths.forEach((path, index) => {
            const fullPath = "/" + paths.slice(0, index + 1).join("/");
            const label = path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, " ");
            result.push({ label, path: fullPath });
        });
        
        return result;
    })();

    if (breadcrumbItems.length === 0) return null;

    return (
        <nav
            style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "16px",
                fontSize: "14px",
            }}
            aria-label="Breadcrumb"
        >
            {showHome && (
                <>
                    <Link
                        href="/"
                        style={{
                            color: colors.secondaryText,
                            textDecoration: "none",
                            display: "flex",
                            alignItems: "center",
                            transition: "color 0.2s",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.color = colors.primary;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.color = colors.secondaryText;
                        }}
                    >
                        <MdHome size={18} />
                    </Link>
                    {breadcrumbItems.length > 0 && (
                        <MdChevronRight size={18} color={colors.secondaryText} />
                    )}
                </>
            )}
            {breadcrumbItems.map((item, index) => {
                const isLast = index === breadcrumbItems.length - 1;
                
                return (
                    <div key={item.path} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {isLast ? (
                            <span style={{ color: colors.primary, fontWeight: "600" }}>
                                {item.label}
                            </span>
                        ) : (
                            <>
                                <Link
                                    href={item.path}
                                    style={{
                                        color: colors.secondaryText,
                                        textDecoration: "none",
                                        transition: "color 0.2s",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.color = colors.primary;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.color = colors.secondaryText;
                                    }}
                                >
                                    {item.label}
                                </Link>
                                <MdChevronRight size={18} color={colors.secondaryText} />
                            </>
                        )}
                    </div>
                );
            })}
        </nav>
    );
}

