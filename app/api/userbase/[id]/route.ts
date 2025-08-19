import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import db from '@/db/drizzle'
import { userbase } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = getAuth(req)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    const { name, phone } = await req.json()

    await db
      .update(userbase)
      .set({ aaname: name, phone })
      .where(eq(userbase.id, Number(id)))

    return NextResponse.json({ message: 'User updated successfully' })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { userId } = getAuth(req)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    await db
      .delete(userbase)
      .where(eq(userbase.id, Number(id)))

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}