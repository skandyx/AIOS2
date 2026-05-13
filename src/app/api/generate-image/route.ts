import { NextRequest, NextResponse } from 'next/server'

const SUPPORTED_SIZES = [
  '1024x1024',
  '768x1344',
  '864x1152',
  '1344x768',
  '1152x864',
  '1440x720',
  '720x1440',
]

// POST /api/generate-image - Generate image from prompt
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt, size } = body

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    const imageSize = size || '1024x1024'
    if (!SUPPORTED_SIZES.includes(imageSize)) {
      return NextResponse.json(
        { error: `Unsupported size: ${imageSize}. Supported sizes: ${SUPPORTED_SIZES.join(', ')}` },
        { status: 400 }
      )
    }

    // Call image generation via z-ai-web-dev-sdk
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()

    const response = await zai.images.generations.create({
      prompt,
      size: imageSize,
    })

    const imageBase64 = response.data[0]?.base64

    if (!imageBase64) {
      return NextResponse.json(
        { error: 'Failed to generate image' },
        { status: 500 }
      )
    }

    return NextResponse.json({ imageBase64 })
  } catch (error) {
    console.error('Image generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    )
  }
}
