import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
    return new ImageResponse(
        (
            <div
                style={{
                    fontSize: 100,
                    background: 'linear-gradient(135deg, #5932EA, #7C5FF5)',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    borderRadius: 40,
                    fontWeight: 900,
                    fontFamily: 'sans-serif',
                }}
            >
                S
            </div>
        ),
        { ...size }
    )
}
