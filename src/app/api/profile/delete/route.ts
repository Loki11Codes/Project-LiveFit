import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { unauthorized, internalError } from "@/lib/api";
import { NextResponse } from "next/server";

/**
 * DELETE /api/profile/delete
 *
 * Permanently deletes the authenticated user's account and all associated data.
 * All related records (food logs, workouts, sleep logs, measurements, goals,
 * profiles, chat messages, knowledge entries, meal plans, achievements, routines,
 * personal records, day-type entries, sessions, and accounts) are cascade-deleted
 * via the Prisma schema's onDelete: Cascade constraints.
 *
 * GDPR Article 17 / DPDP Act Section 12(3) — Right to Erasure.
 */
export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorized();
    }

    const userId = session.user.id;

    // Verify the user actually exists before deleting
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Delete the user — all related records cascade-delete via schema constraints
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({
      message: "Account and all associated data have been permanently deleted.",
    });
  } catch (error) {
    console.error("Account deletion error:", error);
    return internalError("Failed to delete account. Please try again or contact support.");
  }
}
