import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Database Seed...");

  // Reset database safely
  await prisma.feedback.deleteMany();
  await prisma.statusUpdate.deleteMany();
  await prisma.complaintMedia.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.officer.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.user.deleteMany();

  const salt = await bcrypt.genSalt(10);
  const commonPasswordHash = await bcrypt.hash("password123", salt);

  // 1. Create Admin
  const admin = await prisma.user.create({
    data: {
      name: "Super Administrator (District)",
      phone: "+919999999999",
      email: "admin@smarttrack.gov.in",
      passwordHash: commonPasswordHash,
      role: "ADMIN",
      district: "Chennai",
      aadhaarVerified: true,
    },
  });
  console.log(`👤 Created Admin: ${admin.email}`);

  // 2. Create citizen to own complaints
  const citizen = await prisma.user.create({
    data: {
      name: "Citizen Selvam",
      phone: "+917777777777",
      email: "selvam@citizen.tn.gov.in",
      passwordHash: commonPasswordHash,
      role: "CITIZEN",
      ward: "Ward A",
      district: "Chennai",
      aadhaarVerified: true,
    },
  });
  console.log(`👤 Created Citizen: ${citizen.name}`);

  // 3. Create 3 Officers (User account + Officer profile)
  // Officer 1: TANGEDCO Electricity
  const officerUser1 = await prisma.user.create({
    data: {
      name: "Officer Anbarasan",
      phone: "+918888888881",
      email: "anbarasan@tneb.tn.gov.in",
      passwordHash: commonPasswordHash,
      role: "OFFICER",
      ward: "Ward A",
      district: "Chennai",
      aadhaarVerified: true,
    },
  });
  const officerProfile1 = await prisma.officer.create({
    data: {
      userId: officerUser1.id,
      department: "TANGEDCO (Tamil Nadu Electricity Board)",
      ward: "Ward A",
      district: "Chennai",
      activeAssignments: 1,
      resolvedCount: 0,
    },
  });

  // Officer 2: TWAD Water
  const officerUser2 = await prisma.user.create({
    data: {
      name: "Officer Deepa",
      phone: "+918888888882",
      email: "deepa@twad.tn.gov.in",
      passwordHash: commonPasswordHash,
      role: "OFFICER",
      ward: "Ward B",
      district: "Coimbatore",
      aadhaarVerified: true,
    },
  });
  const officerProfile2 = await prisma.officer.create({
    data: {
      userId: officerUser2.id,
      department: "TWAD (Tamil Nadu Water Supply and Drainage) Board",
      ward: "Ward B",
      district: "Coimbatore",
      activeAssignments: 1,
      resolvedCount: 0,
    },
  });

  // Officer 3: Highways Road
  const officerUser3 = await prisma.user.create({
    data: {
      name: "Officer Chandra",
      phone: "+918888888883",
      email: "chandra@highways.tn.gov.in",
      passwordHash: commonPasswordHash,
      role: "OFFICER",
      ward: "Ward C",
      district: "Madurai",
      aadhaarVerified: true,
    },
  });
  const officerProfile3 = await prisma.officer.create({
    data: {
      userId: officerUser3.id,
      department: "Highways Department of Tamil Nadu",
      ward: "Ward C",
      district: "Madurai",
      activeAssignments: 1,
      resolvedCount: 0,
    },
  });

  console.log(`👮 Created 3 Officers (Anbarasan, Deepa, Chandra)`);

  // 4. Create 5 complaints
  // Complaint 1: Electricity danglers in Chennai (Assigned to Officer Anbarasan)
  const complaint1 = await prisma.complaint.create({
    data: {
      trackingId: "TN-12345",
      title: "Overhead electricity wires dangling low on Kamarajar Street",
      description: "The main distribution wires have sagged dangerously low over the pedestrian walkway near Madipakkam public park. Under heavy wind, sparking is observed, creating high fire risk.",
      category: "ELECTRICITY",
      subcategory: "POWER_LINE_DANGER",
      priority: "CRITICAL",
      status: "ASSIGNED",
      department: "TANGEDCO (Tamil Nadu Electricity Board)",
      latitude: 12.9634,
      longitude: 80.1912,
      address: "24 Kamarajar Street, Madipakkam, Chennai",
      ward: "Ward A",
      district: "Chennai",
      citizenId: citizen.id,
      assignedOfficerId: officerUser1.id,
    },
  });

  // Complaint 2: Water pipe burst in Coimbatore (Assigned to Officer Deepa)
  const complaint2 = await prisma.complaint.create({
    data: {
      trackingId: "TN-54321",
      title: "Major drinking water distribution pipe burst",
      description: "A primary potable water pipe has split open near Vadapalani junction. Hundreds of gallons of clean drinking water are leaking into the roads, causing erosion and flooding roads.",
      category: "WATER",
      subcategory: "BROKEN_PIPELINE",
      priority: "HIGH",
      status: "IN_PROGRESS",
      department: "TWAD (Tamil Nadu Water Supply and Drainage) Board",
      latitude: 11.0168,
      longitude: 76.9558,
      address: "Main crossroads, Saibaba Colony, Coimbatore",
      ward: "Ward B",
      district: "Coimbatore",
      citizenId: citizen.id,
      assignedOfficerId: officerUser2.id,
    },
  });

  // Complaint 3: Potholes in Madurai (Assigned to Officer Chandra)
  const complaint3 = await prisma.complaint.create({
    data: {
      trackingId: "TN-11111",
      title: "Dangerous crater potholes along Mount Road stretch",
      description: "There are multiple deep potholes along Mount Road, resulting in heavy commute jams and minor two-wheeler fall incidents. Immediate tar patching/repaving is requested.",
      category: "ROADS",
      subcategory: "POTHOLE",
      priority: "MEDIUM",
      status: "OPEN",
      department: "Highways Department of Tamil Nadu",
      latitude: 9.9252,
      longitude: 78.1198,
      address: "Annai Teresa road intersection, Madurai",
      ward: "Ward C",
      district: "Madurai",
      citizenId: citizen.id,
      assignedOfficerId: officerUser3.id,
    },
  });

  // Complaint 4: SBM Sanitation Chennai (No assigned officer yet, Resolved)
  const complaint4 = await prisma.complaint.create({
    data: {
      trackingId: "TN-22222",
      title: "Overflowing municipal waste bins causing foul smell",
      description: "Garbage bins near city park are completely full for the past 4 days. Stray animals are scattering domestic trash across the lanes, inviting flies and strong bad smell.",
      category: "HEALTH",
      subcategory: "GARBAGE_COLLECTION",
      priority: "MEDIUM",
      status: "RESOLVED",
      department: "Tamil Nadu SBM / Sanitary Commission",
      latitude: 13.0401,
      longitude: 80.2421,
      address: "South Usman Road, T-Nagar, Chennai",
      ward: "Ward A",
      district: "Chennai",
      citizenId: citizen.id,
      resolvedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Resolved 1 day ago
    },
  });

  // Complaint 5: Telecom/Other issue (Open, unassigned)
  const complaint5 = await prisma.complaint.create({
    data: {
      trackingId: "TN-33333",
      title: "Exposed layout internet cables across telephone posts",
      description: "Private fiber-optic cables have fallen from overhead poles and are laying tangled across public roads, posing cycling and pedestrian trippage risks.",
      category: "ELECTRICITY",
      subcategory: "POWER_LINE_DANGER",
      priority: "LOW",
      status: "OPEN",
      department: "Tamil Nadu Civic Support Department",
      latitude: 13.0827,
      longitude: 80.2707,
      address: "Royapettah, Chennai",
      ward: "Ward A",
      district: "Chennai",
      citizenId: citizen.id,
    },
  });

  console.log("📝 Seeded 5 Civic Complaints.");

  // 5. Load standard status timeline logs for each
  await prisma.statusUpdate.createMany({
    data: [
      {
        complaintId: complaint1.id,
        status: "OPEN",
        note: "Complaint submitted online by citizen. Scheduled for background routing.",
        updatedById: citizen.id,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        complaintId: complaint1.id,
        status: "ASSIGNED",
        note: "Auto-routed to electricity operations line based on location and TANGEDCO query.",
        updatedById: officerUser1.id,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        complaintId: complaint2.id,
        status: "OPEN",
        note: "Complaint submitted online by citizen.",
        updatedById: citizen.id,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        complaintId: complaint2.id,
        status: "ASSIGNED",
        note: "Assigned automatically based on high-severity leakage detection.",
        updatedById: officerUser2.id,
        createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000),
      },
      {
        complaintId: complaint2.id,
        status: "IN_PROGRESS",
        note: "Excavation crew deployed to Vadapalani junctions with welding gear to clamp pipe split.",
        updatedById: officerUser2.id,
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
      },
      {
        complaintId: complaint3.id,
        status: "OPEN",
        note: "Submitted by citizen. Awaiting Highways dispatch schedule.",
        updatedById: citizen.id,
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
      },
      {
        complaintId: complaint4.id,
        status: "OPEN",
        note: "Submitted by resident.",
        updatedById: citizen.id,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        complaintId: complaint4.id,
        status: "RESOLVED",
        note: "Clearance logistics trucks dispatched; bins cleared entirely and washed down with bleach.",
        updatedById: admin.id,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
      {
        complaintId: complaint5.id,
        status: "OPEN",
        note: "Registered. Awaiting categorization review.",
        updatedById: citizen.id,
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      },
    ],
  });

  // 6. Create standard sample notifications
  await prisma.notification.createMany({
    data: [
      {
        userId: citizen.id,
        type: "STATUS_UPDATE",
        title: "Garbage Complaint Resolved",
        message: "Great news! Your complaint #TN-22222 on Usman road was marked as RESOLVED.",
        complaintId: complaint4.id,
        read: false,
      },
      {
        userId: officerUser1.id,
        type: "ASSIGNMENT",
        title: "Danger Electrics dangling",
        message: "Urgent case #TN-12345 in Ward A of Chennai assigned to you for inspection.",
        complaintId: complaint1.id,
        read: false,
      },
    ],
  });

  console.log("🟢 Database Seeding Completed Successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding terminated with errors:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
