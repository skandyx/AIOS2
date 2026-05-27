import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/projects/[id]/github/push - Push project files to GitHub
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const project = await db.project.findUnique({ where: { id } })
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (!project.repoOwner || !project.repoName) {
      return NextResponse.json(
        { error: 'No GitHub repository connected' },
        { status: 400 }
      )
    }

    const githubToken = project.githubToken
    if (!githubToken) {
      return NextResponse.json(
        { error: 'GitHub token is required for pushing. Set it via POST /github with githubToken' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const branch = body.branch || project.repoBranch || 'main'
    const commitMessage = body.commitMessage || `AIOS: Update project files - ${new Date().toISOString()}`
    const filePaths = body.filePaths as string[] | undefined // Optional: specific files to push

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      Authorization: `token ${githubToken}`,
    }

    // Get project files to push
    const whereClause: Record<string, unknown> = { projectId: id }
    if (filePaths && filePaths.length > 0) {
      whereClause.path = { in: filePaths }
    }

    const files = await db.projectFile.findMany({ where: whereClause })

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files to push' }, { status: 400 })
    }

    let pushedCount = 0
    let failedCount = 0
    let skippedCount = 0
    const errors: string[] = []

    for (const file of files) {
      try {
        if (!file.content) {
          skippedCount++
          continue
        }

        // Check if file already exists on GitHub (to get its SHA for update)
        const checkResponse = await fetch(
          `https://api.github.com/repos/${project.repoOwner}/${project.repoName}/contents/${file.path}?ref=${branch}`,
          { headers }
        )

        const contentBase64 = Buffer.from(file.content).toString('base64')

        const payload: Record<string, unknown> = {
          message: `${commitMessage} - ${file.path}`,
          content: contentBase64,
          branch,
        }

        if (checkResponse.ok) {
          const existingFile = await checkResponse.json()
          payload.sha = existingFile.sha // Required for updating existing files
        }

        const pushResponse = await fetch(
          `https://api.github.com/repos/${project.repoOwner}/${project.repoName}/contents/${file.path}`,
          {
            method: 'PUT',
            headers,
            body: JSON.stringify(payload),
          }
        )

        if (pushResponse.ok) {
          pushedCount++
        } else {
          const errorText = await pushResponse.text()
          errors.push(`${file.path}: ${pushResponse.status} - ${errorText}`)
          failedCount++
        }
      } catch (fileError) {
        const errorMsg = fileError instanceof Error ? fileError.message : 'Unknown error'
        errors.push(`${file.path}: ${errorMsg}`)
        failedCount++
      }
    }

    return NextResponse.json({
      success: failedCount === 0,
      pushedCount,
      failedCount,
      skippedCount,
      totalFiles: files.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `Pushed ${pushedCount} files to GitHub${failedCount > 0 ? ` (${failedCount} failed)` : ''}${skippedCount > 0 ? ` (${skippedCount} skipped - no content)` : ''}`,
    })
  } catch (error) {
    console.error('GitHub push error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to push to GitHub' },
      { status: 500 }
    )
  }
}
