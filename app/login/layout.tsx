import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Login",
    description: "Sign in to your Social Media Scheduler account.",
};

export default function LoginLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
