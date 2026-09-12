import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { createClient } from '@/lib/supabase/server'

/**
 * Header and footer around the legal pages — terms, privacy, data deletion.
 *
 * They had neither, so following "Privacy" out of the footer dropped people on
 * a bare page with no way back into the site except the browser's back button.
 * Meta reads these pages during App Review, and a legal page that looks
 * detached from the product it belongs to is a reason to ask questions.
 *
 * Header needs the signed-in user so it can show the right call to action;
 * these pages are public, so it is read here rather than assumed to be null.
 */
export default async function LegalPageChrome({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    return (
        <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950">
            <Header user={user} />
            <main className="flex-1">{children}</main>
            <Footer />
        </div>
    )
}
