import { ImageResponse } from 'next/og'

// No `runtime = 'edge'`: OpenNext cannot bundle edge-runtime routes into the
// main Worker, and next/og works fine on the default runtime here — icon.tsx
// and apple-icon.tsx have always rendered this way.
export const alt = 'Social Media Scheduler — AI-powered auto posting for Instagram, Facebook and Pinterest'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OpengraphImage() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    padding: '80px',
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
                    fontFamily: 'sans-serif',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        marginBottom: '40px',
                    }}
                >
                    <div
                        style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '16px',
                            background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)',
                        }}
                    />
                    <div style={{ fontSize: 28, color: '#94a3b8', letterSpacing: '0.08em' }}>
                        SOCIAL MEDIA SCHEDULER
                    </div>
                </div>

                <div
                    style={{
                        fontSize: 76,
                        fontWeight: 700,
                        color: '#ffffff',
                        lineHeight: 1.1,
                        letterSpacing: '-0.03em',
                        maxWidth: '900px',
                    }}
                >
                    Upload once. Post everywhere.
                </div>

                <div
                    style={{
                        fontSize: 32,
                        color: '#a5b4fc',
                        marginTop: '28px',
                        maxWidth: '820px',
                        lineHeight: 1.4,
                    }}
                >
                    AI-written captions, hooks and hashtags — scheduled to Instagram, Facebook and Pinterest.
                </div>
            </div>
        ),
        size
    )
}
