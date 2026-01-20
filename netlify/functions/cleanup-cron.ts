import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  console.log("Running cleanup-cron at:", new Date().toISOString());

  try {
    // Delete expired batches - cascades to groups and images
    const expiredBatches = await prisma.batch.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    console.log(`Deleted ${expiredBatches.count} expired batches`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Cleanup completed",
        deletedBatches: expiredBatches.count,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error("Cleanup error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Cleanup failed" }),
    };
  } finally {
    await prisma.$disconnect();
  }
};

export { handler };
